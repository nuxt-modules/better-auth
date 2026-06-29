import { withoutProtocol } from 'ufo'
import { describe, expect, it, vi } from 'vitest'

function normalizeLoopbackOrigin(origin: string, isDev: boolean): string {
  if (!isDev)
    return origin

  const parsed = new URL(origin)
  if (parsed.hostname === '127.0.0.1' || parsed.hostname === '::1' || parsed.hostname === '[::1]') {
    parsed.hostname = 'localhost'
    return parsed.origin
  }

  return origin
}

function validateURL(url: string, isDev: boolean): string {
  try {
    return normalizeLoopbackOrigin(new URL(url).origin, isDev)
  }
  catch {
    throw new Error(`Invalid siteUrl: "${url}". Must be a valid URL.`)
  }
}

interface GetNitroOriginOptions {
  isDev: boolean
  isPrerender: boolean
  env: Partial<Record<string, string>>
  requestHost?: string
  requestProtocol?: string
}

function resolveConfiguredSiteUrl(config: { public: { siteUrl?: unknown } }, isDev: boolean): string | undefined {
  if (typeof config.public.siteUrl !== 'string' || !config.public.siteUrl)
    return undefined

  return validateURL(config.public.siteUrl, isDev)
}

function resolveEventOrigin(options: GetNitroOriginOptions): string | undefined {
  if (!options.requestHost || !options.requestProtocol)
    return undefined

  try {
    return validateURL(`${options.requestProtocol}://${options.requestHost}`, options.isDev)
  }
  catch {
    return undefined
  }
}

function getNitroOrigin(options: GetNitroOriginOptions): string | undefined {
  const { isDev, isPrerender, env } = options
  const cert = env.NITRO_SSL_CERT
  const key = env.NITRO_SSL_KEY
  let host: string | undefined = env.NITRO_HOST || env.HOST
  let port: string | undefined
  if (isDev)
    port = env.NITRO_PORT || env.PORT || '3000'
  let protocol = (cert && key) || !isDev ? 'https' : 'http'

  try {
    if ((isDev || isPrerender) && env.__NUXT_DEV__) {
      const origin = JSON.parse(env.__NUXT_DEV__).proxy.url
      host = withoutProtocol(origin)
      protocol = origin.includes('https') ? 'https' : 'http'
    }
    else if ((isDev || isPrerender) && env.NUXT_VITE_NODE_OPTIONS) {
      const origin = JSON.parse(env.NUXT_VITE_NODE_OPTIONS).baseURL.replace('/__nuxt_vite_node__', '')
      host = withoutProtocol(origin)
      protocol = origin.includes('https') ? 'https' : 'http'
    }
  }
  catch {
    // JSON parse failed, continue with env fallbacks
  }

  if (!host)
    return undefined

  if (host.startsWith('[') && host.includes(']:')) {
    const lastBracketColon = host.lastIndexOf(']:')
    const extractedPort = host.slice(lastBracketColon + 2)
    host = host.slice(0, lastBracketColon + 1)
    if (extractedPort)
      port = extractedPort
  }
  else if (host.includes(':') && !host.startsWith('[')) {
    const hostParts = host.split(':')
    port = hostParts.pop()
    host = hostParts.join(':')
  }

  const portSuffix = port ? `:${port}` : ''
  return `${protocol}://${host}${portSuffix}`
}

function resolveEnvironmentOrigin(options: GetNitroOriginOptions): string | undefined {
  const nitroOrigin = getNitroOrigin(options)
  if (nitroOrigin)
    return validateURL(nitroOrigin, options.isDev)

  if (options.env.VERCEL_URL)
    return validateURL(`https://${options.env.VERCEL_URL}`, options.isDev)
  if (options.env.CF_PAGES_URL)
    return validateURL(`https://${options.env.CF_PAGES_URL}`, options.isDev)
  if (options.env.URL)
    return validateURL(options.env.URL.startsWith('http') ? options.env.URL : `https://${options.env.URL}`, options.isDev)

  return undefined
}

