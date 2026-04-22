import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}
const rootDir = fileURLToPath(new URL('..', import.meta.url))

beforeAll(() => {
  if (existsSync(fileURLToPath(new URL('../dist/module.mjs', import.meta.url)))
    && existsSync(fileURLToPath(new URL('../dist/runtime/config.js', import.meta.url)))) {
    return
  }

  const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
    cwd: rootDir,
    env,
    encoding: 'utf8',
  })
  expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
}, 180_000)

function runProjectReferenceTypecheck(fixtureDir: string) {
  const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
    cwd: fixtureDir,
    env,
    encoding: 'utf8',
  })
  expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

  const typecheck = spawnSync('npx', ['vue-tsc', '-b', '--noEmit', '--pretty', 'false'], {
    cwd: fixtureDir,
    env,
    encoding: 'utf8',
  })
  expect(typecheck.status, `vue-tsc -b failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
}

describe('server auth config project-reference typecheck regression #309', () => {
  it('typechecks a layered auth config that uses Nitro auto-imported helpers', () => {
    runProjectReferenceTypecheck(fileURLToPath(new URL('./cases/layer-server-auth-typecheck', import.meta.url)))
  }, 60_000)

  it('typechecks auth config imports that use the #server alias', () => {
    runProjectReferenceTypecheck(fileURLToPath(new URL('./cases/server-auth-alias-typecheck', import.meta.url)))
  }, 60_000)
})
