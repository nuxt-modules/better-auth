import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/root-entrypoint-typing', import.meta.url))

describe('package root entrypoint types', () => {
  it('exposes configuration helpers as callable values', () => {
    const typecheck = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.json'], {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: 120_000,
    })

    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  })
})
