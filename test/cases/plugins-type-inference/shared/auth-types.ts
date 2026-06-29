import type { AuthSession, AuthUser } from '#nuxt-better-auth'
import type { AuthSocialProviderId } from '../../../../src/runtime/types'

export function assertSharedAuthTypes(user: AuthUser, session: AuthSession) {
  const role: string | null | undefined = user.role
  const internalCode: string | null | undefined = user.internalCode
  const workspaceId: string | null | undefined = session.workspaceId
  const provider: AuthSocialProviderId = 'github'

  return {
    internalCode,
    provider,
    role,
    workspaceId,
  }
}
