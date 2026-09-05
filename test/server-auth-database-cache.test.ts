import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  env: process.env,
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
    vi.stubEnv('BETTER_AUTH_SECRET', '')
    vi.stubEnv('BETTER_AUTH_SECRETS', '')

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

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('rejects request-derived origins and listener addresses in production', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: '' },
      auth: {},
      betterAuthSecret: 'test-secret-for-testing-only-32chars',
    })
    for (const name of ['VERCEL_URL', 'CF_PAGES_URL', 'URL'])
      vi.stubEnv(name, '')
    vi.stubEnv('HOST', '0.0.0.0')
    vi.stubEnv('NITRO_HOST', '127.0.0.1')

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth(createEvent())).toThrow('siteUrl required in production')
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it.each([
    ['VERCEL_URL', 'deployment.vercel.app', 'https://deployment.vercel.app'],
    ['CF_PAGES_URL', 'https://deployment.pages.dev', 'https://deployment.pages.dev'],
    ['URL', 'https://deployment.netlify.app', 'https://deployment.netlify.app'],
  ])('uses %s without trusting the request origin', async (name, value, expected) => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: '' },
      auth: {},
      betterAuthSecret: 'test-secret-for-testing-only-32chars',
    })
    for (const variable of ['VERCEL_URL', 'CF_PAGES_URL', 'URL'])
      vi.stubEnv(variable, '')
    vi.stubEnv(name, value)
    vi.stubEnv('NITRO_HOST', '127.0.0.1')

    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    serverAuth(createEvent())

    expect(betterAuthMock.mock.calls[0]?.[0].baseURL).toBe(expected)
    expect(createServerAuthMock).toHaveBeenCalledWith(expect.objectContaining({ requestOrigin: 'https://example.com' }))
  })

  it('rejects missing singular and versioned secrets before creating auth', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('An auth secret is required in production')
    expect(createDatabaseMock).not.toHaveBeenCalled()
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('forwards versioned secrets without requiring a singular secret', async () => {
    const secrets = [
      { version: 2, value: 'current-secret-for-testing-only-32chars' },
      { version: 1, value: 'previous-secret-for-testing-only-32chars' },
    ]
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })
    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
      secrets,
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).not.toThrow()
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({ secret: '', secrets }))
  })

  it('allows BETTER_AUTH_SECRETS without requiring a singular secret', async () => {
    vi.stubEnv('BETTER_AUTH_SECRETS', '2:current-secret-for-testing-only-32chars,1:previous-secret-for-testing-only-32chars')
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).not.toThrow()
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({ secret: '' }))
  })

  it('allows a runtime-only BETTER_AUTH_SECRET', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'runtime-secret-for-testing-only-32chars')
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).not.toThrow()
    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      secret: 'runtime-secret-for-testing-only-32chars',
    }))
  })

  it('rejects a short runtime-only BETTER_AUTH_SECRET', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'too-short')
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('Singular auth secret must be at least 32 characters')
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('rejects missing secrets before resolving siteUrl', async () => {
    vi.stubEnv('NITRO_HOST', '')
    vi.stubEnv('HOST', '')
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('CF_PAGES_URL', '')
    vi.stubEnv('URL', '')
    useRuntimeConfigMock.mockReturnValue({
      public: {},
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('An auth secret is required in production')
    expect(createDatabaseMock).not.toHaveBeenCalled()
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('rejects a short runtime secret before creating auth', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: {},
      betterAuthSecret: 'too-short',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('Singular auth secret must be at least 32 characters')
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

  it('preserves user secondary storage when runtime config contains stale true', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const secondaryStorage = {
      get: vi.fn(),
      getAndDelete: vi.fn(),
      increment: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }
    useRuntimeConfigMock.mockReturnValue({
      public: { siteUrl: 'https://example.com' },
      auth: { hubSecondaryStorage: true },
      betterAuthSecret: 'test-secret-for-testing-only-32chars',
    })
    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
      secondaryStorage,
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    serverAuth()

    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({ secondaryStorage }))
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Runtime hubSecondaryStorage: true is unsupported'))
  })

  it('falls back to memory when secondary-storage rate limiting has no store', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
      rateLimit: { storage: 'secondary-storage' },
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    serverAuth()

    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      rateLimit: { storage: 'memory' },
    }))
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining('Falling back to process-local memory'))
  })

  it('preserves custom rate-limit storage without secondary storage', async () => {
    const customStorage = { consume: vi.fn() }
    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
      rateLimit: { storage: 'secondary-storage', customStorage },
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    serverAuth()

    expect(betterAuthMock).toHaveBeenCalledWith(expect.objectContaining({
      rateLimit: { storage: 'secondary-storage', customStorage },
    }))
  })
})
