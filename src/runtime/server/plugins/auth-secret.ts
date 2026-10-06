import { prepareAuthSecret } from '../internal/auth-secret'

/**
 * Starts deriving the auth secret from Nuxt's `appSecret` when the server starts, so a
 * `serverAuth()` call made before the first request, such as from a task, can use it.
 * Nitro does not await plugins: startup code that needs the secret right away awaits
 * `ensureServerAuth()` instead.
 */
export default function authSecretPlugin(): void {
  void prepareAuthSecret()
}
