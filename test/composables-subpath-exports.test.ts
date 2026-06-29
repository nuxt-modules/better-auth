import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/composables-subpath-import', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

describe('public composables subpath export', () => {
  it('typechecks consumer imports from @onmax/nuxt-better-auth/composables', () => {
    if (!existsSync(fileURLToPath(new URL('../dist/runtime/composables.js', import.meta.url)))) {
      const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env,
        encoding: 'utf8',
      })
      expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
    }

    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(typecheck.status, `tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
  }, 180_000)
})
