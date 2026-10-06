import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuthMock = vi.fn()
const createServerAuthMock = vi.fn()
const useRuntimeConfigMock = vi.fn()
const deriveAuthSecretMock = vi.fn()
const appSecret = { available: true }

vi.mock('#auth/database', () => ({
  createDatabase: () => undefined,
  db: undefined,
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

vi.mock('../src/runtime/server/internal/app-secret-compat', () => ({
  get deriveAuthSecret() {
    return appSecret.available ? deriveAuthSecretMock : undefined
  },
}))

const derivedSecret = 'd'.repeat(64)
const configuredSecret = 'configured-secret-for-testing-32chars'

function setRuntimeSecret(betterAuthSecret: string) {
  useRuntimeConfigMock.mockReturnValue({
    public: { siteUrl: 'https://example.com' },
    auth: {},
    betterAuthSecret,
  })
}

async function loadServerAuth() {
  const { serverAuth } = await import('../src/runtime/server/utils/auth')
  const { prepareAuthSecret } = await import('../src/runtime/server/internal/auth-secret')
  return { serverAuth, prepareAuthSecret }
}

function passedSecret(): unknown {
  return betterAuthMock.mock.calls.at(-1)?.[0].secret
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  appSecret.available = true
  for (const name of ['BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRETS', 'AUTH_SECRET'])
    vi.stubEnv(name, '')
  setRuntimeSecret('')
  createServerAuthMock.mockReturnValue({})
  deriveAuthSecretMock.mockResolvedValue(derivedSecret)
  betterAuthMock.mockImplementation((options: Record<string, unknown>) => ({ options }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe.skipIf(import.meta.dev)('serverAuth secret from Nuxt appSecret', () => {
  it('derives the secret from appSecret when no auth secret is configured', async () => {
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()
    serverAuth()

    expect(deriveAuthSecretMock).toHaveBeenCalledOnce()
    expect(passedSecret()).toBe(derivedSecret)
  })

  it('derives the secret once per process', async () => {
    const { prepareAuthSecret } = await loadServerAuth()

    await Promise.all([prepareAuthSecret(), prepareAuthSecret()])
    await prepareAuthSecret()

    expect(deriveAuthSecretMock).toHaveBeenCalledOnce()
  })

  it.each([
    ['runtime config', () => setRuntimeSecret(configuredSecret)],
    ['BETTER_AUTH_SECRET', () => vi.stubEnv('BETTER_AUTH_SECRET', configuredSecret)],
  ])('keeps a configured secret from %s ahead of appSecret', async (_source, configure) => {
    configure()
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()
    serverAuth()

    expect(deriveAuthSecretMock).not.toHaveBeenCalled()
    expect(passedSecret()).toBe(configuredSecret)
  })

  it.each(['BETTER_AUTH_SECRETS', 'AUTH_SECRET'])('leaves %s to Better Auth', async (name) => {
    vi.stubEnv(name, name === 'BETTER_AUTH_SECRETS' ? `1:${configuredSecret}` : configuredSecret)
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()
    // AUTH_SECRET alone was never accepted in production; only the versioned form passes here.
    if (name === 'AUTH_SECRET') {
      expect(() => serverAuth()).toThrow('An auth secret is required in production')
    }
    else {
      serverAuth()
      expect(passedSecret()).toBe('')
    }
    expect(deriveAuthSecretMock).not.toHaveBeenCalled()
  })

  it('keeps defineServerAuth({ secrets }) ahead of appSecret', async () => {
    createServerAuthMock.mockReturnValue({ secrets: [{ version: 1, value: configuredSecret }] })
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()
    serverAuth()

    expect(passedSecret()).toBe('')
  })

  it('names NUXT_APP_SECRET when appSecret cannot derive a secret', async () => {
    deriveAuthSecretMock.mockRejectedValue(new Error('`appSecret` is not set.'))
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()

    expect(() => serverAuth()).toThrow(/NUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET.*NUXT_APP_SECRET/)
    expect(betterAuthMock).not.toHaveBeenCalled()
  })

  it('reports a call made before the derived secret is ready and starts deriving it', async () => {
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    expect(() => serverAuth()).toThrow('is resolved asynchronously')
    expect(deriveAuthSecretMock).toHaveBeenCalledOnce()

    await prepareAuthSecret()
    serverAuth()
    expect(passedSecret()).toBe(derivedSecret)
  })

  it('keeps the existing error before Nuxt 4.6', async () => {
    appSecret.available = false
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()

    expect(() => serverAuth()).toThrow(/^\[nuxt-better-auth\] An auth secret is required in production\. Set NUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_SECRETS, or defineServerAuth\(\{ secrets \}\)\.$/)
    expect(deriveAuthSecretMock).not.toHaveBeenCalled()
  })
})

describe.runIf(import.meta.dev)('serverAuth secret from Nuxt appSecret in development', () => {
  it('falls back to the development default without caching before the derived secret is ready', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    const early = serverAuth()
    expect(passedSecret()).toBe('')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NUXT_APP_SECRET'))

    await prepareAuthSecret()
    const ready = serverAuth()
    expect(ready).not.toBe(early)
    expect(passedSecret()).toBe(derivedSecret)
    expect(serverAuth()).toBe(ready)
  })

  it('keeps the development default before Nuxt 4.6', async () => {
    appSecret.available = false
    const { serverAuth, prepareAuthSecret } = await loadServerAuth()

    await prepareAuthSecret()
    serverAuth()

    expect(passedSecret()).toBe('')
    expect(deriveAuthSecretMock).not.toHaveBeenCalled()
  })
})
