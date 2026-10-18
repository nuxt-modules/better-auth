import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthPlugin } from 'better-auth'
import type { DbDialect } from '../module/hub'
import type { BetterAuthModuleOptions } from '../runtime/config'

export interface BetterAuthPluginSources {
  server?: string[]
  client?: string[]
}

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
    /** Register absolute plugin module paths during module setup. Sources are additive and are not deduplicated. */
    'better-auth:plugins:extend': (sources: BetterAuthPluginSources) => void | Promise<void>

    /**
     * Add plugin schemas to generated Better Auth database tables.
     * This build-time hook does not install plugins in the runtime auth instance.
     * @param config - Plugins to include during schema generation
     * @param config.plugins - Better Auth plugins whose schemas should be generated
     */
    'better-auth:config:extend': (config: { plugins?: BetterAuthPlugin[] }) => void | Promise<void>

    /**
     * Register or override Better Auth database providers.
     * Providers are auto-selected via `isEnabled` + `priority`.
     */
    'better-auth:database:providers': (providers: Record<string, BetterAuthDatabaseProviderDefinition>) => void | Promise<void>
  }
}
