import type { AuthUser } from '#nuxt-better-auth'

export function assertLayeredAdminTypes(user: AuthUser) {
  const role: string | null | undefined = user.role
  const banned: boolean | null | undefined = user.banned
  const banReason: string | null | undefined = user.banReason
  const banExpires: Date | null | undefined = user.banExpires

  return {
    banned,
    banExpires,
    banReason,
    role,
  }
}
