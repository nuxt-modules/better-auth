import type { BetterAuthOptions } from 'better-auth'
import type { H3Event } from 'nitro/h3'
import { betterAuth } from 'better-auth'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { getBaseURL, resolveConfiguredSiteUrl, withDevTrustedOrigins } from '../internal/base-url'

type CreateServerAuth = (ctx: { runtimeConfig: Record<string, unknown> }) => BetterAuthOptions
let createServerAuth: CreateServerAuth = () => {
  throw new Error('[nuxt-better-auth] Missing Nitro server auth config. Ensure @onmax/nuxt-better-auth/nitro is registered in nitro.modules.')
}

try {
  const mod = await import('#better-auth-nitro/server')
  if (typeof mod.default === 'function')
    createServerAuth = mod.default as CreateServerAuth
}
catch {
  // Allow package import outside a configured Nitro runtime.
}

type AuthOptions = ReturnType<CreateServerAuth>
type AuthInstance = ReturnType<typeof betterAuth<AuthOptions>>

const authCache = new Map<string, AuthInstance>()

function getBetterAuthSecret(runtimeConfig: Record<string, any>): string {
  if (typeof runtimeConfig.betterAuthSecret === 'string')
    return runtimeConfig.betterAuthSecret

  return ''
}

export function serverAuth(event?: H3Event): AuthInstance {
  const runtimeConfig = useRuntimeConfig() as Record<string, any>
  const siteUrl = getBaseURL(runtimeConfig, event)
  const hasExplicitSiteUrl = Boolean(resolveConfiguredSiteUrl(runtimeConfig))
  const cacheKey = hasExplicitSiteUrl ? '__explicit__' : siteUrl

  const cached = authCache.get(cacheKey)
  if (cached)
    return cached

  const userConfig = createServerAuth({ runtimeConfig }) as BetterAuthOptions
  const auth = betterAuth({
    ...userConfig,
    secret: getBetterAuthSecret(runtimeConfig),
    baseURL: siteUrl,
    trustedOrigins: withDevTrustedOrigins(userConfig.trustedOrigins, {
      hasExplicitSiteUrl,
    }),
  })

  authCache.set(cacheKey, auth)
  return auth
}
