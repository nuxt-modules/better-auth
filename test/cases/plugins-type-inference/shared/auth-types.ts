import type { AuthSession, AuthUser } from '#nuxt-better-auth'
import type { AuthSocialProviderId } from '../../../../src/runtime/types'

export function assertSharedAuthTypes(user: AuthUser, session: AuthSession) {
  const role: string | null | undefined = user.role
  const banned: boolean | null | undefined = user.banned
  const banReason: string | null | undefined = user.banReason
  const banExpires: Date | null | undefined = user.banExpires
  const internalCode: string | null | undefined = user.internalCode
  const provider: AuthSocialProviderId = 'github'

  return {
    banned,
    banExpires,
    banReason,
    internalCode,
    provider,
    role,
    session,
  }
}
