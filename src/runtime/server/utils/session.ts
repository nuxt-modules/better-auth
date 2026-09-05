import type { AppSession, AuthSession, RequireSessionOptions } from '#nuxt-better-auth'
import { matchesUser } from '../../utils/match-user'
import type { ServerEvent } from '../internal/nitro-compat'
import { createAuthError, splitCookiesString } from '../internal/nitro-compat'
import { serverAuth } from './auth'

const requestSessionLoadKey = Symbol.for('nuxt-better-auth.requestSessionLoad')
const signingAlgorithm: HmacImportParams = { name: 'HMAC', hash: 'SHA-256' }
const cookiePairSeparatorRE = /;\s*/

interface CookieOptions {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None' | 'strict' | 'lax' | 'none'
  partitioned?: boolean
  prefix?: 'host' | 'secure'
}

interface AuthCookie {
  name: string
  attributes: CookieOptions
}

interface ServerAuthContextLike {
  authCookies: {
    sessionToken: AuthCookie
    sessionData: AuthCookie
    dontRememberToken: AuthCookie
  }
  internalAdapter: {
    createSession?: (userId: string, rememberMe: boolean) => Promise<unknown>
  }
  secret: string
  sessionConfig: {
    expiresIn: number
  }
}

interface RequestSessionContext {
  requestSession?: AppSession | null
  requestHeaders?: Headers
  [requestSessionLoadKey]?: Promise<AppSession | null>
}

interface SessionWithHeaders {
  headers: Headers
  response: AppSession | null
}

const fallbackRequestSessionContext = new WeakMap<object, RequestSessionContext>()

function getRequestSessionContext(event: ServerEvent): RequestSessionContext {
  const eventWithContext = event as ServerEvent & { context?: unknown }
  if (eventWithContext.context && typeof eventWithContext.context === 'object')
    return eventWithContext.context as RequestSessionContext

  let context = fallbackRequestSessionContext.get(event as object)
  if (!context) {
    context = {}
    fallbackRequestSessionContext.set(event as object, context)
  }
  return context
}

function getIncomingRequestHeaders(event: ServerEvent): Headers {
  const requestHeaders = (event as ServerEvent & { req?: { headers?: Headers } }).req?.headers
  return requestHeaders instanceof Headers ? requestHeaders : (event as ServerEvent & { headers: Headers }).headers
}

function getRequestHeaders(event: ServerEvent): Headers {
  return getRequestSessionContext(event).requestHeaders ?? getIncomingRequestHeaders(event)
}

function loadSession(event: ServerEvent): Promise<AppSession | null> {
  const auth = serverAuth(event)
  return auth.api.getSession({ headers: getRequestHeaders(event) }) as Promise<AppSession | null>
}

function loadFreshSession(event: ServerEvent): Promise<SessionWithHeaders> {
  const auth = serverAuth(event)
  return auth.api.getSession({
    headers: getRequestHeaders(event),
    query: { disableCookieCache: true },
    returnHeaders: true,
  }) as unknown as Promise<SessionWithHeaders>
}

function getServerAuthContext(event: ServerEvent): Promise<ServerAuthContextLike> {
  const auth = serverAuth(event) as ReturnType<typeof serverAuth> & { $context: Promise<ServerAuthContextLike> }
  return auth.$context
}

function getCookieName(name: string, prefix?: CookieOptions['prefix']): string | undefined {
  if (prefix === 'secure')
    return name.startsWith('__Secure-') ? name : `__Secure-${name}`

  if (prefix === 'host')
    return name.startsWith('__Host-') ? name : `__Host-${name}`

  if (prefix)
    return undefined

  return name
}

function serializeCookieHeader(name: string, value: string, attributes: CookieOptions = {}, valueIsEncoded = false): string {
  const cookieName = getCookieName(name, attributes.prefix)
  if (!cookieName)
    throw new Error(`Unsupported cookie prefix: ${attributes.prefix}`)

  const cookieValue = valueIsEncoded ? value : encodeURIComponent(value)
  const cookie = [`${cookieName}=${cookieValue}`]
  const options = { ...attributes }

  if (cookieName.startsWith('__Secure-') && !options.secure)
    options.secure = true

  if (cookieName.startsWith('__Host-')) {
    options.secure = true
    options.path = '/'
    delete options.domain
  }

  if (typeof options.maxAge === 'number' && options.maxAge >= 0)
    cookie.push(`Max-Age=${Math.floor(options.maxAge)}`)

  if (options.domain && options.prefix !== 'host')
    cookie.push(`Domain=${options.domain}`)

  if (options.path)
    cookie.push(`Path=${options.path}`)

  if (options.expires)
    cookie.push(`Expires=${options.expires.toUTCString()}`)

  if (options.httpOnly)
    cookie.push('HttpOnly')

  if (options.partitioned)
    options.secure = true

  if (options.secure)
    cookie.push('Secure')

  if (options.sameSite) {
    const normalizedSameSite = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)
    cookie.push(`SameSite=${normalizedSameSite}`)
  }

  if (options.partitioned)
    cookie.push('Partitioned')

  return cookie.join('; ')
}

