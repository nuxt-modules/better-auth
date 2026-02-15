import type { Auth, BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'h3'
import { createDatabase, db } from '#auth/database'
import { createSecondaryStorage } from '#auth/secondary-storage'
import createServerAuth from '#auth/server'
import { betterAuth } from 'better-auth'
import { getRequestHost, getRequestProtocol } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { withoutProtocol } from 'ufo'

type AuthInstance = Auth<ReturnType<typeof createServerAuth>>

const _authCache = new Map<string, AuthInstance>()
let _baseURLInferenceLogged = false

function normalizeLoopbackOrigin(origin: string): string {
  if (!import.meta.dev)
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

function logInferredBaseURL(baseURL: string, source: string): void {
  if (!import.meta.dev || _baseURLInferenceLogged)
    return

  _baseURLInferenceLogged = true
  console.warn(`[nuxt-better-auth] Using inferred baseURL "${baseURL}" from ${source}. Set runtimeConfig.public.siteUrl for deterministic OAuth callbacks.`)
}

function validateURL(url: string): string {
  try {
    return normalizeLoopbackOrigin(new URL(url).origin)
  }
  catch {
    throw new Error(`Invalid siteUrl: "${url}". Must be a valid URL.`)
  }
}

function resolveConfiguredSiteUrl(config: ReturnType<typeof useRuntimeConfig>): string | undefined {
  if (typeof config.public.siteUrl !== 'string' || !config.public.siteUrl)
    return undefined

  return validateURL(config.public.siteUrl)
}

function resolveEventOrigin(event?: H3Event): string | undefined {
  if (!event)
    return undefined

  const host = getRequestHost(event, { xForwardedHost: true })
  const protocol = getRequestProtocol(event, { xForwardedProto: true })
  if (!host || !protocol)
    return undefined

  try {
    return validateURL(`${protocol}://${host}`)
  }
  catch {
    return undefined
  }
}

/**
 * Get the Nitro origin URL.
 * Adapted from nuxt-site-config by @harlan-zw
 * @see https://github.com/harlan-zw/nuxt-site-config/blob/main/packages/kit/src/util.ts
 */
function getNitroOrigin(): string | undefined {
  const cert = process.env.NITRO_SSL_CERT
  const key = process.env.NITRO_SSL_KEY
  let host: string | undefined = process.env.NITRO_HOST || process.env.HOST
  let port: string | undefined
  if (import.meta.dev)
    port = process.env.NITRO_PORT || process.env.PORT || '3000'
  let protocol = (cert && key) || !import.meta.dev ? 'https' : 'http'

  try {
    if ((import.meta.dev || import.meta.prerender) && process.env.__NUXT_DEV__) {
      const origin = JSON.parse(process.env.__NUXT_DEV__).proxy.url
      host = withoutProtocol(origin)
      protocol = origin.includes('https') ? 'https' : 'http'
    }
    else if ((import.meta.dev || import.meta.prerender) && process.env.NUXT_VITE_NODE_OPTIONS) {
      const origin = JSON.parse(process.env.NUXT_VITE_NODE_OPTIONS).baseURL.replace('/__nuxt_vite_node__', '')
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

function resolveEnvironmentOrigin(): { origin: string, source: string } | undefined {
  const nitroOrigin = getNitroOrigin()
  if (nitroOrigin)
    return { origin: validateURL(nitroOrigin), source: 'Nitro environment detection' }

  if (process.env.VERCEL_URL)
    return { origin: validateURL(`https://${process.env.VERCEL_URL}`), source: 'VERCEL_URL' }

  if (process.env.CF_PAGES_URL)
    return { origin: validateURL(`https://${process.env.CF_PAGES_URL}`), source: 'CF_PAGES_URL' }

  if (process.env.URL)
    return { origin: validateURL(process.env.URL.startsWith('http') ? process.env.URL : `https://${process.env.URL}`), source: 'URL' }

  return undefined
}

function resolveDevFallback(): { origin: string, source: string } | undefined {
  if (!import.meta.dev)
    return undefined

  return { origin: 'http://localhost:3000', source: 'development fallback' }
}

function getBaseURL(event?: H3Event): string {
  const config = useRuntimeConfig()
  const configuredSiteUrl = resolveConfiguredSiteUrl(config)
  if (configuredSiteUrl)
    return configuredSiteUrl

  const eventOrigin = resolveEventOrigin(event)
  if (eventOrigin) {
    logInferredBaseURL(eventOrigin, 'request origin')
    return eventOrigin
  }

  const environmentOrigin = resolveEnvironmentOrigin()
  if (environmentOrigin) {
    logInferredBaseURL(environmentOrigin.origin, environmentOrigin.source)
    return environmentOrigin.origin
  }

  const devFallback = resolveDevFallback()
  if (devFallback) {
    logInferredBaseURL(devFallback.origin, devFallback.source)
    return devFallback.origin
  }

  throw new Error('siteUrl required. Set NUXT_PUBLIC_SITE_URL.')
}

function dedupeOrigins(origins: readonly string[]): string[] {
  return [...new Set(origins)]
}

function getDevTrustedOrigins(): string[] {
  const fallbackOrigin = 'http://localhost:3000'
  const nitroOrigin = getNitroOrigin()
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
  trustedOrigins: BetterAuthOptions['trustedOrigins'] | undefined,
  hasExplicitSiteUrl: boolean,
): BetterAuthOptions['trustedOrigins'] | undefined {
  if (!import.meta.dev || !hasExplicitSiteUrl)
    return trustedOrigins

  const devOrigins = getDevTrustedOrigins()
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

/** Returns Better Auth instance. Caches per resolved host (or single instance when siteUrl is explicit). */
export function serverAuth(event?: H3Event): AuthInstance {
  const runtimeConfig = useRuntimeConfig()
  const siteUrl = getBaseURL(event)
  const hasExplicitSiteUrl = runtimeConfig.public.siteUrl && typeof runtimeConfig.public.siteUrl === 'string'
  const cacheKey = hasExplicitSiteUrl ? '__explicit__' : siteUrl

  const cached = _authCache.get(cacheKey)
  if (cached)
    return cached

  const database = createDatabase()
  const userConfig = createServerAuth({ runtimeConfig, db })
  const trustedOrigins = withDevTrustedOrigins(userConfig.trustedOrigins, Boolean(hasExplicitSiteUrl))

  const auth = betterAuth({
    ...userConfig,
    ...(database && { database }),
    secondaryStorage: createSecondaryStorage(),
    secret: runtimeConfig.betterAuthSecret,
    baseURL: siteUrl,
    trustedOrigins,
  })

  _authCache.set(cacheKey, auth)
  return auth
}
