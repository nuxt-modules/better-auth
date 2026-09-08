import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRouteRules = vi.fn(() => ({}))
const getUserSession = vi.fn()
const requireUserSession = vi.fn()
const useRuntimeConfig = vi.fn(() => ({ app: { baseURL: '/' } }))

vi.mock('h3', async importOriginal => ({
  ...await importOriginal<typeof import('h3')>(),
  createError: (error: unknown) => error,
  defineEventHandler: (handler: unknown) => handler,
  getRequestURL: (event: { path: string }) => new URL(event.path, 'https://example.test'),
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules,
  useRuntimeConfig,
}))

vi.mock('../src/runtime/server/utils/session', () => ({
  getUserSession,
  requireUserSession,
}))

async function loadMiddleware() {
  vi.resetModules()
  const mod = await import('../src/runtime/server/middleware/route-access')
  return mod.default as (event: any) => Promise<void>
}

describe('route-access middleware', () => {
  beforeEach(() => {
    getRouteRules.mockReset()
    getUserSession.mockReset()
    requireUserSession.mockReset()
    useRuntimeConfig.mockReset()
    getRouteRules.mockReturnValue({})
    useRuntimeConfig.mockReturnValue({ app: { baseURL: '/' } })
  })

  it('ignores internal API routes before auth route rules are read', async () => {
    getRouteRules.mockReturnValue({ auth: 'user' })
    const middleware = await loadMiddleware()

    await middleware({ path: '/api/auth/get-session' })
    await middleware({ path: '/api/_better-auth/config' })
    await middleware({ path: '/api/_nuxt_icon/lucide:home.svg' })

    expect(getRouteRules).not.toHaveBeenCalled()
    expect(getUserSession).not.toHaveBeenCalled()
    expect(requireUserSession).not.toHaveBeenCalled()
  })

  it('still protects app API routes matched by broad route rules', async () => {
    getRouteRules.mockReturnValue({ auth: 'user' })
    requireUserSession.mockResolvedValue({ user: { id: 'user-1' } })

    const middleware = await loadMiddleware()
    const event = { path: '/api/test/me' }
    await middleware(event)

    expect(getRouteRules).toHaveBeenCalledTimes(1)
    expect(getRouteRules).toHaveBeenCalledWith(event)
    expect(requireUserSession).toHaveBeenCalledTimes(1)
  })

  it('protects the exact API root', async () => {
    getRouteRules.mockReturnValue({ auth: 'user' })
    requireUserSession.mockResolvedValue({ user: { id: 'user-1' } })

    const middleware = await loadMiddleware()
    await middleware({ path: '/api' })

    expect(requireUserSession).toHaveBeenCalledTimes(1)
  })

  it('protects API routes below the app base URL', async () => {
    useRuntimeConfig.mockReturnValue({ app: { baseURL: '/dashboard/' } })
    getRouteRules.mockReturnValue({ auth: 'user' })
    requireUserSession.mockResolvedValue({ user: { id: 'user-1' } })

    const middleware = await loadMiddleware()
    await middleware({ path: '/dashboard/api/test/me' })

    expect(requireUserSession).toHaveBeenCalledTimes(1)
  })

  it('ignores internal API routes below the app base URL', async () => {
    useRuntimeConfig.mockReturnValue({ app: { baseURL: '/dashboard/' } })
    getRouteRules.mockReturnValue({ auth: 'user' })

    const middleware = await loadMiddleware()
    await middleware({ path: '/dashboard/api/auth/get-session' })

    expect(getRouteRules).not.toHaveBeenCalled()
    expect(requireUserSession).not.toHaveBeenCalled()
  })
})
