import type {} from './nitro/augment'

export { default } from './nitro/module'
export { serverAuth } from './nitro/runtime/server/utils/auth'
export { getRequestSession, getUserSession, requireUserSession } from './nitro/runtime/server/utils/session'
export type { BetterAuthNitroOptions } from './nitro/module-types'
export type { AppSession, AuthMeta, AuthMode, AuthRouteRules, AuthSession, AuthUser, RequireSessionOptions, ServerAuthContext, UserMatch } from './nitro/runtime/types'
