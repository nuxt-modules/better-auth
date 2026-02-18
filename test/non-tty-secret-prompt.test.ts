import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoDir = fileURLToPath(new URL('..', import.meta.url))

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

describe('promptForSecret', () => {
  it('skips prompting in non-interactive/prepare mode', () => {
    const env = createNonTestEnv()

    const script = `
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

    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repoDir,
      env,
      encoding: 'utf8',
      timeout: 60_000,
    })

    expect(run.status, `node script failed:\n${run.stdout}\n${run.stderr}`).toBe(0)
    const output = `${run.stdout}\n${run.stderr}`
    expect(output).toContain('Skipping BETTER_AUTH_SECRET prompt')
    expect(output).toContain('PROMPT_CALLS=0')
  })
})
