import type { NitroRouteRules } from 'nitro/types'

export interface AuthUser {
  id: string
  createdAt: Date
  updatedAt: Date
  email: string
  emailVerified: boolean
  name: string
  image?: string | null
}

export interface AuthSession {
  id: string
  createdAt: Date
  updatedAt: Date
  userId: string
  expiresAt: Date
  token: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ServerAuthContext {
  runtimeConfig: Record<string, unknown>
}

export type UserMatch<T> = { [K in keyof T]?: T[K] | T[K][] }

export interface AppSession {
  user: AuthUser
  session: AuthSession
}

export interface RequireSessionOptions {
  user?: UserMatch<AuthUser>
  rule?: (ctx: { user: AuthUser, session: AuthSession }) => boolean | Promise<boolean>
}

export type AuthMode = 'guest' | 'user'

export type AuthMeta = false | AuthMode | {
  only?: AuthMode
  redirectTo?: string
  user?: UserMatch<AuthUser>
}

export type AuthRouteRules = NitroRouteRules & { auth?: AuthMeta }
