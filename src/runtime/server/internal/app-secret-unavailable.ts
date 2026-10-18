/** Nuxt < 4.6 has no `appSecret` to derive the Better Auth secret from. */
export const deriveAuthSecret: (() => Promise<string>) | undefined = undefined
