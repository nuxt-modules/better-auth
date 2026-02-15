import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'
import type { BetterAuthClientOptions } from 'better-auth/client'
import type { CasingOption } from '../schema-generator'
import type { ServerAuthContext } from './types/augment'
import { createAuthClient } from 'better-auth/vue'

// Re-export for declaration merging with generated types
export type { ServerAuthContext }

export interface ClientAuthContext {
  siteUrl: string
}

export type ServerAuthConfig = Omit<BetterAuthOptions, 'secret' | 'baseURL'> & {
  plugins?: readonly BetterAuthPlugin[]
}
export type ClientAuthConfig = Omit<BetterAuthClientOptions, 'baseURL'> & { baseURL?: string }

export type ServerAuthConfigFn = (ctx: ServerAuthContext) => ServerAuthConfig
export type ClientAuthConfigFn = (ctx: ClientAuthContext) => ClientAuthConfig
export type ModuleDatabaseProviderId = 'none' | 'nuxthub' | (string & {})
export type EffectiveDatabaseProviderId = 'user' | ModuleDatabaseProviderId
export type DatabaseSource = 'module' | 'user'

// Module options for nuxt.config.ts
export interface BetterAuthModuleOptions {
  /** Client-only mode - skip server setup for external auth backends */
  clientOnly?: boolean
  /** Server config path relative to rootDir. Default: 'server/auth.config' */
  serverConfig?: string
  /** Client config path relative to rootDir. Default: 'app/auth.config' */
  clientConfig?: string
  redirects?: {
    login?: string // default: '/login'
    guest?: string // default: '/'
  }
  session?: {
    /**
     * When enabled, and session/user are already hydrated from SSR, skip the initial
     * client `/api/auth/get-session` bootstrap request. This also skips Better Auth's
     * session refresh manager on those pages.
     *
     * Default: false
     */
    skipHydratedSsrGetSession?: boolean
  }
  /** Enable KV secondary storage for sessions. Requires hub.kv: true */
  secondaryStorage?: boolean
  /** Schema generation options. Must match drizzleAdapter config. */
  schema?: {
    /** Plural table names: user → users. Default: false */
    usePlural?: boolean
    /** Column/table name casing. Explicit value takes precedence over hub.db.casing. */
    casing?: CasingOption
  }
}

// Runtime config type for public.auth
export interface AuthRuntimeConfig {
  redirects: { login: string, guest: string }
  useDatabase: boolean
  databaseProvider: EffectiveDatabaseProviderId
  databaseSource: DatabaseSource
  clientOnly: boolean
  session: { skipHydratedSsrGetSession: boolean }
}

// Private runtime config (server-only)
export interface AuthPrivateRuntimeConfig {
  secondaryStorage: boolean
}

export function defineServerAuth<const R>(config: (ctx: ServerAuthContext) => R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth<const R>(config: R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth(config: ServerAuthConfig | ((ctx: ServerAuthContext) => ServerAuthConfig)): (ctx: ServerAuthContext) => ServerAuthConfig {
  return typeof config === 'function' ? config : () => config
}

export function defineClientAuth<T extends ClientAuthConfig>(config: T | ((ctx: ClientAuthContext) => T)): (baseURL: string) => ReturnType<typeof createAuthClient<T>> {
  return (baseURL: string) => {
    const ctx: ClientAuthContext = { siteUrl: baseURL }
    const resolved = typeof config === 'function' ? config(ctx) : config
    return createAuthClient({ ...resolved, baseURL })
  }
}
