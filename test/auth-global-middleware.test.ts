import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const payload = {
  prerenderedAt: undefined as unknown,
  isCached: false,
}

const nuxtApp = {
  payload,
  isHydrating: false,
}

const runtimeConfig = {
  public: {
    auth: {
      redirects: {
        login: '/login',
        guest: '/app',
      },
      preserveRedirect: true,
      redirectQueryKey: 'redirect',
    },
  },
}

const getRouteRules = vi.fn(async () => ({}))
const navigateTo = vi.fn(async (to: unknown) => to)
const fetchSession = vi.fn(async () => {})
const loggedIn = ref(false)
const user = ref<null | { id: string }>(null)

vi.mock('#imports', () => ({
  createError: (error: unknown) => error,
  defineNuxtRouteMiddleware: (middleware: unknown) => middleware,
  getRouteRules,
  navigateTo,
  useNuxtApp: () => nuxtApp,
  useRequestHeaders: () => ({ cookie: 'session=test' }),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('../src/runtime/app/composables/useUserSession', () => ({
  useUserSession: () => ({
    fetchSession,
    user,
    loggedIn,
  }),
}))

async function loadMiddleware() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/middleware/auth.global')
  return mod.default
}

describe('auth.global middleware', () => {
  beforeEach(() => {
    payload.prerenderedAt = undefined
    payload.isCached = false
    nuxtApp.isHydrating = false
    getRouteRules.mockReset()
    navigateTo.mockReset()
    fetchSession.mockReset()
    loggedIn.value = false
    user.value = null
    runtimeConfig.public.auth.redirects.login = '/login'
    runtimeConfig.public.auth.redirects.guest = '/app'
  })

  it('keeps public routes unaffected when no auth rule is resolved', async () => {
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    getRouteRules.mockResolvedValueOnce({})

    const middleware = await loadMiddleware()
    await middleware({
      path: '/public',
      fullPath: '/public',
      meta: {},
    })

    expect(loggedIn.value).toBe(false)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('leaves unmatched routes to the nuxt 404 handler', async () => {
    getRouteRules.mockResolvedValueOnce({ auth: 'user' })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/missing',
      fullPath: '/missing',
      matched: [],
      meta: {},
    })

    expect(getRouteRules).not.toHaveBeenCalled()
    expect(fetchSession).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('redirects authenticated users from guest routes resolved via route rules', async () => {
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    loggedIn.value = true
    getRouteRules.mockResolvedValueOnce({ auth: { only: 'guest' } })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/login',
      fullPath: '/login',
      meta: {},
    })

    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('does not redirect from guest routes when session refresh resolves as logged out', async () => {
    loggedIn.value = true
    getRouteRules.mockResolvedValueOnce({ auth: { only: 'guest' } })
    fetchSession.mockImplementationOnce(async () => {
      loggedIn.value = false
      user.value = null
    })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/login',
      fullPath: '/login',
      meta: {},
    })

    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('checks protected routes and attempts redirect when unauthenticated', async () => {
    getRouteRules.mockResolvedValueOnce({ auth: 'user' })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/app',
      fullPath: '/app',
      meta: {},
    })

    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledTimes(1)
  })

  it('ignores internal module routes even when broad route rules set page meta', async () => {
    const middleware = await loadMiddleware()
    await middleware({
      path: '/__better-auth-devtools',
      fullPath: '/__better-auth-devtools',
      meta: { auth: 'user' },
    })

    expect(getRouteRules).not.toHaveBeenCalled()
    expect(fetchSession).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('forces a fresh session check during prerender hydration for protected routes', async () => {
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    getRouteRules.mockResolvedValueOnce({ auth: 'user' })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/app',
      fullPath: '/app',
      meta: {},
    })

    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(fetchSession).toHaveBeenCalledWith({ headers: undefined, force: true })
    expect(navigateTo).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when prerender hydration session fetch resolves as logged in', async () => {
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    getRouteRules.mockResolvedValueOnce({ auth: 'user' })
    fetchSession.mockImplementationOnce(async () => {
      loggedIn.value = true
      user.value = { id: 'user-1' }
    })

    const middleware = await loadMiddleware()
    await middleware({
      path: '/app',
      fullPath: '/app',
      meta: {},
    })

    expect(loggedIn.value).toBe(true)
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
