import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/plugins-type-inference', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

describe('type inference regressions #107 and #192', () => {
  it('typechecks plugin/additional fields and serverAuth plugin API inference', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const serverTsconfig = JSON.parse(readFileSync(`${fixtureDir}/.nuxt/tsconfig.server.json`, 'utf8'))
    expect(serverTsconfig.compilerOptions.paths['#nuxt-better-auth']).toEqual([
      './types/nuxt-better-auth.d',
    ])

    const typecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.type-check.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(typecheck.status, `vue-tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)
    const output = `${typecheck.stdout}\n${typecheck.stderr}`

    expect(output).not.toContain(`is not assignable to type 'BetterAuthPlugin'`)
    expect(output).not.toContain(`'role' does not exist in type`)
    expect(output).not.toContain(`'internalCode' does not exist in type`)
    expect(output).not.toContain(`Property 'signInUsername' does not exist on type`)
    expect(output).not.toContain(`'signInUsername' does not exist on type`)

    const sharedTypecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', '.nuxt/tsconfig.shared.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(sharedTypecheck.status, `shared vue-tsc failed:\n${sharedTypecheck.stdout}\n${sharedTypecheck.stderr}`).toBe(0)
  }, 60_000)
})
