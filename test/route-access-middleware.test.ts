import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRouteRules = vi.fn(() => ({}))
const getUserSession = vi.fn()
const requireUserSession = vi.fn()

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    createError: (error: unknown) => error,
    defineEventHandler: (handler: unknown) => handler,
    getRequestURL: (event: { path: string }) => new URL(event.path, 'https://example.test'),
  }
})

vi.mock('#imports', () => ({ getRouteRules }))

vi.mock('../src/runtime/server/utils/session', () => ({
  getUserSession,
  requireUserSession,
}))

async function loadMiddleware() {
  vi.resetModules()
  const mod = await import('../src/runtime/server/middleware/route-access')
  return mod.default as (event: { path: string }) => Promise<void>
}

describe('route-access middleware', () => {
  beforeEach(() => {
    getRouteRules.mockReset()
    getUserSession.mockReset()
    requireUserSession.mockReset()
    getRouteRules.mockReturnValue({})
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
    await middleware({ path: '/api/test/me' })

    expect(getRouteRules).toHaveBeenCalledTimes(1)
    expect(requireUserSession).toHaveBeenCalledTimes(1)
  })
})
