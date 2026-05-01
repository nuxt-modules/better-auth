import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
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

function readGeneratedJson(fixtureDir: string, filePath: string) {
  return JSON.parse(readFileSync(`${fixtureDir}/.nuxt/${filePath}`, 'utf8'))
}

function generatedReferences(fixtureDir: string, filePath: string) {
  return (readGeneratedJson(fixtureDir, filePath).references || [])
    .map((reference: { path?: string }) => reference.path)
    .filter(Boolean)
}

function expectSharedTypeReferencesToStayClientSafe(fixtureDir: string) {
  const sharedReferences = generatedReferences(fixtureDir, 'tsconfig.shared.json')
  const serverOnlyReferences = [
    'types/nuxt-better-auth-server-context.d.ts',
    'types/nuxt-better-auth-infer.d.ts',
    'types/nuxt-better-auth-social-providers.d.ts',
    'types/nuxt-better-auth-nitro.d.ts',
    'types/nitro-imports.d.ts',
    'types/auth-database.d.ts',
    'types/auth-schema.d.ts',
    'types/auth-secondary-storage.d.ts',
    'hub/db.d.ts',
  ]

  for (const reference of serverOnlyReferences)
    expect(sharedReferences).not.toContain(reference)
}

function expectServerContextToAvoidNuxthubAugmentation(fixtureDir: string) {
  const contents = readFileSync(`${fixtureDir}/.nuxt/types/nuxt-better-auth-server-context.d.ts`, 'utf8')
  expect(contents).not.toContain('declare module \'@nuxthub/db\'')
  expect(contents).not.toContain('declare module "@nuxthub/db"')
}

function expectNuxtTypesToStayClientSafe(fixtureDir: string) {
  const contents = readFileSync(`${fixtureDir}/.nuxt/nuxt.d.ts`, 'utf8')
  expect(contents).toContain('types/nuxt-better-auth-config-context.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-infer.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-social-providers.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-nitro.d.ts')
}

function expectSharedTypesToIncludeOnlySafeConfigContext(fixtureDir: string) {
  const contents = readFileSync(`${fixtureDir}/.nuxt/nuxt.shared.d.ts`, 'utf8')
  expect(contents).toContain('types/nuxt-better-auth-config-context.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-infer.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-social-providers.d.ts')
  expect(contents).not.toContain('types/nuxt-better-auth-nitro.d.ts')
}

describe('server auth config project-reference typecheck regression #309', () => {
  it('typechecks a layered auth config that uses Nitro auto-imported helpers', () => {
    const fixtureDir = fileURLToPath(new URL('./cases/layer-server-auth-typecheck', import.meta.url))
    runProjectReferenceTypecheck(fixtureDir)
    expectSharedTypeReferencesToStayClientSafe(fixtureDir)
    expectServerContextToAvoidNuxthubAugmentation(fixtureDir)
    expectNuxtTypesToStayClientSafe(fixtureDir)
    expectSharedTypesToIncludeOnlySafeConfigContext(fixtureDir)
  }, 60_000)

  it('typechecks auth config imports that use the #server alias', () => {
    const fixtureDir = fileURLToPath(new URL('./cases/server-auth-alias-typecheck', import.meta.url))
    runProjectReferenceTypecheck(fixtureDir)
    expectSharedTypeReferencesToStayClientSafe(fixtureDir)
    expectServerContextToAvoidNuxthubAugmentation(fixtureDir)
    expectNuxtTypesToStayClientSafe(fixtureDir)
    expectSharedTypesToIncludeOnlySafeConfigContext(fixtureDir)
  }, 60_000)
})
