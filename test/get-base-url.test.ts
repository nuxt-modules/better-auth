import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeConfig = {
  public: { siteUrl: '' as unknown },
  auth: {},
  betterAuthSecret: 'test-secret-for-testing-only-32chars',
}
const createServerAuthMock = vi.fn()

vi.mock('#auth/database', () => ({ createDatabase: () => undefined, db: {} }))
vi.mock('#auth/server', () => ({ default: createServerAuthMock }))
vi.mock('better-auth', () => ({
  betterAuth: (options: BetterAuthOptions) => ({ options }),
  env: process.env,
}))
vi.mock('../src/runtime/server/internal/nitro-compat', async () => {
  const { getRequestHost, getRequestProtocol } = await import('h3')
  return { getRequestHost, getRequestProtocol, useRuntimeConfig: () => runtimeConfig }
})

function createEvent(host = 'request.example.com', forwardedHost?: string): H3Event {
  return {
    context: {},
    node: {
      req: {
        headers: {
          host,
          ...(forwardedHost ? { 'x-forwarded-host': forwardedHost, 'x-forwarded-proto': 'https' } : {}),
        },
        socket: {},
      },
    },
  } as unknown as H3Event
}

async function authOptions(event?: H3Event) {
  const { serverAuth } = await import('../src/runtime/server/utils/auth')
  return serverAuth(event).options
}

