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
 * Whether the auth secret is derived from `appSecret`: Nuxt provides `deriveSecret()` (4.6+) and
 * the `appSecret` is the user's. In development Nuxt generates an `appSecret` when none is set
 * (`NUXT_APP_SECRET_GENERATED`); deriving from that would replace Better Auth's development
 * default secret and sign out existing development sessions, so the default is kept.
 */
export function canDeriveAuthSecret(): boolean {
  if (!deriveAuthSecret)
    return false
  return !(import.meta.dev && globalThis.process?.env?.NUXT_APP_SECRET_GENERATED === '1')
}

/**
 * Derives the Better Auth secret from Nuxt's `appSecret` once per server process, when no auth
 * secret is configured and the `appSecret` is the user's (see `canDeriveAuthSecret`).
 * `serverAuth()` is synchronous, so request entry points and the startup plugin start this, and
 * the request entry points await it before they create the auth instance.
 */
export function prepareAuthSecret(): Promise<void> | undefined {
  if (derivedSecret !== undefined || derivedSecretError !== undefined || !canDeriveAuthSecret())
    return
  if (hasExplicitAuthSecret(useRuntimeConfig()))
    return

  derivedSecretPromise ||= deriveAuthSecret!().then(
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
  /** The secret is derived from the user's `appSecret` (Nuxt 4.6+). */
  available: boolean
  secret?: string
  error?: unknown
}

export function getDerivedAuthSecret(): DerivedAuthSecretState {
  return {
    available: canDeriveAuthSecret(),
    secret: derivedSecret,
    error: derivedSecretError,
  }
}
