import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types'
import { defu } from 'defu'
import { createRouter, toRouteMatcher } from 'radix3'
import { normalizeAuthRoutePath, shouldSkipAuthRouteRules } from '../../internal/auth-route-rules'
import { matchesUser } from '../../utils/match-user'
import { prepareAuthSecret } from '../internal/auth-secret'
import { createAuthError, defineEventHandler, getAuthRouteRules, getRequestURL, useRuntimeConfig } from '../internal/nitro-compat'
import { getUserSession, requireUserSession } from '../utils/session'

let authRouteRulesMatcherPromise: Promise<ReturnType<typeof toRouteMatcher> | null> | null = null

export default defineEventHandler(async (event) => {
  // Runs before app handlers, so their synchronous serverAuth() calls see the derived secret.
  await prepareAuthSecret()

  const path = normalizeAuthRoutePath(
    getRequestURL(event).pathname,
    useRuntimeConfig().app?.baseURL,
  )

  if (path !== '/api' && !path.startsWith('/api/'))
    return

  if (shouldSkipAuthRouteRules(path))
    return

  const rules = await resolveAuthRouteRules(event, path)
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

async function resolveAuthRouteRules(event: Parameters<typeof getAuthRouteRules>[0], path: string): Promise<AuthRouteRules> {
  const rules = getAuthRouteRules(event) as AuthRouteRules | undefined
  if (rules?.auth !== undefined)
    return rules

  if (!authRouteRulesMatcherPromise) {
    authRouteRulesMatcherPromise = import('#auth/route-rules').then((mod) => {
      const routeRules = (mod as { authRouteRules?: Record<string, AuthRouteRules> }).authRouteRules || {}
      return Object.keys(routeRules).length
        ? toRouteMatcher(createRouter({ routes: routeRules }))
        : null
    }).catch(() => null)
  }

  const matcher = await authRouteRulesMatcherPromise
  const matches = matcher?.matchAll(path) as Partial<AuthRouteRules>[] | undefined
  if (!matches?.length)
    return rules || {}
  return defu({}, ...matches.reverse()) as AuthRouteRules
}
