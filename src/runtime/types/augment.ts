// Base types - automatically extended via type generation from auth.config.ts
// These serve as fallbacks and base structure

import type { ComputedRef, Ref } from 'vue'

// Base user - extended by InferUser<Config> from generated types
export interface AuthUser {
  id: string
  createdAt: Date
  updatedAt: Date
  email: string
  emailVerified: boolean
  name: string
  image?: string | null
}

// Base session - extended by InferSession<Config> from generated types
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

// Server auth context - extended by generated types with hub:db types
export interface ServerAuthContext {
  runtimeConfig: Record<string, unknown>
  db: unknown
}

// Composable return type
export interface UserSessionComposable {
  client: unknown
  user: Ref<AuthUser | null>
  session: Ref<AuthSession | null>
  loggedIn: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  signIn: unknown
  signUp: unknown
  fetchSession: (options?: { headers?: HeadersInit, force?: boolean }) => Promise<void>
  waitForSession: () => Promise<void>
  signOut: (options?: { onSuccess?: () => void | Promise<void> }) => Promise<void>
  updateUser: (updates: Partial<AuthUser>) => Promise<void>
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
