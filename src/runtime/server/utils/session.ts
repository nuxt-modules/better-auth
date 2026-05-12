import type { H3Event } from 'h3'
import type { AppSession, AuthSession, RequireSessionOptions } from '#nuxt-better-auth'
import { createError } from 'h3'
import { matchesUser } from '../../utils/match-user'
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

const fallbackRequestSessionContext = new WeakMap<object, RequestSessionContext>()

function getRequestSessionContext(event: H3Event): RequestSessionContext {
  const eventWithContext = event as H3Event & { context?: unknown }
  if (eventWithContext.context && typeof eventWithContext.context === 'object')
    return eventWithContext.context as RequestSessionContext

  let context = fallbackRequestSessionContext.get(event as object)
  if (!context) {
    context = {}
    fallbackRequestSessionContext.set(event as object, context)
  }
  return context
}

function getRequestHeaders(event: H3Event): Headers {
  return getRequestSessionContext(event).requestHeaders ?? event.headers
}

function loadSession(event: H3Event): Promise<AppSession | null> {
  const auth = serverAuth(event)
  return auth.api.getSession({ headers: getRequestHeaders(event) }) as Promise<AppSession | null>
}

function getServerAuthContext(event: H3Event): Promise<ServerAuthContextLike> {
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

function appendCookieHeader(event: H3Event, header: string): void {
  const nodeResponse = (event as H3Event & {
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

  const responseHeaders = (event as H3Event & { response?: { headers?: Headers } }).response?.headers
  responseHeaders?.append('set-cookie', header)
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

function getChunkedCookieNames(event: H3Event, cookieName: string): string[] {
  const cookieNames = new Set<string>([cookieName])
  for (const name of parseRequestCookies(event.headers.get('cookie')).keys()) {
    if (name.startsWith(`${cookieName}.`))
      cookieNames.add(name)
  }
  return Array.from(cookieNames)
}

function expireCookie(event: H3Event, cookieName: string, attributes: CookieOptions): void {
  appendCookieHeader(event, serializeCookie(cookieName, '', {
    ...attributes,
    expires: new Date(0),
    maxAge: 0,
  }))
}

function expireCookies(event: H3Event, cookie: { name: string, attributes: CookieOptions }): void {
  for (const cookieName of getChunkedCookieNames(event, cookie.name))
    expireCookie(event, cookieName, cookie.attributes)
}

function updateRequestHeaders(event: H3Event, sessionCookie: string, clearedCookieNames: string[]): void {
  const requestContext = getRequestSessionContext(event)
  const requestHeaders = new Headers(event.headers)
  const cookies = parseRequestCookies(event.headers.get('cookie'))

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

export async function getRequestSession(event: H3Event): Promise<AppSession | null> {
  const context = getRequestSessionContext(event)
  if (context.requestSession !== undefined)
    return context.requestSession

  const inFlight = context[requestSessionLoadKey]
  if (inFlight)
    return inFlight

  const load = loadSession(event)

  context[requestSessionLoadKey] = load
  try {
    const session = await load
    context.requestSession = session
    return session
  }
  finally {
    delete context[requestSessionLoadKey]
  }
}

export async function getUserSession(event: H3Event): Promise<AppSession | null> {
  const context = getRequestSessionContext(event)
  if (context.requestSession !== undefined)
    return context.requestSession

  const inFlight = context[requestSessionLoadKey]
  if (inFlight)
    return inFlight

  return loadSession(event)
}

export async function setSessionCookie(event: H3Event, token: string): Promise<void> {
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

export async function createSession(event: H3Event, userId: string): Promise<AuthSession> {
  const context = await getServerAuthContext(event)
  return context.internalAdapter.createSession?.(userId, false) as Promise<AuthSession>
}

export async function requireUserSession(event: H3Event, options?: RequireSessionOptions): Promise<AppSession> {
  const session = await getRequestSession(event)

  if (!session)
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  if (options?.user) {
    if (!matchesUser(session.user, options.user))
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  if (options?.rule) {
    const allowed = await options.rule({ user: session.user, session: session.session })
    if (!allowed)
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  return session
}
