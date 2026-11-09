import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuthMock = vi.fn()
const createServerAuthMock = vi.fn()
const runtimeConfig = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
const deriveAuthSecretMock = vi.fn()
const appSecret = { available: true }

vi.mock('#auth/database', () => ({
  createDatabase: () => undefined,
  db: undefined,
  isRequestScopedDatabase: () => false,
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
  useRuntimeConfig: () => runtimeConfig.current,
}))

vi.mock('../src/runtime/server/internal/app-secret-compat', () => ({
  get deriveAuthSecret() {
    return appSecret.available ? deriveAuthSecretMock : undefined
  },
}))

const secret = 'configured-secret-for-testing-32chars'
const missingSecret = /^\[nuxt-better-auth\] An auth secret is required in production\. Set NUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET, BETTER_AUTH_SECRETS, or defineServerAuth\(\{ secrets \}\)/

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** Runs the startup plugin as Nitro does, without awaiting it, and lets its check settle. */
async function startServer() {
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { default: authSecretPlugin } = await import('../src/runtime/server/plugins/auth-secret')
  authSecretPlugin()
  await flush()
  return { exit, error }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  appSecret.available = true
  for (const name of ['BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRETS', 'AUTH_SECRET', 'NUXT_APP_SECRET_GENERATED'])
    vi.stubEnv(name, '')
  runtimeConfig.current = { public: { siteUrl: 'https://example.com' }, auth: {}, betterAuthSecret: '' }
  createServerAuthMock.mockReturnValue({})
  deriveAuthSecretMock.mockRejectedValue(new Error('`appSecret` is not set.'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe.skipIf(import.meta.dev || import.meta.prerender || import.meta.preset)('auth secret check at production server startup', () => {
  it.each([
    ['runtime config (NUXT_BETTER_AUTH_SECRET)', () => { runtimeConfig.current.betterAuthSecret = secret }],
    ['BETTER_AUTH_SECRET', () => vi.stubEnv('BETTER_AUTH_SECRET', secret)],
    ['BETTER_AUTH_SECRETS', () => vi.stubEnv('BETTER_AUTH_SECRETS', `1:${secret}`)],
    ['defineServerAuth({ secrets })', () => createServerAuthMock.mockReturnValue({ secrets: [{ version: 1, value: secret }] })],
    ['NUXT_APP_SECRET', () => deriveAuthSecretMock.mockResolvedValue('d'.repeat(64))],
  ])('starts with a secret from %s', async (_source, configure) => {
    configure()
    const { exit, error } = await startServer()

    expect(error).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  it('does not run defineServerAuth() when another source sets the secret', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', secret)
    await startServer()

    expect(createServerAuthMock).not.toHaveBeenCalled()
  })

  it('starts when defineServerAuth() throws outside a request, leaving the first auth call to report', async () => {
    createServerAuthMock.mockImplementation(() => {
      throw new Error('needs a request')
    })
    const { exit } = await startServer()

    expect(exit).not.toHaveBeenCalled()
  })

  it('stops with no secret, naming NUXT_APP_SECRET on Nuxt 4.6+', async () => {
    const { exit, error } = await startServer()

    expect(error).toHaveBeenCalledWith(expect.stringMatching(missingSecret))
    expect(error).toHaveBeenCalledWith(expect.stringContaining('or set NUXT_APP_SECRET (at least 32 characters)'))
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('stops with no secret before Nuxt 4.6', async () => {
    appSecret.available = false
    const { exit, error } = await startServer()

    expect(error).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`${missingSecret.source}\\.$`)))
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('waits for the secret derived from NUXT_APP_SECRET before deciding', async () => {
    let rejectSecret!: (error: Error) => void
    deriveAuthSecretMock.mockReturnValue(new Promise<string>((_resolve, reject) => {
      rejectSecret = reject
    }))
    const { exit } = await startServer()
    expect(exit).not.toHaveBeenCalled()

    rejectSecret(new Error('`appSecret` is not set.'))
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1))
  })

  it('stops with only AUTH_SECRET, which serverAuth() does not accept in production either', async () => {
    vi.stubEnv('AUTH_SECRET', secret)
    const { exit, error } = await startServer()

    expect(error).toHaveBeenCalledWith(expect.stringMatching(missingSecret))
    expect(exit).toHaveBeenCalledWith(1)
    const { serverAuth } = await import('../src/runtime/server/utils/auth')
    expect(() => serverAuth()).toThrow('An auth secret is required in production')
  })

  it('stops with a configured secret shorter than 32 characters', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'too-short')
    const { exit, error } = await startServer()

    expect(error).toHaveBeenCalledWith('[nuxt-better-auth] Singular auth secret must be at least 32 characters for security')
    expect(exit).toHaveBeenCalledWith(1)
  })
})

describe.runIf(import.meta.dev || import.meta.prerender || import.meta.preset)('auth secret check skipped in development, prerendering and Cloudflare', () => {
  it('starts without a secret', async () => {
    const { exit, error } = await startServer()

    expect(createServerAuthMock).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })
})
