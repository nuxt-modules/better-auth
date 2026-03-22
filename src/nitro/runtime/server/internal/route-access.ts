import type { H3Event } from 'nitro/h3'
import type { AuthMeta, AuthMode } from '../../types'
import { getRouteRules } from 'nitro/app'
import { getRequestURL, HTTPError } from 'nitro/h3'
import { matchesUser } from '../../utils/match-user'
import { getUserSession, requireUserSession } from '../utils/session'

export async function enforceRouteAccess(event: H3Event): Promise<void> {
  const path = getRequestURL(event).pathname

  if (path.startsWith('/api/auth/'))
    return

  const resolved = getRouteRules(event.req.method || '', path)
  const auth = resolved.routeRules?.auth?.options as AuthMeta | undefined
  if (auth === undefined || auth === false)
    return

  const mode: AuthMode = typeof auth === 'string' ? auth : auth.only ?? 'user'

  if (mode === 'guest') {
    const session = await getUserSession(event)
    if (session)
      throw new HTTPError('Authenticated users not allowed', { status: 403 })
    return
  }

  const session = await requireUserSession(event)
  if (typeof auth === 'object' && auth.user && !matchesUser(session.user, auth.user))
    throw new HTTPError('Access denied', { status: 403 })
}
