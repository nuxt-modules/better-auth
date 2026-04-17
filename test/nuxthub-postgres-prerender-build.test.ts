import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/nuxthub-postgres-hyperdrive-imports', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nuxt_better_auth_hyperdrive_demo',
  HYPERDRIVE_ID: 'dummy-hyperdrive-id',
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return walk(path)
    return [path]
  })
}

function readGeneratedPrerenderOutput(): string {
  const prerenderDir = join(fixtureDir, '.nuxt/prerender')
  if (!statSync(prerenderDir, { throwIfNoEntry: false })?.isDirectory())
    return ''

  return walk(prerenderDir)
    .filter(path => /\.(?:mjs|js)$/.test(path))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n')
}

describe('nuxthub postgresql prerender build', () => {
  it('does not emit broken relative @nuxthub/db imports in prerender output', () => {
    const build = spawnSync('npx', ['nuxi', 'build'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })

    expect(build.status, `nuxi build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)

    const generatedDatabase = readFileSync(`${fixtureDir}/.nuxt/better-auth/database.mjs`, 'utf8')
    const prerenderOutput = readGeneratedPrerenderOutput()

    expect(generatedDatabase).toContain('import { db } from \'@nuxthub/db\'')
    expect(prerenderOutput).not.toContain('../../../../@nuxthub')
    expect(prerenderOutput).not.toContain('/@nuxthub/db/db.mjs')
    expect(prerenderOutput).not.toContain('node_modules/.cache/nuxt/.nuxt/better-auth/database.mjs')
  }, 120_000)
})
