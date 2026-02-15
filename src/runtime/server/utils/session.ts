import type { AuthSession, AuthUser } from '#nuxt-better-auth'
import type { H3Event } from 'h3'
import type { UserMatch } from '../../types'
import { createError } from 'h3'
import { matchesUser } from '../../utils/match-user'
import { serverAuth } from './auth'

interface AppSession { user: AuthUser, session: AuthSession }
interface RequireUserSessionOptions {
  user?: UserMatch<AuthUser>
  rule?: (ctx: { user: AuthUser, session: AuthSession }) => boolean | Promise<boolean>
}

const appSessionLoadKey = Symbol.for('nuxt-better-auth.appSessionLoad')

type AppSessionContext = H3Event['context'] & {
  appSession?: AppSession | null
  [appSessionLoadKey]?: Promise<AppSession | null>
}

function getAppSessionContext(event: H3Event): AppSessionContext {
  return event.context as AppSessionContext
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
  return getAppSession(event)
}

export async function requireUserSession(event: H3Event, options?: RequireUserSessionOptions): Promise<AppSession> {
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
