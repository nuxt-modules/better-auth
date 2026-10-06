import { deriveSecret } from 'nuxt/server'

/** The `deriveSecret()` purpose for the Better Auth secret. Changing it rotates every derived secret. */
export const AUTH_SECRET_PURPOSE = 'better-auth:secret'

/** Derives the Better Auth secret from Nuxt's `appSecret` (`NUXT_APP_SECRET`), on Nuxt 4.6+. */
export const deriveAuthSecret: (() => Promise<string>) | undefined = () => deriveSecret(AUTH_SECRET_PURPOSE)