function resolveDevFallback(options: GetNitroOriginOptions): string | undefined {
  if (options.isDev)
    return 'http://localhost:3000'

  return undefined
}

function getBaseURL(config: { public: { siteUrl?: unknown } }, options: GetNitroOriginOptions): string {
  const configuredSiteUrl = resolveConfiguredSiteUrl(config, options.isDev)
  if (configuredSiteUrl)
    return configuredSiteUrl

  const eventOrigin = resolveEventOrigin(options)
  if (eventOrigin)
    return eventOrigin

  const environmentOrigin = resolveEnvironmentOrigin(options)
  if (environmentOrigin)
    return environmentOrigin

  const devFallback = resolveDevFallback(options)
  if (devFallback)
    return devFallback

  throw new Error('siteUrl required. Set NUXT_PUBLIC_SITE_URL.')
}

type TrustedOrigins
  = | string[]
    | ((request?: Request) => (string | undefined | null)[] | Promise<(string | undefined | null)[]>)
    | undefined

function dedupeOrigins(origins: readonly string[]): string[] {
  return [...new Set(origins)]
}

function getDevTrustedOrigins(options: GetNitroOriginOptions): string[] {
  const fallbackOrigin = 'http://localhost:3000'
  const nitroOrigin = getNitroOrigin(options)
  if (!nitroOrigin)
    return [fallbackOrigin]

  try {
    const parsed = new URL(nitroOrigin)
    const protocol = parsed.protocol === 'https:' ? 'https' : 'http'
    const port = parsed.port || '3000'
    const localhostOrigin = `${protocol}://localhost:${port}`
    return dedupeOrigins([localhostOrigin, parsed.origin])
  }
  catch {
    return [fallbackOrigin]
  }
}

function getRequestOrigin(request?: Request): string | undefined {
  if (!request)
    return undefined

  try {
    return new URL(request.url).origin
  }
  catch {
    return undefined
  }
}

function withDevTrustedOrigins(
  trustedOrigins: TrustedOrigins,
  options: GetNitroOriginOptions,
): TrustedOrigins {
  if (!options.isDev)
    return trustedOrigins

  const devOrigins = getDevTrustedOrigins(options)
  const mergeOrigins = (origins: readonly (string | null | undefined)[], request?: Request): string[] => {
    const validOrigins = origins.filter((origin): origin is string => typeof origin === 'string')
    const requestOrigin = getRequestOrigin(request)
    return dedupeOrigins(requestOrigin ? [...validOrigins, ...devOrigins, requestOrigin] : [...validOrigins, ...devOrigins])
  }

  if (typeof trustedOrigins === 'function') {
    return async (request?: Request) => {
      const resolvedOrigins = await trustedOrigins(request)
      return mergeOrigins(resolvedOrigins, request)
    }
  }

  if (Array.isArray(trustedOrigins)) {
    const baseOrigins = mergeOrigins(trustedOrigins)
    return async (request?: Request) => {
      return mergeOrigins(baseOrigins, request)
    }
  }

  return async (request?: Request) => {
    return mergeOrigins([], request)
  }
}

