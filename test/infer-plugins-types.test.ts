import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/plugins-type-inference', import.meta.url))
const layerFixtureDir = fileURLToPath(new URL('./cases/plugins-type-inference-layer', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

describe('type inference regressions #107, #192, and #382', () => {
  it('typechecks plugin/additional fields and serverAuth plugin API inference', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const typecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(typecheck.status, `vue-tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    const output = `${typecheck.stdout}\n${typecheck.stderr}`

    expect(output).not.toContain(`is not assignable to type 'BetterAuthPlugin'`)
    expect(output).not.toContain(`'role' does not exist in type`)
    expect(output).not.toContain(`'internalCode' does not exist in type`)
    expect(output).not.toContain(`Property 'signInUsername' does not exist on type`)
    expect(output).not.toContain(`'signInUsername' does not exist on type`)

    const appTypecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', '.nuxt/tsconfig.app.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 60_000,
    })
    expect(appTypecheck.status, `app vue-tsc failed:\n${appTypecheck.stdout}\n${appTypecheck.stderr}`).toBe(0)

    const sharedTypecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', '.nuxt/tsconfig.shared.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(sharedTypecheck.status, `shared vue-tsc failed:\n${sharedTypecheck.stdout}\n${sharedTypecheck.stderr}`).toBe(0)
  }, 360_000)

  it('keeps admin plugin fields in app and shared projects when auth config comes from a layer', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: layerFixtureDir,
      env,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(prepare.status, `layer nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    for (const project of ['app', 'shared']) {
      const typecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', `.nuxt/tsconfig.${project}.json`], {
        cwd: layerFixtureDir,
        env,
        encoding: 'utf8',
        timeout: 120_000,
      })
      expect(typecheck.status, `${project} vue-tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    }
  }, 360_000)
})
