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
  useRequestHeaders: () => ({ cookie: 'session=test' }),
  useRuntimeConfig: () => runtimeConfig,
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
})
