import { prepareAuthSecret } from '../internal/auth-secret'
import { findStartupAuthSecretError } from '../utils/auth'

/**
 * Starts deriving the auth secret from Nuxt's `appSecret` when the server starts, so a
 * `serverAuth()` call made before the first request, such as from a task, can use it.
 * Nitro does not await plugins: startup code that needs the secret right away awaits
 * `ensureServerAuth()` instead.
 *
 * In production it also stops the server when no auth secret is set, rather than letting the first
 * auth call fail. Prerendering starts the server at build time, usually without secrets, and
 * Cloudflare Workers may bind their secrets only per request, so neither is checked.
 */
export default function authSecretPlugin(): void {
  void prepareAuthSecret()
  if (import.meta.dev || import.meta.prerender || String(import.meta.preset).startsWith('cloudflare'))
    return

  void findStartupAuthSecretError().then((message) => {
    if (!message)
      return
    console.error(message)
    process.exit(1)
  })
}
