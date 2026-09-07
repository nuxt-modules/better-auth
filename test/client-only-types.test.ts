import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/client-only-types', import.meta.url))

describe('client-only auth types', () => {
  it('provides external endpoint and social provider fallbacks without a server config', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  }, 360_000)
})
