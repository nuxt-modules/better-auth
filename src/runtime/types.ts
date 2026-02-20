import type { AuthSocialProviderRegistry, AuthUser, UserMatch } from '#nuxt-better-auth'
import type { NitroRouteRules } from 'nitropack/types'

// Re-export augmentable types
export type { AppSession, AuthSession, AuthSocialProviderRegistry, AuthUser, RequireSessionOptions, ServerAuthContext, UserMatch, UserSessionComposable } from './types/augment'

export type AuthSocialProviderId = AuthSocialProviderRegistry extends { ids: infer T } ? Extract<T, string> : never

// Re-export better-auth types for $Infer access
export type { Auth, InferPluginTypes, InferSessionFromClient as InferSession, InferUserFromClient as InferUser } from 'better-auth'

export interface AuthActionError {
  message: string
  code?: string
  status?: number
  raw: unknown
}

export type AuthMode = 'guest' | 'user'

// Route auth meta
export type AuthMeta = false | AuthMode | {
  only?: AuthMode
  redirectTo?: string
  user?: UserMatch<AuthUser>
}

// Route rules with auth
export type AuthRouteRules = NitroRouteRules & { auth?: AuthMeta }
