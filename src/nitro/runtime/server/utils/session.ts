import type { H3Event } from 'nitro/h3'
import type { AppSession, RequireSessionOptions } from '../../types'
import { HTTPError } from 'nitro/h3'
import { matchesUser } from '../../utils/match-user'
import { serverAuth } from './auth'

const requestSessionLoadKey = Symbol.for('nuxt-better-auth.nitro.requestSessionLoad')

interface RequestSessionContext {
  requestSession?: AppSession | null
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

function loadSession(event: H3Event): Promise<AppSession | null> {
  const auth = serverAuth(event)
  return auth.api.getSession({ headers: event.req.headers }) as Promise<AppSession | null>
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

export async function requireUserSession(event: H3Event, options?: RequireSessionOptions): Promise<AppSession> {
  const session = await getRequestSession(event)

  if (!session)
    throw new HTTPError('Authentication required', { status: 401 })

  if (options?.user && !matchesUser(session.user, options.user))
    throw new HTTPError('Access denied', { status: 403 })

  if (options?.rule) {
    const allowed = await options.rule({ user: session.user, session: session.session })
    if (!allowed)
      throw new HTTPError('Access denied', { status: 403 })
  }

  return session
}
