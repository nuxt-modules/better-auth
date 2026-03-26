import type { AppSession, RequireSessionOptions } from '#nuxt-better-auth'
import type { CookieOptions } from 'better-call'
import type { H3Event } from 'h3'
import { serializeCookie, serializeSignedCookie } from 'better-call'
import { appendResponseHeader, createError } from 'h3'
import { matchesUser } from '../../utils/match-user'
import { serverAuth } from './auth'

const requestSessionLoadKey = Symbol.for('nuxt-better-auth.requestSessionLoad')

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

function appendCookieHeader(event: H3Event, header: string): void {
  appendResponseHeader(event, 'set-cookie', header)
}

function parseRequestCookies(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!cookieHeader)
    return cookies

  for (const pair of cookieHeader.split(/;\s*/)) {
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
  const auth = serverAuth(event)
  const context = await auth.$context
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
