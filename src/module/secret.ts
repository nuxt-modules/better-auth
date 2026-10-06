import type { ConsolaInstance } from 'consola'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { isCI, isTest } from 'std-env'

const DEFAULT_SECRET_ENV = 'NUXT_BETTER_AUTH_SECRET'
const FALLBACK_SECRET_ENV = 'BETTER_AUTH_SECRET'
const VERSIONED_SECRET_ENV = 'BETTER_AUTH_SECRETS'
const APP_SECRET_ENV = 'NUXT_APP_SECRET'

const generateSecret = () => randomBytes(32).toString('hex')

function readEnvFile(rootDir: string): string {
  const envPath = join(rootDir, '.env')
  return existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
}

function hasEnvSecret(rootDir: string, names: string[]): boolean {
  const envFile = readEnvFile(rootDir)
  return names.some((name) => {
    const match = envFile.match(new RegExp(`^${name}=(.+)$`, 'm'))
    return !!match && !!match[1] && match[1].trim().length > 0
  })
}

function appendSecretToEnv(rootDir: string, name: string, secret: string): void {
  const envPath = join(rootDir, '.env')
  let content = readEnvFile(rootDir)
  if (content.length > 0 && !content.endsWith('\n'))
    content += '\n'
  content += `${name}=${secret}\n`
  writeFileSync(envPath, content, 'utf-8')
}

/** The variable the install prompt writes: `NUXT_APP_SECRET` on Nuxt 4.6+, `NUXT_BETTER_AUTH_SECRET` before. */
function getSecretEnvName(appSecret: boolean | undefined): string {
  return appSecret ? APP_SECRET_ENV : DEFAULT_SECRET_ENV
}

/**
 * Applies the `NUXT_APP_SECRET` the install prompt wrote to `.env` to the running process, as if it
 * had been set before Nuxt started. Nitro reads it over the resolved runtime config, and it is no
 * longer the development `appSecret` Nuxt generated.
 */
export function applyPromptedAppSecret(secret: string): void {
  process.env[APP_SECRET_ENV] = secret
  delete process.env.NUXT_APP_SECRET_GENERATED
}

export interface PromptForSecretOptions {
  configuredSecret?: string
  prepare?: boolean
  /** Nuxt 4.6+ derives the auth secret from `appSecret`, so `NUXT_APP_SECRET` also counts as configured. */
  appSecret?: boolean
  configuredAppSecret?: string
}

export async function promptForSecret(rootDir: string, consola: ConsolaInstance, options: PromptForSecretOptions = {}): Promise<string | undefined> {
  const configuredSecret = options.configuredSecret?.trim()
  if (configuredSecret)
    return undefined

  if (process.env.NUXT_BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRETS)
    return undefined
  const secretEnvNames = [DEFAULT_SECRET_ENV, FALLBACK_SECRET_ENV, VERSIONED_SECRET_ENV]
  if (options.appSecret)
    secretEnvNames.push(APP_SECRET_ENV)
  if (hasEnvSecret(rootDir, secretEnvNames))
    return undefined
  // Nuxt generates a development appSecret when none is set; that one does not reach production.
  const generatedAppSecret = process.env.NUXT_APP_SECRET_GENERATED === '1'
  if (options.appSecret && !generatedAppSecret && (process.env.NUXT_APP_SECRET || options.configuredAppSecret?.trim()))
    return undefined

  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  if (options.prepare || !hasTty) {
    consola.warn(options.appSecret
      ? '[nuxt-better-auth] Skipping auth secret prompt (non-interactive). Set NUXT_APP_SECRET, or NUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET, or BETTER_AUTH_SECRETS.'
      : '[nuxt-better-auth] Skipping auth secret prompt (non-interactive). Set NUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET, or BETTER_AUTH_SECRETS.')
    return undefined
  }

  const envName = getSecretEnvName(options.appSecret)
  if (isCI || isTest) {
    const secret = generateSecret()
    appendSecretToEnv(rootDir, envName, secret)
    consola.info(`Generated ${envName} and added to .env (CI/test mode)`)
    return secret
  }

  consola.box(options.appSecret
    ? 'An auth secret is required for authentication.\nThis will add NUXT_APP_SECRET to your .env file. The auth secret is derived from it.\nNUXT_BETTER_AUTH_SECRET, BETTER_AUTH_SECRET and BETTER_AUTH_SECRETS are also supported.'
    : 'An auth secret is required for authentication.\nThis will add NUXT_BETTER_AUTH_SECRET to your .env file.\nBETTER_AUTH_SECRET and BETTER_AUTH_SECRETS are also supported.')
  const choice = await consola.prompt('How do you want to set it?', {
    type: 'select',
    options: [
      { label: 'Generate for me', value: 'generate', hint: 'uses crypto.randomBytes(32)' },
      { label: 'Enter manually', value: 'paste' },
      { label: 'Skip', value: 'skip', hint: 'will fail in production' },
    ],
    cancel: 'null',
  }) as 'generate' | 'paste' | 'skip' | symbol

  if (typeof choice === 'symbol' || choice === 'skip') {
    consola.warn('Skipping auth secret setup. Auth will fail without a configured secret in production.')
    return undefined
  }

  let secret: string
  if (choice === 'generate') {
    secret = generateSecret()
  }
  else {
    const input = await consola.prompt('Paste your secret (min 32 chars):', { type: 'text', cancel: 'null' }) as string | symbol
    if (typeof input === 'symbol' || !input || input.length < 32) {
      consola.warn('Invalid secret. Skipping.')
      return undefined
    }
    secret = input
  }

  const preview = `${secret.slice(0, 8)}...${secret.slice(-4)}`
  const confirm = await consola.prompt(`Add to .env:\n${envName}=${preview}\nProceed?`, { type: 'confirm', initial: true, cancel: 'null' }) as boolean | symbol
  if (typeof confirm === 'symbol' || !confirm) {
    consola.info('Cancelled. Secret not written.')
    return undefined
  }

  appendSecretToEnv(rootDir, envName, secret)
  consola.success(`Added ${envName} to .env`)
  return secret
}
