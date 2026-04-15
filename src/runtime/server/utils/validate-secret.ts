export function validateAuthSecret(secret: string | undefined): string {
  if (!import.meta.dev && !secret)
    throw new Error('[nuxt-better-auth] NUXT_BETTER_AUTH_SECRET is required in production. Set NUXT_BETTER_AUTH_SECRET or BETTER_AUTH_SECRET environment variable.')
  if (secret && secret.length < 32)
    throw new Error('[nuxt-better-auth] NUXT_BETTER_AUTH_SECRET must be at least 32 characters for security')

  return secret || ''
}