describe('getBaseURL', () => {
  it('explicit config takes priority', () => {
    expect(getBaseURL({ public: { siteUrl: 'https://explicit.com' } }, { isDev: false, isPrerender: false, env: {}, requestHost: 'request.com', requestProtocol: 'https' })).toBe('https://explicit.com')
  })

  it('requestHost used when no explicit config', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: {}, requestHost: 'myapp.com', requestProtocol: 'https' })).toBe('https://myapp.com')
  })

  it('requestHost takes priority over dev proxy env when siteUrl is unset', () => {
    const nuxtDev = JSON.stringify({ proxy: { url: 'http://localhost:3000' } })
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { __NUXT_DEV__: nuxtDev }, requestHost: 'lan-host.local:3000', requestProtocol: 'http' })).toBe('http://lan-host.local:3000')
  })

  it('requestHost takes priority over platform env vars when siteUrl is unset', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: { VERCEL_URL: 'my-app.vercel.app' }, requestHost: 'request.com', requestProtocol: 'https' })).toBe('https://request.com')
  })

  it('uses NITRO_HOST/PORT in dev mode', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { NITRO_HOST: 'localhost', NITRO_PORT: '3000' } })).toBe('http://localhost:3000')
  })

  it('dev mode defaults to port 3000', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { HOST: 'localhost' } })).toBe('http://localhost:3000')
  })

  it('uses https with SSL certs', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { HOST: 'localhost', NITRO_SSL_CERT: 'cert', NITRO_SSL_KEY: 'key' } })).toBe('https://localhost:3000')
  })

  it('parses __NUXT_DEV__ in dev mode', () => {
    const nuxtDev = JSON.stringify({ proxy: { url: 'http://localhost:3000' } })
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { __NUXT_DEV__: nuxtDev } })).toBe('http://localhost:3000')
  })

  it('handles malformed __NUXT_DEV__ gracefully', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: { __NUXT_DEV__: 'not-json', HOST: 'localhost' } })).toBe('http://localhost:3000')
  })

  it('falls back to VERCEL_URL when no host detected', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: { VERCEL_URL: 'my-app.vercel.app' } })).toBe('https://my-app.vercel.app')
  })

  it('falls back to CF_PAGES_URL when no host detected', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: { CF_PAGES_URL: 'my-app.pages.dev' } })).toBe('https://my-app.pages.dev')
  })

  it('falls back to URL env var', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: { URL: 'https://my-app.netlify.app' } })).toBe('https://my-app.netlify.app')
  })

  it('dev fallback to localhost when no host', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: {} })).toBe('http://localhost:3000')
  })

  it('throws in production without config', () => {
    expect(() => getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: {} })).toThrow('siteUrl required')
  })

  it('ignores non-string siteUrl', () => {
    expect(getBaseURL({ public: { siteUrl: 123 } }, { isDev: true, isPrerender: false, env: { HOST: 'localhost' } })).toBe('http://localhost:3000')
  })

  it('throws on invalid URL format', () => {
    expect(() => getBaseURL({ public: { siteUrl: 'not-a-url' } }, { isDev: false, isPrerender: false, env: {} })).toThrow('Invalid siteUrl')
  })

  it('handles IPv6 addresses', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: {}, requestHost: '[::1]:3000', requestProtocol: 'http' })).toBe('http://[::1]:3000')
  })

  it('normalizes 127.0.0.1 to localhost in dev', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: {}, requestHost: '127.0.0.1:3000', requestProtocol: 'http' })).toBe('http://localhost:3000')
  })

  it('normalizes ::1 to localhost in dev', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: {}, requestHost: '[::1]:3000', requestProtocol: 'http' })).toBe('http://localhost:3000')
  })

  it('normalizes explicit loopback siteUrl in dev', () => {
    expect(getBaseURL({ public: { siteUrl: 'http://127.0.0.1:3000' } }, { isDev: true, isPrerender: false, env: {} })).toBe('http://localhost:3000')
  })

  it('does not normalize loopback hosts in production', () => {
    expect(getBaseURL({ public: {} }, { isDev: false, isPrerender: false, env: {}, requestHost: '127.0.0.1:3000', requestProtocol: 'http' })).toBe('http://127.0.0.1:3000')
  })

  it('does not alter non-loopback hosts in dev', () => {
    expect(getBaseURL({ public: {} }, { isDev: true, isPrerender: false, env: {}, requestHost: 'myapp.local:3000', requestProtocol: 'http' })).toBe('http://myapp.local:3000')
  })
})

