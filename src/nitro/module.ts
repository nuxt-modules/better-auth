import type {} from './augment'
import type { Nitro } from 'nitro/types'
import type { BetterAuthNitroOptions } from './module-types'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { formatMissingNitroAuthConfigError, resolveNitroAuthConfigPath } from './config-path'
import { normalizeBetterAuthNitroOptions } from './module-types'

interface NitroHandlerLike {
  route: string
  handler: string
  method?: string
  middleware?: boolean
}

interface NitroPluginTarget {
  plugins?: string[]
}

function resolveRuntimePath(path: string): string {
  const candidates = ['.js', '.mjs', '.ts', '.mts']
  const prefixes = ['./nitro/runtime', './runtime']

  for (const prefix of prefixes) {
    for (const extension of candidates) {
      const resolved = fileURLToPath(new URL(`${prefix}${path}${extension}`, import.meta.url))
      if (existsSync(resolved))
        return resolved
    }
  }

  throw new Error(`[nuxt-better-auth] Missing runtime file for ${path}`)
}

function addNitroHandler(target: { handlers?: NitroHandlerLike[] }, handler: NitroHandlerLike): void {
  target.handlers ||= []

  const alreadyRegistered = target.handlers.some(existing =>
    existing.route === handler.route
    && existing.handler === handler.handler
    && existing.method === handler.method
    && Boolean(existing.middleware) === Boolean(handler.middleware),
  )

  if (!alreadyRegistered)
    target.handlers.push(handler)
}

function addNitroPlugin(target: NitroPluginTarget, plugin: string): void {
  target.plugins ||= []

  if (!target.plugins.includes(plugin))
    target.plugins.push(plugin)
}

function setupRuntimeConfig(nitro: Nitro): void {
  const options = nitro.options as typeof nitro.options & {
    runtimeConfig?: Record<string, any>
  }

  options.runtimeConfig ||= {}
  options.runtimeConfig.public ||= {}

  if (!options.runtimeConfig.public.siteUrl && process.env.NUXT_PUBLIC_SITE_URL)
    options.runtimeConfig.public.siteUrl = process.env.NUXT_PUBLIC_SITE_URL

  const currentSecret = typeof options.runtimeConfig.betterAuthSecret === 'string'
    ? options.runtimeConfig.betterAuthSecret
    : undefined

  options.runtimeConfig.betterAuthSecret = currentSecret || process.env.NUXT_BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || ''

  const betterAuthSecret = options.runtimeConfig.betterAuthSecret as string
  if (!options.dev && !betterAuthSecret) {
    throw new Error('[nuxt-better-auth] NUXT_BETTER_AUTH_SECRET is required in production. Set NUXT_BETTER_AUTH_SECRET or BETTER_AUTH_SECRET environment variable.')
  }
  if (betterAuthSecret && betterAuthSecret.length < 32) {
    throw new Error('[nuxt-better-auth] NUXT_BETTER_AUTH_SECRET must be at least 32 characters for security')
  }
}

export function installBetterAuthNitroModule(nitro: Nitro, rawOptions?: BetterAuthNitroOptions): void {
  const options = nitro.options as typeof nitro.options & {
    alias?: Record<string, string>
    betterAuth?: BetterAuthNitroOptions
    handlers?: NitroHandlerLike[]
  }

  const config = normalizeBetterAuthNitroOptions(rawOptions ?? options.betterAuth)
  const { resolvedPath } = resolveNitroAuthConfigPath(nitro.options.rootDir, config.config)
  if (!resolvedPath)
    throw new Error(formatMissingNitroAuthConfigError(nitro.options.rootDir, config.config))

  options.alias ||= {}
  options.alias['#better-auth-nitro/server'] = resolvedPath

  setupRuntimeConfig(nitro)
  addNitroPlugin(options, resolveRuntimePath('/plugin'))

  addNitroHandler(options, {
    route: '/api/auth/**',
    handler: resolveRuntimePath('/server/api/auth/[...all]'),
  })
}

export default {
  name: '@onmax/nuxt-better-auth/nitro',
  setup(nitro: Nitro) {
    installBetterAuthNitroModule(nitro)
  },
}
