import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuthMock = vi.fn()
const createDatabaseMock = vi.fn()
const createServerAuthMock = vi.fn()
const useRuntimeConfigMock = vi.fn()

vi.mock('#auth/database', () => ({
  createDatabase: createDatabaseMock,
  db: { query: {} },
}))

vi.mock('#auth/secondary-storage', () => ({
  createSecondaryStorage: vi.fn(() => undefined),
}))

vi.mock('#auth/server', () => ({
  default: createServerAuthMock,
}))

vi.mock('better-auth', () => ({
  betterAuth: betterAuthMock,
}))

vi.mock('../src/runtime/server/internal/nitro-compat', () => ({
  getRequestHost: () => 'example.com',
  getRequestProtocol: () => 'https',
  useRuntimeConfig: useRuntimeConfigMock,
}))

type MockEvent = H3Event & {
  context: Record<string | symbol, unknown>
}

function createEvent(): MockEvent {
  return {
    context: {},
    node: {
      req: { headers: { host: 'example.com' }, socket: { encrypted: true } },
      res: { getHeader: () => undefined, setHeader: () => undefined },
    },
  } as unknown as MockEvent
}

describe('serverAuth database cache and secret validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()

    useRuntimeConfigMock.mockReturnValue({
      public: {
        siteUrl: 'https://example.com',
      },
      auth: {},
      betterAuthSecret: 'test-secret-for-testing-only-32chars',
    })

    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
    })

    betterAuthMock.mockImplementation((options: Record<string, unknown>) => ({
      options,
      marker: Symbol('auth-instance'),
    }))
  })

  it('rejects a missing runtime secret before creating auth', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('NUXT_BETTER_AUTH_SECRET is required in production')
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('rejects a short runtime secret before creating auth', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: 'too-short',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('NUXT_BETTER_AUTH_SECRET must be at least 32 characters')
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('reuses the same auth instance within a request when a database adapter is active', async () => {
    createDatabaseMock.mockReturnValue({ kind: 'database-adapter' })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    const event = createEvent()

    const first = serverAuth(event)
    const second = serverAuth(event)

    expect(first).toBe(second)
    expect(createDatabaseMock).toHaveBeenCalledTimes(1)
    expect(betterAuthMock).toHaveBeenCalledTimes(1)
  })

  it('creates a fresh auth instance for each request when a database adapter is active', async () => {
    createDatabaseMock.mockReturnValue({ kind: 'database-adapter' })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    const first = serverAuth(createEvent())
    const second = serverAuth(createEvent())

    expect(first).not.toBe(second)
    expect(createDatabaseMock).toHaveBeenCalledTimes(2)
    expect(betterAuthMock).toHaveBeenCalledTimes(2)
  })

  it('creates a fresh auth instance without request context when a database adapter is active', async () => {
    createDatabaseMock.mockReturnValue({ kind: 'database-adapter' })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    const first = serverAuth()
    const second = serverAuth()

    expect(first).not.toBe(second)
    expect(createDatabaseMock).toHaveBeenCalledTimes(2)
    expect(betterAuthMock).toHaveBeenCalledTimes(2)
  })

  it('keeps caching auth instances when no database adapter is configured', async () => {
    createDatabaseMock.mockReturnValue(undefined)

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    const first = serverAuth()
    const second = serverAuth()

    expect(first).toBe(second)
    expect(createDatabaseMock).toHaveBeenCalledTimes(2)
    expect(betterAuthMock).toHaveBeenCalledTimes(1)
  })
})
