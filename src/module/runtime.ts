import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import type { AuthPrivateRuntimeConfig, AuthRuntimeConfig, BetterAuthModuleOptions, ModuleDatabaseProviderId } from '../runtime/config'
import type { NuxtHubOptions } from './hub'
import { defu } from 'defu'

interface SetupRuntimeConfigInput {
  nuxt: Nuxt
  options: BetterAuthModuleOptions
  clientOnly: boolean
  databaseProvider: ModuleDatabaseProviderId
  hasNuxtHub: boolean
  hub?: NuxtHubOptions
  consola: ConsolaInstance
}

function resolveSecondaryStorage(input: SetupRuntimeConfigInput): { useHubKV: boolean, secondaryStorageEnabled: boolean } {
  const { options, clientOnly, hasNuxtHub, hub } = input

  const opt = options.hubSecondaryStorage ?? false
  const useHubKV = opt === true
  const secondaryStorageEnabled = opt === true || opt === 'custom'

  if (secondaryStorageEnabled && clientOnly) {
    throw new Error('[nuxt-better-auth] hubSecondaryStorage is not available in clientOnly mode. Either disable clientOnly or remove auth.hubSecondaryStorage.')
  }
  if (useHubKV && (!hasNuxtHub || !hub?.kv)) {
    throw new Error('[nuxt-better-auth] hubSecondaryStorage: true requires @nuxthub/core with hub.kv: true. Either add hub.kv: true to your nuxt.config or remove auth.hubSecondaryStorage.')
  }

  return { useHubKV, secondaryStorageEnabled }
}

export function setupRuntimeConfig(input: SetupRuntimeConfigInput): { useHubKV: boolean, secondaryStorageEnabled: boolean } {
  const { nuxt, options, clientOnly, databaseProvider, consola } = input
  const { useHubKV, secondaryStorageEnabled } = resolveSecondaryStorage(input)

  nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}
  const configuredSiteUrl = nuxt.options.runtimeConfig.public.siteUrl as string | undefined
  if (!configuredSiteUrl && process.env.NUXT_PUBLIC_SITE_URL)
    nuxt.options.runtimeConfig.public.siteUrl = process.env.NUXT_PUBLIC_SITE_URL

  nuxt.options.runtimeConfig.public.auth = defu(nuxt.options.runtimeConfig.public.auth as Record<string, unknown>, {
    redirects: {
      login: options.redirects?.login ?? '/login',
      guest: options.redirects?.guest ?? '/',
      authenticated: options.redirects?.authenticated,
      logout: options.redirects?.logout,
    },
    preserveRedirect: options.preserveRedirect ?? true,
    redirectQueryKey: options.redirectQueryKey ?? 'redirect',
    useDatabase: databaseProvider !== 'none',
    databaseProvider,
    clientOnly,
    session: {
      skipHydratedSsrGetSession: options.session?.skipHydratedSsrGetSession ?? false,
    },
  }) as AuthRuntimeConfig

  if (clientOnly) {
    const siteUrl = nuxt.options.runtimeConfig.public.siteUrl as string | undefined
    if (!siteUrl)
      consola.warn('clientOnly mode: set runtimeConfig.public.siteUrl (or NUXT_PUBLIC_SITE_URL) to your frontend URL')
    consola.info('clientOnly mode enabled - server utilities (serverAuth, getAppSession, getUserSession, requireUserSession) are not available')
    return { useHubKV, secondaryStorageEnabled }
  }

  const currentSecret = nuxt.options.runtimeConfig.betterAuthSecret as string | undefined
  nuxt.options.runtimeConfig.betterAuthSecret = currentSecret || process.env.BETTER_AUTH_SECRET || ''

  const betterAuthSecret = nuxt.options.runtimeConfig.betterAuthSecret as string
  if (!nuxt.options.dev && !nuxt.options._prepare && !betterAuthSecret) {
    throw new Error('[nuxt-better-auth] BETTER_AUTH_SECRET is required in production. Set BETTER_AUTH_SECRET or NUXT_BETTER_AUTH_SECRET environment variable.')
  }
  if (betterAuthSecret && betterAuthSecret.length < 32) {
    throw new Error('[nuxt-better-auth] BETTER_AUTH_SECRET must be at least 32 characters for security')
  }

  nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth as Record<string, unknown>, {
    hubSecondaryStorage: options.hubSecondaryStorage ?? false,
  }) as AuthPrivateRuntimeConfig

  return { useHubKV, secondaryStorageEnabled }
}
