import type { AppSession, RequireSessionOptions } from '#nuxt-better-auth'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { matchesUser } from '../../utils/match-user'
import { serverAuth } from './auth'

const appSessionLoadKey = Symbol.for('nuxt-better-auth.appSessionLoad')

interface AppSessionContext {
  appSession?: AppSession | null
  [appSessionLoadKey]?: Promise<AppSession | null>
}

const fallbackAppSessionContext = new WeakMap<object, AppSessionContext>()

function getAppSessionContext(event: H3Event): AppSessionContext {
  const eventWithContext = event as H3Event & { context?: unknown }
  if (eventWithContext.context && typeof eventWithContext.context === 'object')
    return eventWithContext.context as AppSessionContext

  let context = fallbackAppSessionContext.get(event as object)
  if (!context) {
    context = {}
    fallbackAppSessionContext.set(event as object, context)
  }
  return context
}

export async function getAppSession(event: H3Event): Promise<AppSession | null> {
  const context = getAppSessionContext(event)
  if (context.appSession !== undefined)
    return context.appSession

  if (context[appSessionLoadKey])
    return context[appSessionLoadKey]

  const load = (async () => {
    const auth = serverAuth(event)
    const session = await auth.api.getSession({ headers: event.headers })
    return session as AppSession | null
  })()

  context[appSessionLoadKey] = load
  try {
    const session = await load
    context.appSession = session
    return session
  }
  finally {
    delete context[appSessionLoadKey]
  }
}

export async function getUserSession(event: H3Event): Promise<AppSession | null> {
  // Preserve historical behavior: don't memoize, but reuse request cache if present.
  const context = getAppSessionContext(event)
  if (context.appSession !== undefined)
    return context.appSession

  if (context[appSessionLoadKey])
    return context[appSessionLoadKey]

  const auth = serverAuth(event)
  const session = await auth.api.getSession({ headers: event.headers })
  return session as AppSession | null
}

export async function requireUserSession(event: H3Event, options?: RequireSessionOptions): Promise<AppSession> {
  const session = await getAppSession(event)

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
