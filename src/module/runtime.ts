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

function resolveSecondaryStorage(input: SetupRuntimeConfigInput): { hubSecondaryStorage: false | 'custom', secondaryStorageEnabled: boolean } {
  const { options, clientOnly, consola } = input

  const opt = options.hubSecondaryStorage ?? false
  if (opt === true) {
    if (clientOnly)
      consola.warn('[nuxt-better-auth] hubSecondaryStorage: true is ignored in clientOnly mode because this module does not run the auth server.')
    else
      consola.warn('[nuxt-better-auth] hubSecondaryStorage: true cannot use NuxtHub KV with Better Auth 1.7 because NuxtHub KV lacks atomic getAndDelete and increment operations. The module will ignore this option and continue without injecting secondary storage. Without a custom secondary store, sessions use the configured database when one exists and rate limiting defaults to process-local memory. Configure rateLimit.storage as "database" or provide rateLimit.customStorage for shared limits. Set auth.hubSecondaryStorage to false to silence this warning, or use "custom" with an atomic secondaryStorage in defineServerAuth(). Track NuxtHub support: https://github.com/nuxt-hub/core/pull/927')
    return { hubSecondaryStorage: false, secondaryStorageEnabled: false }
  }

  const secondaryStorageEnabled = opt === 'custom'

  if (secondaryStorageEnabled && clientOnly) {
    throw new Error('[nuxt-better-auth] hubSecondaryStorage is not available in clientOnly mode. Either disable clientOnly or remove auth.hubSecondaryStorage.')
  }

  return { hubSecondaryStorage: opt, secondaryStorageEnabled }
}

export function setupRuntimeConfig(input: SetupRuntimeConfigInput): { secondaryStorageEnabled: boolean } {
  const { nuxt, options, clientOnly, databaseProvider, consola } = input
  const { hubSecondaryStorage, secondaryStorageEnabled } = resolveSecondaryStorage(input)

  nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}
  const configuredSiteUrl = nuxt.options.runtimeConfig.public.siteUrl as string | undefined
  nuxt.options.runtimeConfig.public.siteUrl = configuredSiteUrl || process.env.NUXT_PUBLIC_SITE_URL || ''

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
  }) as AuthRuntimeConfig

  if (clientOnly) {
    const siteUrl = nuxt.options.runtimeConfig.public.siteUrl as string | undefined
    if (!siteUrl)
      consola.warn('clientOnly mode: set runtimeConfig.public.siteUrl (or NUXT_PUBLIC_SITE_URL) to your frontend URL')
    consola.info('clientOnly mode enabled - server utilities (serverAuth, getRequestSession, getUserSession, requireUserSession) are not available')
    return { secondaryStorageEnabled }
  }

  const currentSecret = nuxt.options.runtimeConfig.betterAuthSecret as string | undefined
  nuxt.options.runtimeConfig.betterAuthSecret = currentSecret || process.env.NUXT_BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || ''

  const authRuntimeConfig = defu(nuxt.options.runtimeConfig.auth as Record<string, unknown>, {
    hubSecondaryStorage,
  }) as AuthPrivateRuntimeConfig
  authRuntimeConfig.hubSecondaryStorage = hubSecondaryStorage
  nuxt.options.runtimeConfig.auth = authRuntimeConfig

  return { secondaryStorageEnabled }
}
