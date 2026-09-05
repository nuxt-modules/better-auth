import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types'
import { shouldSkipAuthRouteRules } from '../../internal/auth-route-rules'
import { matchesUser } from '../../utils/match-user'
import { createAuthError, defineEventHandler, getAuthRouteRules, getRequestURL } from '../internal/nitro-compat'
import { getUserSession, requireUserSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/'))
    return

  if (shouldSkipAuthRouteRules(path))
    return

  const rules = getAuthRouteRules(event) as AuthRouteRules
  if (!rules.auth)
    return

  const auth: AuthMeta = rules.auth
  const mode: AuthMode = typeof auth === 'string' ? auth : auth?.only ?? 'user'

  if (mode === 'guest') {
    const session = await getUserSession(event)
    if (session)
      throw createAuthError(403, 'Authenticated users not allowed')
    return
  }

  if (mode === 'user') {
    const session = await requireUserSession(event)

    if (typeof auth === 'object' && auth.user) {
      if (!matchesUser(session.user, auth.user))
        throw createAuthError(403, 'Access denied')
    }
  }
})
