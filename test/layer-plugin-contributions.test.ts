import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/layer-plugin-contributions', import.meta.url))
const runtimeFixtureDir = fileURLToPath(new URL('./cases/layer-plugin-contributions-runtime', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
}

describe('layer plugin contributions', async () => {
  await setup({ rootDir: runtimeFixtureDir })

  it('uses the contributed plugin in the schema and running auth instance', async () => {
    await expect($fetch('/api/auth/layer-proof')).resolves.toEqual({ source: 'layer' })
    await expect($fetch('/api/auth/module-proof')).resolves.toEqual({ source: 'module' })
    await expect($fetch('/api/test/layer-plugin')).resolves.toEqual({
      hasLayerField: true,
      hasLayerTable: true,
    })
  })

  it('includes contributed server fields, endpoints, and client actions in app types', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const typecheck = spawnSync('npx', ['vue-tsc', '--noEmit', '--pretty', 'false', '-p', '.nuxt/tsconfig.app.json'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })
    expect(typecheck.status, `app vue-tsc failed:\n${typecheck.stdout}\n${typecheck.stderr}`).toBe(0)

    const sharedTypes = readFileSync(`${fixtureDir}/.nuxt/nuxt.shared.d.ts`, 'utf8')
    expect(sharedTypes).not.toContain('types/nuxt-better-auth-infer.d.ts')
    expect(sharedTypes).not.toContain('types/nuxt-better-auth-social-providers.d.ts')
  }, 60_000)
})
