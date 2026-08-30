import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'
import type { BetterAuthClientOptions, BetterAuthClientPlugin } from 'better-auth/client'
import type { ServerAuthContext as BaseServerAuthContext } from './types/augment'
import { createAuthClient } from 'better-auth/vue'

export interface ServerAuthContextExtension {}
export type ServerAuthContext = BaseServerAuthContext & ServerAuthContextExtension
export type SchemaCasing = 'snake_case' | 'camelCase'

export interface ClientAuthContext {
  siteUrl: string
}

export type ServerAuthConfig = Omit<BetterAuthOptions, 'secret' | 'baseURL'> & {
  plugins?: readonly BetterAuthPlugin[]
}
export type ClientAuthConfig = Omit<BetterAuthClientOptions, 'baseURL'> & { baseURL?: string }

export type ServerAuthConfigFn = (ctx: ServerAuthContext) => ServerAuthConfig
export type ClientAuthConfigFn = (ctx: ClientAuthContext) => ClientAuthConfig
type ServerPlugins<T> = T extends { plugins: infer P extends readonly BetterAuthPlugin[] } ? P : []
type ClientPlugins<T> = T extends { plugins: infer P extends BetterAuthClientPlugin[] } ? P : []
type ExtendedServerAuthConfig<T, P extends readonly BetterAuthPlugin[]> = Omit<T, 'plugins'> & { plugins: [...ServerPlugins<T>, ...P] }
type ExtendedClientAuthConfig<T, P extends BetterAuthClientPlugin[]> = Omit<T, 'plugins'> & { plugins: [...ClientPlugins<T>, ...P] }

export type ClientAuthFactory<T extends ClientAuthConfig> = ((baseURL: string) => ReturnType<typeof createAuthClient<T>>) & {
  resolveOptions: (baseURL: string) => T & { baseURL: string }
}
export type ModuleDatabaseProviderId = 'none' | 'nuxthub' | (string & {})
export type EffectiveDatabaseProviderId = 'user' | ModuleDatabaseProviderId

// Module options for nuxt.config.ts
export interface BetterAuthModuleOptions {
  /** Client-only mode - skip server setup for external auth backends */
  clientOnly?: boolean
  /** Server config path. Relative paths resolve from the layer that declares them. Default: 'server/auth.config' */
  serverConfig?: string
  /** Client config path. Relative paths resolve from the layer that declares them. Default: 'app/auth.config' */
  clientConfig?: string
  /** Server plugin modules. Relative paths resolve from the declaring layer. Sources are additive and are not deduplicated. */
  serverPluginSources?: string[]
  /** Client plugin modules. Relative paths resolve from the declaring layer. Sources are additive and are not deduplicated. */
  clientPluginSources?: string[]
  redirects?: {
    /** Where to redirect unauthenticated users. Default: '/login' */
    login?: string
    /** Where to redirect authenticated users on guest-only routes. Default: '/' */
    guest?: string
    /** Where to navigate after successful signIn/signUp when no onSuccess is provided. Default: no automatic navigation */
    authenticated?: string
    /** Where to navigate after logout. Default: no automatic navigation */
    logout?: string
  }
  /**
   * When redirecting unauthenticated users to the login route, append a query param
   * containing the originally requested path (for safe "return-to" redirects).
   *
   * Default: true
   */
  preserveRedirect?: boolean
  /**
   * Query param key used by preserveRedirect.
   *
   * Default: 'redirect'
   */
  redirectQueryKey?: string
  /**
   * Configure secondary storage for sessions.
   * - `true`: Temporarily falls back to database-backed sessions with a setup warning
   * - `'custom'`: User provides an atomic secondaryStorage in defineServerAuth()
   * - `false` (default): No secondary storage from module
   */
  hubSecondaryStorage?: boolean | 'custom'
  /** Schema generation options. Must match drizzleAdapter config. */
  schema?: {
    /** Plural table names: user → users. Default: false */
    usePlural?: boolean
    /** Column/table name casing. Explicit value takes precedence over hub.db.casing. */
    casing?: SchemaCasing
    /** PostgreSQL schema namespace. */
    schemaName?: string
  }
}

// Runtime config type for public.auth
export interface AuthRuntimeConfig {
  redirects: { login: string, guest: string, authenticated?: string, logout?: string }
  preserveRedirect: boolean
  redirectQueryKey: string
  useDatabase: boolean
  databaseProvider: EffectiveDatabaseProviderId
  clientOnly: boolean
}

// Private runtime config (server-only)
export interface AuthPrivateRuntimeConfig {
  hubSecondaryStorage: boolean | 'custom'
}

export function defineServerAuth<const R>(config: (ctx: ServerAuthContext) => R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth<const R>(config: R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth(config: ServerAuthConfig | ((ctx: ServerAuthContext) => ServerAuthConfig)): (ctx: ServerAuthContext) => ServerAuthConfig {
  return typeof config === 'function' ? config : () => config
}

export function extendServerAuth<const R extends ServerAuthConfig, const P extends readonly BetterAuthPlugin[]>(
  createConfig: (ctx: ServerAuthContext) => R,
  plugins: P,
): (ctx: ServerAuthContext) => ExtendedServerAuthConfig<R, P> {
  return (ctx) => {
    const config = createConfig(ctx)
    const basePlugins = (config.plugins || []) as ServerPlugins<R>
    return { ...config, plugins: [...basePlugins, ...plugins] } as ExtendedServerAuthConfig<R, P>
  }
}

function createClientAuthFactory<T extends ClientAuthConfig>(resolveOptions: (baseURL: string) => T & { baseURL: string }): ClientAuthFactory<T> {
  const factory = ((baseURL: string) => createAuthClient(resolveOptions(baseURL))) as ClientAuthFactory<T>
  factory.resolveOptions = resolveOptions
  return factory
}

export function defineClientAuth<T extends ClientAuthConfig>(config: T | ((ctx: ClientAuthContext) => T)): ClientAuthFactory<T> {
  return createClientAuthFactory((baseURL) => {
    const ctx: ClientAuthContext = { siteUrl: baseURL }
    const resolved = typeof config === 'function' ? config(ctx) : config
    const { baseURL: configuredBaseURL, ...resolvedOptions } = resolved
    return { ...resolvedOptions, baseURL: configuredBaseURL ?? baseURL } as T & { baseURL: string }
  })
}

export function extendClientAuth<T extends ClientAuthConfig, const P extends BetterAuthClientPlugin[]>(
  createClient: ClientAuthFactory<T>,
  plugins: P,
): ClientAuthFactory<ExtendedClientAuthConfig<T, P>> {
  return createClientAuthFactory((baseURL) => {
    const config = createClient.resolveOptions(baseURL)
    const basePlugins = (config.plugins || []) as ClientPlugins<T>
    return { ...config, plugins: [...basePlugins, ...plugins] } as ExtendedClientAuthConfig<T, P> & { baseURL: string }
  })
}
