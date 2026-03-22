import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoDir = fileURLToPath(new URL('..', import.meta.url))
const nonInteractiveScript = `
import { createJiti } from 'jiti'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const jiti = createJiti(process.cwd(), { interopDefault: true, moduleCache: false })
const { promptForSecret } = await jiti.import('./src/module/secret.ts')

let promptCalls = 0
const consola = {
  warn: (...args) => console.log(String(args[0] ?? '')),
  info: () => {},
  success: () => {},
  box: () => {},
  prompt: async () => {
    promptCalls++
    throw new Error('prompt called')
  },
}

const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxt-better-auth-secret-'))
await promptForSecret(rootDir, consola, { prepare: true })
console.log('PROMPT_CALLS=' + promptCalls)
`

function createNonTestEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }

  // Make std-env treat this as non-test/non-ci so we exercise the non-interactive path.
  delete env.CI
  delete env.VITEST
  delete env.VITEST_WORKER_ID
  delete env.JEST_WORKER_ID
  delete env.AVA_PATH
  delete env.TAP
  delete env.TEST
  env.NODE_ENV = 'production'
  delete env.npm_lifecycle_event

  // Ensure no secret is configured via env.
  delete env.BETTER_AUTH_SECRET
  delete env.NUXT_BETTER_AUTH_SECRET

  env.FORCE_COLOR = '0'

  return env
}

function runPromptScript(env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', nonInteractiveScript], {
    cwd: repoDir,
    env,
    encoding: 'utf8',
    timeout: 60_000,
  })
}

describe('promptForSecret', () => {
  it('skips prompting in non-interactive/prepare mode', () => {
    const env = createNonTestEnv()
    const run = runPromptScript(env)

    expect(run.status, `node script failed:\n${run.stdout}\n${run.stderr}`).toBe(0)
    const output = `${run.stdout}\n${run.stderr}`
    expect(output).toContain('Skipping NUXT_BETTER_AUTH_SECRET prompt')
    expect(output).toContain('PROMPT_CALLS=0')
  })

  it('skips prompting when NUXT_BETTER_AUTH_SECRET is already set', () => {
    const env = createNonTestEnv()
    env.NUXT_BETTER_AUTH_SECRET = 'test-secret-for-testing-only-32chars'
    const run = runPromptScript(env)

    expect(run.status, `node script failed:\n${run.stdout}\n${run.stderr}`).toBe(0)
    const output = `${run.stdout}\n${run.stderr}`
    expect(output).not.toContain('Skipping NUXT_BETTER_AUTH_SECRET prompt')
    expect(output).toContain('PROMPT_CALLS=0')
  })

  it('skips prompting when BETTER_AUTH_SECRET fallback is already set', () => {
    const env = createNonTestEnv()
    env.BETTER_AUTH_SECRET = 'test-secret-for-testing-only-32chars'
    const run = runPromptScript(env)

    expect(run.status, `node script failed:\n${run.stdout}\n${run.stderr}`).toBe(0)
    const output = `${run.stdout}\n${run.stderr}`
    expect(output).not.toContain('Skipping NUXT_BETTER_AUTH_SECRET prompt')
    expect(output).toContain('PROMPT_CALLS=0')
  })
})
