import type { ConsolaInstance } from 'consola'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { isCI, isTest } from 'std-env'

const generateSecret = () => randomBytes(32).toString('hex')

function readEnvFile(rootDir: string): string {
  const envPath = join(rootDir, '.env')
  return existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
}

function hasEnvSecret(rootDir: string): boolean {
  const match = readEnvFile(rootDir).match(/^BETTER_AUTH_SECRET=(.+)$/m)
  return !!match && !!match[1] && match[1].trim().length > 0
}

function appendSecretToEnv(rootDir: string, secret: string): void {
  const envPath = join(rootDir, '.env')
  let content = readEnvFile(rootDir)
  if (content.length > 0 && !content.endsWith('\n'))
    content += '\n'
  content += `BETTER_AUTH_SECRET=${secret}\n`
  writeFileSync(envPath, content, 'utf-8')
}

export interface PromptForSecretOptions {
  configuredSecret?: string
  prepare?: boolean
}

export async function promptForSecret(rootDir: string, consola: ConsolaInstance, options: PromptForSecretOptions = {}): Promise<string | undefined> {
  const configuredSecret = options.configuredSecret?.trim()
  if (configuredSecret)
    return undefined

  if (process.env.BETTER_AUTH_SECRET || hasEnvSecret(rootDir))
    return undefined

  const hasTty = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  if (options.prepare || !hasTty) {
    consola.warn('[nuxt-better-auth] Skipping BETTER_AUTH_SECRET prompt (non-interactive). Set BETTER_AUTH_SECRET or NUXT_BETTER_AUTH_SECRET.')
    return undefined
  }

  if (isCI || isTest) {
    const secret = generateSecret()
    appendSecretToEnv(rootDir, secret)
    consola.info('Generated BETTER_AUTH_SECRET and added to .env (CI/test mode)')
    return secret
  }

  consola.box('BETTER_AUTH_SECRET is required for authentication.\nThis will be appended to your .env file.')
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
    consola.warn('Skipping BETTER_AUTH_SECRET. Auth will fail without it in production.')
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
  const confirm = await consola.prompt(`Add to .env:\nBETTER_AUTH_SECRET=${preview}\nProceed?`, { type: 'confirm', initial: true, cancel: 'null' }) as boolean | symbol
  if (typeof confirm === 'symbol' || !confirm) {
    consola.info('Cancelled. Secret not written.')
    return undefined
  }

  appendSecretToEnv(rootDir, secret)
  consola.success('Added BETTER_AUTH_SECRET to .env')
  return secret
}
