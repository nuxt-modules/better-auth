import { beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuthMock = vi.fn()
const createDatabaseMock = vi.fn()
const createSecondaryStorageMock = vi.fn()
const createServerAuthMock = vi.fn()
const useRuntimeConfigMock = vi.fn()

vi.mock('#auth/database', () => ({
  createDatabase: createDatabaseMock,
  db: { query: {} },
}))

vi.mock('#auth/secondary-storage', () => ({
  createSecondaryStorage: createSecondaryStorageMock,
}))

vi.mock('#auth/server', () => ({
  default: createServerAuthMock,
}))

vi.mock('better-auth', () => ({
  betterAuth: betterAuthMock,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}))

describe('serverAuth runtime secret validation', () => {
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

    createDatabaseMock.mockReturnValue(undefined)
    createSecondaryStorageMock.mockReturnValue(undefined)
    createServerAuthMock.mockReturnValue({
      trustedOrigins: undefined,
    })
    betterAuthMock.mockImplementation((options: Record<string, unknown>) => ({ options }))
  })

  it('throws when the runtime auth secret is missing', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: {
        siteUrl: 'https://example.com',
      },
      auth: {},
      betterAuthSecret: '',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('NUXT_BETTER_AUTH_SECRET is required in production')
    expect(createDatabaseMock).not.toHaveBeenCalled()
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('throws when the runtime auth secret is shorter than 32 characters', async () => {
    useRuntimeConfigMock.mockReturnValue({
      public: {
        siteUrl: 'https://example.com',
      },
      auth: {},
      betterAuthSecret: 'too-short-secret',
    })

    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    expect(() => serverAuth()).toThrow('NUXT_BETTER_AUTH_SECRET must be at least 32 characters')
    expect(createDatabaseMock).not.toHaveBeenCalled()
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('initializes auth when the runtime auth secret is valid', async () => {
    const { serverAuth } = await import('../src/runtime/server/utils/auth')

    const auth = serverAuth()

    expect(auth).toEqual({
      options: expect.objectContaining({
        secret: 'test-secret-for-testing-only-32chars',
        baseURL: 'https://example.com',
      }),
    })
    expect(createDatabaseMock).toHaveBeenCalledTimes(1)
    expect(betterAuthMock).toHaveBeenCalledTimes(1)
  })
})
