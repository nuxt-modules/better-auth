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

function resolveSecondaryStorage(input: SetupRuntimeConfigInput): { secondaryStorageEnabled: boolean } {
  const { options, clientOnly } = input

  const opt = options.hubSecondaryStorage ?? false
  if (opt === true) {
    throw new Error('[nuxt-better-auth] hubSecondaryStorage: true is not supported with Better Auth 1.7 because NuxtHub KV cannot provide the required atomic getAndDelete and increment operations. Set auth.hubSecondaryStorage to false, or use "custom" with an atomic secondaryStorage in defineServerAuth().')
  }

  const secondaryStorageEnabled = opt === 'custom'

  if (secondaryStorageEnabled && clientOnly) {
    throw new Error('[nuxt-better-auth] hubSecondaryStorage is not available in clientOnly mode. Either disable clientOnly or remove auth.hubSecondaryStorage.')
  }

  return { secondaryStorageEnabled }
}

export function setupRuntimeConfig(input: SetupRuntimeConfigInput): { secondaryStorageEnabled: boolean } {
  const { nuxt, options, clientOnly, databaseProvider, consola } = input
  const { secondaryStorageEnabled } = resolveSecondaryStorage(input)

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

  nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth as Record<string, unknown>, {
    hubSecondaryStorage: options.hubSecondaryStorage ?? false,
  }) as AuthPrivateRuntimeConfig

  return { secondaryStorageEnabled }
}
