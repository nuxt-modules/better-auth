import type { NitroRouteRules } from 'nitropack/types'
import type { AuthSession, AuthUser } from './types/augment'

// Re-export augmentable types
export type { AuthSession, AuthUser, ServerAuthContext, UserSessionComposable } from './types/augment'

// Re-export better-auth types for $Infer access
export type { Auth, InferPluginTypes, InferSessionFromClient as InferSession, InferUserFromClient as InferUser } from 'better-auth'

export type AuthMode = 'guest' | 'user'

// Flexible matching - value OR array of values (OR logic for same field, AND logic between fields)
export type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] }

export interface AppSession {
  user: AuthUser
  session: AuthSession
}

// Route auth meta
export type AuthMeta = false | AuthMode | {
  only?: AuthMode
  redirectTo?: string
  user?: UserMatch<AuthUser>
}

// Route rules with auth
export type AuthRouteRules = NitroRouteRules & { auth?: AuthMeta }

// Helper type for requireUserSession options
export interface RequireSessionOptions {
  user?: UserMatch<AuthUser>
  rule?: (ctx: { user: AuthUser, session: AuthSession }) => boolean | Promise<boolean>
}
