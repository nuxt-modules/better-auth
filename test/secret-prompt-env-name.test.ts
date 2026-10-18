import type { ConsolaInstance } from 'consola'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPromptedAppSecret, promptForSecret } from '../src/module/secret'

const consola = {
  warn: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  box: vi.fn(),
  prompt: vi.fn(),
} as unknown as ConsolaInstance

let rootDir: string
const ttyDescriptors = {
  stdin: Object.getOwnPropertyDescriptor(process.stdin, 'isTTY'),
  stdout: Object.getOwnPropertyDescriptor(process.stdout, 'isTTY'),
}

beforeEach(() => {
  rootDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-secret-'))
  for (const name of ['NUXT_BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_SECRETS', 'NUXT_APP_SECRET', 'NUXT_APP_SECRET_GENERATED'])
    vi.stubEnv(name, undefined)
  // The CI/test branch only runs with a TTY; vitest itself counts as a test environment.
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  rmSync(rootDir, { recursive: true, force: true })
  for (const stream of ['stdin', 'stdout'] as const) {
    const descriptor = ttyDescriptors[stream]
    if (descriptor)
      Object.defineProperty(process[stream], 'isTTY', descriptor)
    else
      delete (process[stream] as { isTTY?: boolean }).isTTY
  }
})

describe('install prompt secret variable', () => {
  it('writes NUXT_APP_SECRET on Nuxt 4.6+', async () => {
    const secret = await promptForSecret(rootDir, consola, { appSecret: true })

    expect(secret).toMatch(/^[0-9a-f]{64}$/)
    expect(readFileSync(join(rootDir, '.env'), 'utf8')).toBe(`NUXT_APP_SECRET=${secret}\n`)
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('NUXT_APP_SECRET'))
  })

  it('writes NUXT_APP_SECRET over the development appSecret Nuxt generated', async () => {
    vi.stubEnv('NUXT_APP_SECRET', 'a'.repeat(64))
    vi.stubEnv('NUXT_APP_SECRET_GENERATED', '1')

    const secret = await promptForSecret(rootDir, consola, { appSecret: true, configuredAppSecret: 'a'.repeat(64) })

    expect(readFileSync(join(rootDir, '.env'), 'utf8')).toBe(`NUXT_APP_SECRET=${secret}\n`)
  })

  it('keeps writing NUXT_BETTER_AUTH_SECRET before Nuxt 4.6', async () => {
    const secret = await promptForSecret(rootDir, consola, { appSecret: false })

    expect(readFileSync(join(rootDir, '.env'), 'utf8')).toBe(`NUXT_BETTER_AUTH_SECRET=${secret}\n`)
    expect(consola.info).toHaveBeenCalledWith(expect.stringContaining('NUXT_BETTER_AUTH_SECRET'))
  })

  it('applies the written appSecret to the running process in place of a generated one', () => {
    vi.stubEnv('NUXT_APP_SECRET', 'a'.repeat(64))
    vi.stubEnv('NUXT_APP_SECRET_GENERATED', '1')

    applyPromptedAppSecret('b'.repeat(64))

    expect(process.env.NUXT_APP_SECRET).toBe('b'.repeat(64))
    expect(process.env.NUXT_APP_SECRET_GENERATED).toBeUndefined()
  })
})
