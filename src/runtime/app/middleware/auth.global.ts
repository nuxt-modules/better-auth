import type { AuthRuntimeConfig } from '../../config'
import type { AuthMeta, AuthMode, AuthRouteRules } from '../../types'
import { createError, defineNuxtRouteMiddleware, getRouteRules, navigateTo, useNuxtApp, useRequestHeaders, useRuntimeConfig, useUserSession } from '#imports'
import { matchesUser } from '../../utils/match-user'

declare module '#app' {
  interface PageMeta {
    auth?: AuthMeta
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: AuthMeta
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const nuxtApp = useNuxtApp()

  // Skip auth check during initial hydration of prerendered/cached pages
  // The client plugin will handle session fetch after mount
  if (import.meta.client) {
    const isPrerendered = nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached
    if (isPrerendered && nuxtApp.isHydrating)
      return
  }

  // Runtime fallback: resolve auth from route rules if not set at build-time
  // This handles dynamic catch-all routes where build-time can't match specific paths
  if (to.meta.auth === undefined) {
    const rules = await getRouteRules({ path: to.path }) as AuthRouteRules
    if (rules.auth !== undefined)
      to.meta.auth = rules.auth
  }

  const auth = to.meta.auth as AuthMeta | undefined

  if (auth === undefined || auth === false)
    return

  const config = useRuntimeConfig().public.auth as AuthRuntimeConfig | undefined
  const { fetchSession, user, loggedIn } = useUserSession()

  // Always fetch session if not logged in - state may not have synced yet
  if (!loggedIn.value) {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    await fetchSession({ headers })
  }

  const mode: AuthMode = typeof auth === 'string' ? auth : auth?.only ?? 'user'
  const redirectTo = typeof auth === 'object' ? auth.redirectTo : undefined

  if (mode === 'guest') {
    if (loggedIn.value)
      return navigateTo(redirectTo ?? config?.redirects?.guest ?? '/')
    return
  }

  if (!loggedIn.value) {
    const resolved = resolveLoginRedirect({
      route: to,
      loginTarget: redirectTo ?? config?.redirects?.login ?? '/login',
      config,
    })
    return resolved.external ? navigateTo(resolved.to, { external: true }) : navigateTo(resolved.to)
  }

  if (typeof auth === 'object' && auth.user) {
    if (!user.value || !matchesUser(user.value, auth.user))
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }
})

function resolveLoginRedirect(input: {
  route: { fullPath: string }
  loginTarget: string
  config?: Pick<AuthRuntimeConfig, 'preserveRedirect' | 'redirectQueryKey'>
}): { to: Parameters<typeof navigateTo>[0], external: boolean } {
  const { route, loginTarget, config } = input

  const preserveRedirect = config?.preserveRedirect ?? true
  const redirectQueryKey = config?.redirectQueryKey ?? 'redirect'

  if (!preserveRedirect)
    return { to: loginTarget, external: false }

  // Only append for internal app routes: a single-leading-slash path.
  // Avoid protocol-relative/external URLs and avoid munging non-path targets.
  if (!loginTarget.startsWith('/') || loginTarget.startsWith('//'))
    return { to: loginTarget, external: false }

  const [beforeHash, hash = ''] = loginTarget.split('#', 2)
  const [path, query = ''] = beforeHash.split('?', 2)

  try {
    const params = new URLSearchParams(query)
    if (params.has(redirectQueryKey))
      return { to: loginTarget, external: false }
  }
  catch {
    return { to: loginTarget, external: false }
  }

  // Server: use an external redirect so the Location header keeps the encoded value.
  if (import.meta.server) {
    const separator = query ? '&' : ''
    const encodedRedirect = encodeURIComponent(route.fullPath)
    const url = `${path}?${query}${separator}${redirectQueryKey}=${encodedRedirect}${hash ? `#${hash}` : ''}`
    return { to: url, external: true }
  }

  // Client: return a route location object to avoid a full reload.
  const params = new URLSearchParams(query)
  const queryObj: Record<string, string> = {}
  for (const [k, v] of params.entries())
    queryObj[k] = v
  queryObj[redirectQueryKey] = route.fullPath

  return { to: { path, query: queryObj, ...(hash ? { hash: `#${hash}` } : {}) }, external: false }
}