describe('withDevTrustedOrigins', () => {
  it('adds detected localhost origin with detected port', async () => {
    const trustedOrigins = withDevTrustedOrigins(undefined, {
      isDev: true,
      isPrerender: false,
      env: {
        __NUXT_DEV__: JSON.stringify({ proxy: { url: 'http://127.0.0.1:4123' } }),
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')
    const resolvedOrigins = await trustedOrigins()
    expect(resolvedOrigins).toEqual(['http://localhost:4123', 'http://127.0.0.1:4123'])
  })

  it('preserves and deduplicates configured trustedOrigins arrays', async () => {
    const trustedOrigins = withDevTrustedOrigins(['https://foo.workers.dev', 'http://localhost:3001'], {
      isDev: true,
      isPrerender: false,
      env: {
        NITRO_HOST: 'localhost',
        NITRO_PORT: '3001',
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')
    const resolvedOrigins = await trustedOrigins()
    expect(resolvedOrigins).toEqual(['https://foo.workers.dev', 'http://localhost:3001'])
  })

  it('wraps trustedOrigins functions and appends dev origins', async () => {
    const trustedOriginsFn = vi.fn(async () => ['https://foo.workers.dev', undefined, null, 'http://localhost:3002'])
    const trustedOrigins = withDevTrustedOrigins(trustedOriginsFn, {
      isDev: true,
      isPrerender: false,
      env: {
        NITRO_HOST: '192.168.1.50',
        NITRO_PORT: '3002',
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')
    const resolvedOrigins = await trustedOrigins()

    expect(trustedOriginsFn).toHaveBeenCalledTimes(1)
    expect(resolvedOrigins).toEqual(['https://foo.workers.dev', 'http://localhost:3002', 'http://192.168.1.50:3002'])
  })

  it('adds request origin for --host style access', async () => {
    const trustedOrigins = withDevTrustedOrigins(undefined, {
      isDev: true,
      isPrerender: false,
      env: {
        NITRO_HOST: '0.0.0.0',
        NITRO_PORT: '3000',
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')
    const request = new Request('http://192.168.1.20:3000/api/auth/sign-in')
    const resolvedOrigins = await trustedOrigins(request)

    expect(resolvedOrigins).toContain('http://localhost:3000')
    expect(resolvedOrigins).toContain('http://192.168.1.20:3000')
  })

  it('does not augment in production mode', () => {
    const trustedOrigins = withDevTrustedOrigins(undefined, {
      isDev: false,
      isPrerender: false,
      env: {
        NITRO_HOST: 'localhost',
        NITRO_PORT: '3000',
      },
    })

    expect(trustedOrigins).toBeUndefined()
  })

  it('augments even when siteUrl is inferred', async () => {
    const trustedOrigins = withDevTrustedOrigins(['https://foo.workers.dev'], {
      isDev: true,
      isPrerender: false,
      env: {
        NITRO_HOST: 'localhost',
        NITRO_PORT: '3000',
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')

    const resolvedOrigins = await trustedOrigins()
    expect(resolvedOrigins).toEqual(['https://foo.workers.dev', 'http://localhost:3000'])
  })

  it('adds loopback request origins regardless of alias order', async () => {
    const trustedOrigins = withDevTrustedOrigins(undefined, {
      isDev: true,
      isPrerender: false,
      env: {
        NITRO_HOST: 'localhost',
        NITRO_PORT: '3000',
      },
    })

    expect(typeof trustedOrigins).toBe('function')
    if (typeof trustedOrigins !== 'function')
      throw new Error('trustedOrigins should be a function')

    const localhostRequestOrigins = await trustedOrigins(new Request('http://localhost:3000/api/auth/sign-in'))
    const loopbackRequestOrigins = await trustedOrigins(new Request('http://127.0.0.1:3000/api/auth/sign-in'))

    expect(localhostRequestOrigins).toEqual(['http://localhost:3000'])
    expect(loopbackRequestOrigins).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000'])
  })
})