function serializeCookie(name: string, value: string, attributes: CookieOptions = {}): string {
  return serializeCookieHeader(name, value, attributes)
}

async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    signingAlgorithm,
    false,
    ['sign', 'verify'],
  )
  const signature = await crypto.subtle.sign(
    signingAlgorithm.name,
    key,
    new TextEncoder().encode(value),
  )

  return encodeURIComponent(`${value}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`)
}

async function serializeSignedCookie(name: string, value: string, secret: string, attributes: CookieOptions = {}): Promise<string> {
  return serializeCookieHeader(name, await signCookieValue(value, secret), attributes, true)
}

function appendCookieHeader(event: ServerEvent, header: string): void {
  const nodeResponse = (event as ServerEvent & {
    node?: {
      res?: {
        getHeader?: (name: string) => string | string[] | number | undefined
        setHeader?: (name: string, value: string | string[]) => void
      }
    }
    response?: {
      headers?: Headers
    }
  }).node?.res

  if (nodeResponse?.setHeader) {
    const current = nodeResponse.getHeader?.('set-cookie')
    if (Array.isArray(current))
      nodeResponse.setHeader('set-cookie', [...current, header])
    else if (typeof current === 'string')
      nodeResponse.setHeader('set-cookie', [current, header])
    else
      nodeResponse.setHeader('set-cookie', [header])
    return
  }

  const eventWithResponse = event as ServerEvent & {
    res?: { headers?: Headers }
    response?: { headers?: Headers }
  }
  const responseHeaders = eventWithResponse.res?.headers ?? eventWithResponse.response?.headers
  responseHeaders?.append('set-cookie', header)
}

function getSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie
  const cookies = getSetCookie?.call(headers)
  if (cookies?.length)
    return cookies.flatMap(cookie => splitCookiesString(cookie))

  const header = headers.get('set-cookie')
  return header ? splitCookiesString(header) : []
}

function appendSetCookieHeaders(event: ServerEvent, headers: Headers): void {
  for (const header of getSetCookieHeaders(headers))
    appendCookieHeader(event, header)
}

function parseRequestCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!cookieHeader)
    return cookies

  for (const pair of cookieHeader.split(cookiePairSeparatorRE)) {
    if (!pair)
      continue

    const separatorIndex = pair.indexOf('=')
    if (separatorIndex < 0)
      continue

    cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1))
  }

  return cookies
}

function serializeRequestCookies(cookies: Map<string, string>): string | null {
  if (!cookies.size)
    return null

  return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ')
}

function extractResponseCookieValue(header: string): string {
  const separatorIndex = header.indexOf(';')
  const cookiePair = separatorIndex >= 0 ? header.slice(0, separatorIndex) : header
  return cookiePair.slice(cookiePair.indexOf('=') + 1)
}

function getChunkedCookieNames(event: ServerEvent, cookieName: string): string[] {
  const cookieNames = new Set<string>([cookieName])
  for (const name of parseRequestCookies(getIncomingRequestHeaders(event).get('cookie')).keys()) {
    if (name.startsWith(`${cookieName}.`))
      cookieNames.add(name)
  }
  return Array.from(cookieNames)
}

function expireCookie(event: ServerEvent, cookieName: string, attributes: CookieOptions): void {
  appendCookieHeader(event, serializeCookie(cookieName, '', {
    ...attributes,
    expires: new Date(0),
    maxAge: 0,
  }))
}

function expireCookies(event: ServerEvent, cookie: { name: string, attributes: CookieOptions }): void {
  for (const cookieName of getChunkedCookieNames(event, cookie.name))
    expireCookie(event, cookieName, cookie.attributes)
}

