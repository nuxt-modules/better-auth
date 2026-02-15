import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthOptions } from 'better-auth'
import type { DbDialect } from '../module/hub'
import type { BetterAuthModuleOptions } from '../runtime/config'

export interface BetterAuthDatabaseProviderBuildContext {
  hubDialect: DbDialect
  usePlural: boolean
  camelCase: boolean
}

export interface BetterAuthDatabaseProviderSetupContext {
  nuxt: Nuxt
  options: BetterAuthModuleOptions
  clientOnly: boolean
}

export interface BetterAuthDatabaseProviderEnabledContext extends BetterAuthDatabaseProviderSetupContext {
  hasHubDbAvailable: boolean
}

export interface BetterAuthDatabaseProviderDefinition {
  buildDatabaseCode: (ctx: BetterAuthDatabaseProviderBuildContext) => string
  setup?: (ctx: BetterAuthDatabaseProviderSetupContext) => void | Promise<void>
  isEnabled?: (ctx: BetterAuthDatabaseProviderEnabledContext) => boolean
  priority?: number
}

declare module '@nuxt/schema' {
  interface NuxtHooks {
    /**
     * Extend better-auth config with additional plugins or options.
     * Called after user's auth.config.ts is loaded.
     * @param config - Partial config to merge into the auth options
     */
    'better-auth:config:extend': (config: Partial<BetterAuthOptions>) => void | Promise<void>

    /**
     * Register or override Better Auth database providers.
     * Providers are auto-selected via `isEnabled` + `priority`.
     */
    'better-auth:database:providers': (providers: Record<string, BetterAuthDatabaseProviderDefinition>) => void | Promise<void>
  }
}
