import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/signin-provider-alias-type-inference', import.meta.url))

describe('useSignIn social provider typing', () => {
  it('infers social provider ids from configured socialProviders keys', () => {
    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      encoding: 'utf8',
    })
    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  }, 30000)
})
