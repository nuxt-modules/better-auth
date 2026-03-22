import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()

vi.mock('../src/nitro/runtime/server/utils/auth', () => ({
  serverAuth: () => ({
    api: {
      getSession,
    },
  }),
}))

async function loadSessionUtils() {
  vi.resetModules()
  return await import('../src/nitro/runtime/server/utils/session')
}

describe('nitro session utils', () => {
  beforeEach(() => {
    getSession.mockReset()
  })

  it('caches request session lookups on the event', async () => {
    getSession.mockResolvedValue({
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

    const { getRequestSession } = await loadSessionUtils()
    const event = { req: new Request('https://example.com/api/test'), context: {} } as any

    const first = await getRequestSession(event)
    const second = await getRequestSession(event)

    expect(first).toEqual(second)
    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('throws a 401 HTTPError when there is no authenticated session', async () => {
    getSession.mockResolvedValue(null)

    const { requireUserSession } = await loadSessionUtils()
    const event = { req: new Request('https://example.com/api/test'), context: {} } as any

    await expect(requireUserSession(event)).rejects.toMatchObject({
      message: 'Authentication required',
      status: 401,
    })
  })

  it('throws a 403 HTTPError when the user match fails', async () => {
    getSession.mockResolvedValue({
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

    const { requireUserSession } = await loadSessionUtils()
    const event = { req: new Request('https://example.com/api/test'), context: {} } as any

    await expect(requireUserSession(event, {
      user: { email: 'admin@example.com' },
    })).rejects.toMatchObject({
      message: 'Access denied',
      status: 403,
    })
  })
})
