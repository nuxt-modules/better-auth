import { beforeEach, describe, expect, it, vi } from 'vitest'

const getRouteRules = vi.fn()
const getUserSession = vi.fn()
const requireUserSession = vi.fn()

vi.mock('nitro/app', () => ({
  getRouteRules,
}))

vi.mock('nitro/h3', async () => {
  const actual = await vi.importActual<typeof import('nitro/h3')>('nitro/h3')
  return {
    ...actual,
    defineEventHandler: (handler: unknown) => handler,
    getRequestURL: (event: { req: Request }) => new URL(event.req.url),
  }
})

vi.mock('../src/nitro/runtime/server/utils/session', () => ({
  getUserSession,
  requireUserSession,
}))

async function loadRouteAccess() {
  vi.resetModules()
  return (await import('../src/nitro/runtime/server/middleware/route-access')).default
}

describe('nitro route access middleware', () => {
  beforeEach(() => {
    getRouteRules.mockReset()
    getUserSession.mockReset()
    requireUserSession.mockReset()
  })

  it('ignores routes without auth route rules', async () => {
    getRouteRules.mockReturnValue({ routeRules: {} })

    const middleware = await loadRouteAccess()
    await middleware({ req: new Request('https://example.com/api/public') })

    expect(getUserSession).not.toHaveBeenCalled()
    expect(requireUserSession).not.toHaveBeenCalled()
  })

  it('rejects authenticated users from guest routes', async () => {
    getRouteRules.mockReturnValue({
      routeRules: {
        auth: {
          options: { only: 'guest' },
        },
      },
    })
    getUserSession.mockResolvedValue({ user: { id: 'user-1' } })

    const middleware = await loadRouteAccess()

    await expect(middleware({ req: new Request('https://example.com/api/guest') })).rejects.toMatchObject({
      message: 'Authenticated users not allowed',
      status: 403,
    })
  })

  it('requires a session for protected routes', async () => {
    getRouteRules.mockReturnValue({
      routeRules: {
        auth: {
          options: 'user',
        },
      },
    })
    requireUserSession.mockResolvedValue({
      user: {
        id: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: 'user@example.com',
        emailVerified: true,
        name: 'User',
      },
      session: {
        id: 'session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
        expiresAt: new Date(),
        token: 'token',
      },
    })

    const middleware = await loadRouteAccess()
    await middleware({ req: new Request('https://example.com/api/protected') })

    expect(requireUserSession).toHaveBeenCalledTimes(1)
  })
})
