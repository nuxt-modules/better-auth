import type {} from './augment'
import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth'

export interface ServerAuthContext {
  runtimeConfig: Record<string, unknown>
}

export type ServerAuthConfig = Omit<BetterAuthOptions, 'secret' | 'baseURL'> & {
  plugins?: readonly BetterAuthPlugin[]
}

export function defineServerAuth<const R>(config: (ctx: ServerAuthContext) => R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth<const R>(config: R & ServerAuthConfig): (ctx: ServerAuthContext) => R
export function defineServerAuth(config: ServerAuthConfig | ((ctx: ServerAuthContext) => ServerAuthConfig)): (ctx: ServerAuthContext) => ServerAuthConfig {
  return typeof config === 'function' ? config : () => config
}