function updateRequestHeaders(event: ServerEvent, sessionCookie: string, clearedCookieNames: string[]): void {
  const requestContext = getRequestSessionContext(event)
  const incomingHeaders = getIncomingRequestHeaders(event)
  const requestHeaders = new Headers(incomingHeaders)
  const cookies = parseRequestCookies(incomingHeaders.get('cookie'))

  for (const name of clearedCookieNames)
    cookies.delete(name)

  const sessionTokenName = sessionCookie.slice(0, sessionCookie.indexOf('='))
  cookies.set(sessionTokenName, extractResponseCookieValue(sessionCookie))

  const nextCookieHeader = serializeRequestCookies(cookies)
  if (nextCookieHeader)
    requestHeaders.set('cookie', nextCookieHeader)
  else
    requestHeaders.delete('cookie')

  requestContext.requestHeaders = requestHeaders
}

export async function getRequestSession(event: ServerEvent): Promise<AppSession | null> {
  const context = getRequestSessionContext(event)
  const inFlight = context[requestSessionLoadKey]
  if (inFlight)
    return inFlight

  if (context.requestSession !== undefined)
    return context.requestSession

  const load = loadSession(event)

  context[requestSessionLoadKey] = load
  try {
    const session = await load
    if (context[requestSessionLoadKey] === load)
      context.requestSession = session
    return session
  }
  finally {
    if (context[requestSessionLoadKey] === load)
      delete context[requestSessionLoadKey]
  }
}

export async function getUserSession(event: ServerEvent): Promise<AppSession | null> {
  const context = getRequestSessionContext(event)
  const inFlight = context[requestSessionLoadKey]
  if (inFlight)
    return inFlight

  if (context.requestSession !== undefined)
    return context.requestSession

  return loadSession(event)
}

export function setRequestSession(event: ServerEvent, session: AppSession | null): void {
  const context = getRequestSessionContext(event)
  context.requestSession = session
  delete context[requestSessionLoadKey]
}

export async function refreshSessionCookieCache(event: ServerEvent): Promise<AppSession | null> {
  const context = getRequestSessionContext(event)
  const inFlight = context[requestSessionLoadKey]
  const load = (inFlight ?? Promise.resolve(null)).catch(() => undefined).then(async () => {
    if (context[requestSessionLoadKey] !== load)
      return context.requestSession ?? null

    delete context.requestSession
    const { headers, response } = await loadFreshSession(event)

    if (context[requestSessionLoadKey] !== load)
      return context.requestSession ?? null

    appendSetCookieHeaders(event, headers)
    context.requestSession = response
    return response
  })

  context[requestSessionLoadKey] = load
  try {
    return await load
  }
  finally {
    if (context[requestSessionLoadKey] === load)
      delete context[requestSessionLoadKey]
  }
}

export async function setSessionCookie(event: ServerEvent, token: string): Promise<void> {
  const context = await getServerAuthContext(event)
  const sessionCookie = await serializeSignedCookie(
    context.authCookies.sessionToken.name,
    token,
    context.secret,
    {
      ...context.authCookies.sessionToken.attributes,
      maxAge: context.sessionConfig.expiresIn,
    },
  )

  appendCookieHeader(event, sessionCookie)
  expireCookies(event, context.authCookies.sessionData)
  expireCookies(event, context.authCookies.dontRememberToken)

  const requestContext = getRequestSessionContext(event)
  delete requestContext.requestSession
  delete requestContext[requestSessionLoadKey]
  updateRequestHeaders(event, sessionCookie, [
    ...getChunkedCookieNames(event, context.authCookies.sessionData.name),
    ...getChunkedCookieNames(event, context.authCookies.dontRememberToken.name),
  ])
}

export async function createSession(event: ServerEvent, userId: string): Promise<AuthSession> {
  const context = await getServerAuthContext(event)
  return context.internalAdapter.createSession?.(userId, false) as Promise<AuthSession>
}

export async function requireUserSession(event: ServerEvent, options?: RequireSessionOptions): Promise<AppSession> {
  const session = await getRequestSession(event)

  if (!session)
    throw createAuthError(401, 'Authentication required')

  if (options?.user) {
    if (!matchesUser(session.user, options.user))
      throw createAuthError(403, 'Access denied')
  }

  if (options?.rule) {
    const allowed = await options.rule({ user: session.user, session: session.session })
    if (!allowed)
      throw createAuthError(403, 'Access denied')
  }

  return session
}
