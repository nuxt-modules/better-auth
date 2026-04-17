import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types'
import { createError, defineEventHandler, getRequestURL } from 'h3'
import { getRouteRules } from 'nitropack/runtime'
import { matchesUser } from '../../utils/match-user'
import { getUserSession, requireUserSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/'))
    return

  if (path.startsWith('/api/auth/'))
    return

  const rules = getRouteRules(event) as AuthRouteRules
  if (!rules.auth)
    return

  const auth: AuthMeta = rules.auth
  const mode: AuthMode = typeof auth === 'string' ? auth : auth?.only ?? 'user'

  if (mode === 'guest') {
    const session = await getUserSession(event)
    if (session)
      throw createError({ statusCode: 403, statusMessage: 'Authenticated users not allowed' })
    return
  }

  if (mode === 'user') {
    const session = await requireUserSession(event)

    if (typeof auth === 'object' && auth.user) {
      if (!matchesUser(session.user, auth.user))
        throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }
  }
})
