import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'nitro/h3'
import { getRequestHost, getRequestProtocol } from 'nitro/h3'
import { withoutProtocol } from 'ufo'

export interface RuntimeConfigLike {
  public?: {
    siteUrl?: unknown
  }
}

export interface BaseURLOptions {
  env?: Partial<Record<string, string>>
  isDev?: boolean
  isPrerender?: boolean
}

function resolveOptions(options: BaseURLOptions = {}): Required<BaseURLOptions> {
  return {
    env: options.env ?? process.env,
    isDev: options.isDev ?? Boolean(import.meta.dev),
    isPrerender: options.isPrerender ?? Boolean(import.meta.prerender),
  }
}

export function normalizeLoopbackOrigin(origin: string, isDev: boolean): string {
  if (!isDev)
    return origin

  try {
    const url = new URL(origin)
    if (url.hostname === '127.0.0.1' || url.hostname === '::1' || url.hostname === '[::1]') {
      url.hostname = 'localhost'
      return url.origin
    }
  }
  catch {
    // Invalid URL is handled by validateURL.
  }

  return origin
}

export function validateURL(url: string, isDev: boolean): string {
  try {
    return normalizeLoopbackOrigin(new URL(url).origin, isDev)
  }
  catch {
    throw new Error(`Invalid siteUrl: "${url}". Must be a valid URL.`)
  }
}

export function resolveConfiguredSiteUrl(config: RuntimeConfigLike, options: BaseURLOptions = {}): string | undefined {
  if (typeof config.public?.siteUrl !== 'string' || !config.public.siteUrl)
    return undefined

  return validateURL(config.public.siteUrl, resolveOptions(options).isDev)
}

export function resolveEventOrigin(event?: H3Event, options: BaseURLOptions = {}): string | undefined {
  if (!event)
    return undefined

  const host = getRequestHost(event, { xForwardedHost: true })
  const protocol = getRequestProtocol(event, { xForwardedProto: true })
  if (!host || !protocol)
    return undefined

  try {
    return validateURL(`${protocol}://${host}`, resolveOptions(options).isDev)
  }
  catch {
    return undefined
  }
}

export function getNitroOrigin(options: BaseURLOptions = {}): string | undefined {
  const resolved = resolveOptions(options)
  const { env, isDev, isPrerender } = resolved
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
    // JSON parse failed, continue with env fallbacks.
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

export function resolveEnvironmentOrigin(options: BaseURLOptions = {}): { origin: string, source: string } | undefined {
  const resolved = resolveOptions(options)
  const nitroOrigin = getNitroOrigin(resolved)
  if (nitroOrigin)
    return { origin: validateURL(nitroOrigin, resolved.isDev), source: 'Nitro environment detection' }

  if (resolved.env.VERCEL_URL)
    return { origin: validateURL(`https://${resolved.env.VERCEL_URL}`, resolved.isDev), source: 'VERCEL_URL' }

  if (resolved.env.CF_PAGES_URL)
    return { origin: validateURL(`https://${resolved.env.CF_PAGES_URL}`, resolved.isDev), source: 'CF_PAGES_URL' }

  if (resolved.env.URL) {
    const rawUrl = resolved.env.URL
    return { origin: validateURL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`, resolved.isDev), source: 'URL' }
  }

  return undefined
}

export function resolveDevFallback(options: BaseURLOptions = {}): { origin: string, source: string } | undefined {
  if (!resolveOptions(options).isDev)
    return undefined

  return { origin: 'http://localhost:3000', source: 'development fallback' }
}

export function getBaseURL(config: RuntimeConfigLike, event?: H3Event, options: BaseURLOptions = {}): string {
  const configuredSiteUrl = resolveConfiguredSiteUrl(config, options)
  if (configuredSiteUrl)
    return configuredSiteUrl

  const eventOrigin = resolveEventOrigin(event, options)
  if (eventOrigin)
    return eventOrigin

  const environmentOrigin = resolveEnvironmentOrigin(options)
  if (environmentOrigin)
    return environmentOrigin.origin

  const devFallback = resolveDevFallback(options)
  if (devFallback)
    return devFallback.origin

  throw new Error('siteUrl required. Set NUXT_PUBLIC_SITE_URL.')
}

export function dedupeOrigins(origins: readonly string[]): string[] {
  return [...new Set(origins)]
}

export function getDevTrustedOrigins(options: BaseURLOptions = {}): string[] {
  const fallbackOrigin = 'http://localhost:3000'
  const nitroOrigin = getNitroOrigin(options)
  if (!nitroOrigin)
    return [fallbackOrigin]

  try {
    const url = new URL(nitroOrigin)
    const protocol = url.protocol === 'https:' ? 'https' : 'http'
    const port = url.port || '3000'
    const localhostOrigin = `${protocol}://localhost:${port}`
    return dedupeOrigins([localhostOrigin, url.origin])
  }
  catch {
    return [fallbackOrigin]
  }
}

export function getRequestOrigin(request?: Request): string | undefined {
  if (!request)
    return undefined

  try {
    return new URL(request.url).origin
  }
  catch {
    return undefined
  }
}

export function withDevTrustedOrigins(
  trustedOrigins: BetterAuthOptions['trustedOrigins'] | undefined,
  options: BaseURLOptions & { hasExplicitSiteUrl: boolean },
): BetterAuthOptions['trustedOrigins'] | undefined {
  const resolved = resolveOptions(options)
  if (!resolved.isDev || !options.hasExplicitSiteUrl)
    return trustedOrigins

  const devOrigins = getDevTrustedOrigins(resolved)
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
