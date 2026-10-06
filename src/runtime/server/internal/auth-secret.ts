import { env } from 'better-auth'
import { deriveAuthSecret } from './app-secret-compat'
import { useRuntimeConfig } from './nitro-compat'

let derivedSecret: string | undefined
let derivedSecretPromise: Promise<void> | undefined
let derivedSecretError: unknown

/** The singular secret configured for the module: runtime config (`NUXT_BETTER_AUTH_SECRET`) or `BETTER_AUTH_SECRET`. */
export function getConfiguredAuthSecret(runtimeConfig: object): string {
  const secret = (runtimeConfig as { betterAuthSecret?: unknown }).betterAuthSecret
  return (typeof secret === 'string' && secret) || env.BETTER_AUTH_SECRET || ''
}

/** Whether a secret source that predates `appSecret` derivation is configured. These always win. */
export function hasExplicitAuthSecret(runtimeConfig: object): boolean {
  return Boolean(getConfiguredAuthSecret(runtimeConfig) || env.BETTER_AUTH_SECRETS || env.AUTH_SECRET)
}

/**
 * Derives the Better Auth secret from Nuxt's `appSecret` once per server process, when no auth
 * secret is configured and Nuxt provides `deriveSecret()` (4.6+). `serverAuth()` is synchronous,
 * so request entry points await this before creating the auth instance.
 */
export function prepareAuthSecret(): Promise<void> | undefined {
  if (!deriveAuthSecret || derivedSecret !== undefined || derivedSecretError !== undefined)
    return
  if (hasExplicitAuthSecret(useRuntimeConfig()))
    return

  derivedSecretPromise ||= deriveAuthSecret().then(
    (secret) => {
      derivedSecret = secret
    },
    (error: unknown) => {
      // `appSecret` is fixed for the process, so a missing value is reported rather than retried.
      derivedSecretError = error ?? new Error('deriveSecret failed')
    },
  )
  return derivedSecretPromise
}

export interface DerivedAuthSecretState {
  /** Nuxt can derive the secret (4.6+). */
  available: boolean
  secret?: string
  error?: unknown
}

export function getDerivedAuthSecret(): DerivedAuthSecretState {
  return {
    available: Boolean(deriveAuthSecret),
    secret: derivedSecret,
    error: derivedSecretError,
  }
}