async function trustedOrigins(request?: Request) {
  const options = await authOptions()
  expect(options.trustedOrigins).toBeTypeOf('function')
  if (typeof options.trustedOrigins !== 'function')
    throw new TypeError('Expected development trustedOrigins callback')
  return options.trustedOrigins(request)
}

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  runtimeConfig.public.siteUrl = ''
  createServerAuthMock.mockReturnValue({})
  for (const name of [
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_SECRETS',
    'VERCEL_URL',
    'CF_PAGES_URL',
    'URL',
    'HOST',
    'PORT',
    'NITRO_HOST',
    'NITRO_PORT',
    'NITRO_SSL_CERT',
    'NITRO_SSL_KEY',
    '__NUXT_DEV__',
    'NUXT_VITE_NODE_OPTIONS',
  ]) {
    vi.stubEnv(name, '')
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('serverAuth origin configuration', () => {
  it('prefers explicit configuration over the request and platform environment', async () => {
    runtimeConfig.public.siteUrl = 'https://explicit.example.com/path'
    vi.stubEnv('VERCEL_URL', 'deployment.vercel.app')
    const options = await authOptions(createEvent('request.example.com', 'untrusted.example.com'))
    expect(options.baseURL).toBe('https://explicit.example.com')
  })

  it('rejects an invalid configured URL instead of falling back', async () => {
    runtimeConfig.public.siteUrl = 'not-a-url'
    vi.stubEnv('VERCEL_URL', 'deployment.vercel.app')
    await expect(authOptions(createEvent())).rejects.toThrow('Invalid siteUrl')
  })

  it.each([
    ['VERCEL_URL', 'deployment.vercel.app', 'https://deployment.vercel.app'],
    ['CF_PAGES_URL', 'https://deployment.pages.dev', 'https://deployment.pages.dev'],
    ['URL', 'https://deployment.netlify.app', 'https://deployment.netlify.app'],
  ])('uses %s when configuration and a dev request are absent', async (name, value, expected) => {
    vi.stubEnv(name, value)
    expect((await authOptions()).baseURL).toBe(expected)
  })

  it('ignores a non-string siteUrl', async () => {
    runtimeConfig.public.siteUrl = 123
    vi.stubEnv('VERCEL_URL', 'deployment.vercel.app')
    expect((await authOptions()).baseURL).toBe('https://deployment.vercel.app')
  })
})

describe.runIf(!import.meta.dev)('serverAuth production origins', () => {
  it.each([undefined, 'untrusted.example.com'])('rejects request inference with forwarded host %s', async (forwardedHost) => {
    await expect(authOptions(createEvent('request.example.com', forwardedHost))).rejects.toThrow('siteUrl required in production')
  })

  it('rejects listener and dev proxy addresses as production configuration', async () => {
    vi.stubEnv('HOST', '0.0.0.0')
    vi.stubEnv('NITRO_HOST', '127.0.0.1')
    vi.stubEnv('__NUXT_DEV__', JSON.stringify({ proxy: { url: 'http://localhost:4000' } }))
    await expect(authOptions()).rejects.toThrow('siteUrl required in production')
  })

  it.each([
    ['VERCEL_URL', 'deployment.vercel.app', 'https://deployment.vercel.app'],
    ['CF_PAGES_URL', 'https://deployment.pages.dev', 'https://deployment.pages.dev'],
    ['URL', 'https://deployment.netlify.app', 'https://deployment.netlify.app'],
  ])('preserves %s across requests with different forwarded hosts', async (name, value, expected) => {
    vi.stubEnv(name, value)
    const first = await authOptions(createEvent('request.example.com', 'first.example.com'))
    const second = await authOptions(createEvent('request.example.com', 'second.example.com'))
    expect(first.baseURL).toBe(expected)
    expect(second.baseURL).toBe(expected)
  })

  it('does not normalize an explicitly configured loopback URL', async () => {
    runtimeConfig.public.siteUrl = 'http://127.0.0.1:3000'
    expect((await authOptions()).baseURL).toBe('http://127.0.0.1:3000')
  })

  it.each([undefined, ['https://trusted.example.com'], async () => ['https://trusted.example.com']])('does not augment production trusted origins: %s', async (origins) => {
    runtimeConfig.public.siteUrl = 'https://explicit.example.com'
    createServerAuthMock.mockReturnValue({ trustedOrigins: origins })
    expect((await authOptions(createEvent())).trustedOrigins).toBe(origins)
  })
})

describe.runIf(Boolean(import.meta.dev))('serverAuth development origins', () => {
  it('prefers the current request over platform and dev proxy URLs', async () => {
    vi.stubEnv('VERCEL_URL', 'deployment.vercel.app')
    vi.stubEnv('__NUXT_DEV__', JSON.stringify({ proxy: { url: 'http://localhost:4000' } }))
    expect((await authOptions(createEvent('lan-host.local:3000'))).baseURL).toBe('http://lan-host.local:3000')
  })

  it('supports forwarded hosts and protocols for development proxies', async () => {
    expect((await authOptions(createEvent('localhost:3000', 'dev.example.com'))).baseURL).toBe('https://dev.example.com')
  })

  it('resolves separate development requests independently', async () => {
    expect((await authOptions(createEvent('first.local:3000'))).baseURL).toBe('http://first.local:3000')
    expect((await authOptions(createEvent('second.local:3000'))).baseURL).toBe('http://second.local:3000')
  })

  it.each(['127.0.0.1:3000', '[::1]:3000'])('normalizes loopback request %s', async (host) => {
    expect((await authOptions(createEvent(host))).baseURL).toBe('http://localhost:3000')
  })

  it('normalizes an explicit loopback URL', async () => {
    runtimeConfig.public.siteUrl = 'http://127.0.0.1:3000'
    expect((await authOptions()).baseURL).toBe('http://localhost:3000')
  })

  it.each([
    [{ NITRO_HOST: 'localhost', NITRO_PORT: '4000' }, 'http://localhost:4000'],
    [{ HOST: 'localhost' }, 'http://localhost:3000'],
    [{ HOST: 'localhost', NITRO_SSL_CERT: 'cert', NITRO_SSL_KEY: 'key' }, 'https://localhost:3000'],
    [{ __NUXT_DEV__: JSON.stringify({ proxy: { url: 'http://localhost:4001' } }) }, 'http://localhost:4001'],
    [{ NUXT_VITE_NODE_OPTIONS: JSON.stringify({ baseURL: 'http://localhost:4002/__nuxt_vite_node__' }) }, 'http://localhost:4002'],
    [{ __NUXT_DEV__: 'invalid-json', HOST: 'localhost' }, 'http://localhost:3000'],
    [{}, 'http://localhost:3000'],
  ])('resolves development environment %j', async (env, expected) => {
    for (const [name, value] of Object.entries(env))
      vi.stubEnv(name, value)
    expect((await authOptions()).baseURL).toBe(expected)
  })

  it('adds the detected localhost and loopback origins', async () => {
    vi.stubEnv('__NUXT_DEV__', JSON.stringify({ proxy: { url: 'http://127.0.0.1:4123' } }))
    expect(await trustedOrigins()).toEqual(['http://localhost:4123', 'http://127.0.0.1:4123'])
  })

  it('preserves and deduplicates configured trusted origins', async () => {
    runtimeConfig.public.siteUrl = 'https://explicit.example.com'
    vi.stubEnv('NITRO_HOST', 'localhost')
    vi.stubEnv('NITRO_PORT', '3001')
    createServerAuthMock.mockReturnValue({ trustedOrigins: ['https://explicit.example.com', 'http://localhost:3001'] })
    expect(await trustedOrigins()).toEqual(['https://explicit.example.com', 'http://localhost:3001'])
  })

  it('passes the request to async trusted origins and appends dev origins', async () => {
    vi.stubEnv('NITRO_HOST', '192.168.1.50')
    vi.stubEnv('NITRO_PORT', '3002')
    const origins = vi.fn(async () => ['https://trusted.example.com', undefined, null, 'http://localhost:3002'])
    createServerAuthMock.mockReturnValue({ trustedOrigins: origins })
    const request = new Request('http://192.168.1.20:3002/api/auth/sign-in')
    expect(await trustedOrigins(request)).toEqual([
      'https://trusted.example.com',
      'http://localhost:3002',
      'http://192.168.1.50:3002',
      'http://192.168.1.20:3002',
    ])
    expect(origins).toHaveBeenCalledExactlyOnceWith(request)
  })

  it('augments trusted origins when siteUrl is inferred', async () => {
    createServerAuthMock.mockReturnValue({ trustedOrigins: ['https://trusted.example.com'] })
    expect(await trustedOrigins()).toEqual(['https://trusted.example.com', 'http://localhost:3000'])
  })

  it('uses each callback request origin without retaining the previous origin', async () => {
    const options = await authOptions()
    if (typeof options.trustedOrigins !== 'function')
      throw new TypeError('Expected development trustedOrigins callback')
    const loopback = new Request('http://127.0.0.1:3000/api/auth/sign-in')
    const localhost = new Request('http://localhost:3000/api/auth/sign-in')
    expect(await options.trustedOrigins(loopback)).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000'])
    expect(await options.trustedOrigins(localhost)).toEqual(['http://localhost:3000'])
  })
})
