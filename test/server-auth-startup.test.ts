import { Buffer } from 'node:buffer'
import { hkdfSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Uses Nuxt's real `deriveSecret()` from `nuxt/server`, with `appSecret` as the only secret,
// as it is when a deployment sets only `NUXT_APP_SECRET`.
const runtimeConfig = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
const betterAuthMock = vi.fn()

vi.mock('nuxt/internal/server-runtime-config', () => ({
  useRuntimeConfig: () => runtimeConfig.current,
}))

vi.mock('nuxt/internal/server-app-config', () => ({ default: {} }))

vi.mock('../src/runtime/server/internal/app-secret-compat', () => import('../src/runtime/server/internal/app-secret'))

vi.mock('../src/runtime/server/internal/nitro-compat', () => ({
  getRequestHost: () => 'example.com',
  getRequestProtocol: () => 'https',
  useRuntimeConfig: () => runtimeConfig.current,
}))

vi.mock('#auth/database', () => ({
  createDatabase: () => undefined,
  db: undefined,
}))

vi.mock('#auth/server', () => ({
  default: () => ({}),
}))

vi.mock('better-auth', () => ({
  betterAuth: betterAuthMock,
  env: process.env,
}))

const appSecret = 'app-secret-for-testing-only-at-least-32-chars'
const expectedSecret = Buffer.from(hkdfSync('sha256', appSecret, 'nuxt', 'better-auth:secret', 32)).toString('hex')

function passedSecret(): unknown {
  return betterAuthMock.mock.calls.at(-1)?.[0].secret
}

async function startServer() {
  const { default: authSecretPlugin } = await import('../src/runtime/server/plugins/auth-secret')
  const { ensureServerAuth, serverAuth } = await import('../src/runtime/server/utils/auth')
  // Nitro calls plugins synchronously and does not await them.
  authSecretPlugin()
  return { ensureServerAuth, serverAuth }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  for (const name of ['BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRETS', 'AUTH_SECRET'])
    vi.stubEnv(name, '')
  runtimeConfig.current = {
    public: { siteUrl: 'https://example.com' },
    auth: {},
    betterAuthSecret: '',
    appSecret,
  }
  betterAuthMock.mockImplementation((options: Record<string, unknown>) => ({ options }))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe.skipIf(import.meta.dev)('serverAuth at server startup with only NUXT_APP_SECRET', () => {
  it('returns an instance with the derived secret from ensureServerAuth() in a startup plugin', async () => {
    const { ensureServerAuth } = await startServer()

    const auth = await ensureServerAuth()

    expect(auth).toBeDefined()
    expect(passedSecret()).toBe(expectedSecret)
  })

  it('lets a synchronous serverAuth() before the first request use the secret derived at startup', async () => {
    const { serverAuth } = await startServer()
    const { getDerivedAuthSecret } = await import('../src/runtime/server/internal/auth-secret')

    // Only the startup plugin starts the derivation here; no request and no serverAuth() call has run.
    await vi.waitFor(() => expect(getDerivedAuthSecret().secret).toBeDefined())
    serverAuth()

    expect(passedSecret()).toBe(expectedSecret)
  })

  it('rejects from ensureServerAuth() with the NUXT_APP_SECRET hint when appSecret is missing', async () => {
    runtimeConfig.current.appSecret = ''
    const { ensureServerAuth } = await startServer()

    await expect(ensureServerAuth()).rejects.toThrow(/or set NUXT_APP_SECRET/)
    expect(betterAuthMock).not.toHaveBeenCalled()
  })
})
