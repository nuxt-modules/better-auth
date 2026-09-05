import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/use-fetch-endpoints-type-inference', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

describe('typed useFetch auth endpoint inference', () => {
  it('typechecks useFetch/useLazyFetch/useAuthRequestFetch endpoint path inference for /api/auth routes', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  }, 360_000)
})
