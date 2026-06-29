import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/nuxthub-prerender-db', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nuxt_better_auth_prerender_demo',
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory())
      return walk(path)
    return [path]
  })
}

function getGeneratedOutputDir(): string | null {
  const candidateDirs = [
    join(fixtureDir, '.nuxt/prerender'),
    join(fixtureDir, '.output/server'),
  ]
  return candidateDirs.find(dir => statSync(dir, { throwIfNoEntry: false })?.isDirectory()) ?? null
}

function readGeneratedPrerenderOutput(): string {
  const outputDir = getGeneratedOutputDir()
  if (!outputDir)
    return ''
  return walk(outputDir)
    .filter(path => /\.(?:mjs|js)$/.test(path))
    .map(path => readFileSync(path, 'utf8'))
    .join('\n')
}

function readNitroEntry(outputDir: string): string {
  const candidates = [
    join(outputDir, 'chunks/nitro/nitro.mjs'),
    join(outputDir, 'nitro.mjs'),
  ]

  const entry = candidates.find(path => statSync(path, { throwIfNoEntry: false })?.isFile())
  return entry ? readFileSync(entry, 'utf8') : ''
}

function readGeneratedAuthDatabase(): string {
  const path = join(fixtureDir, '.nuxt/better-auth/database.mjs')
  return readFileSync(path, 'utf8')
}

describe('nuxthub prerender @nuxthub/db imports', () => {
  it('keeps @nuxthub/db external and resolves Hyperdrive per request', () => {
    const build = spawnSync('npx', ['nuxi', 'build'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })

    expect(build.status, `nuxi build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)

    const outputDir = getGeneratedOutputDir()
    expect(outputDir).not.toBeNull()

    const prerenderOutput = readGeneratedPrerenderOutput()
    const nitroEntry = readNitroEntry(outputDir!)
    const authDatabase = readGeneratedAuthDatabase()

    expect(nitroEntry).toMatch(/import\s+\{\s*db\s*\}\s+from\s+['"][^'"]*@nuxthub\/db(?:\/db\.mjs)?['"]/)
    // The bug emits a broken relative path like `../../../../../../../../@nuxthub/db/db.mjs`
    // that escapes the build dir and crashes the prerender step.
    expect(prerenderOutput).not.toMatch(/\.\.\/\.\.\/\.\.\/\.\.\/[^'"`]*@nuxthub\/db/)
    // The generated better-auth database template must not be inlined into the prerender output.
    expect(prerenderOutput).not.toContain('node_modules/.cache/nuxt/.nuxt/better-auth/database.mjs')
    expect(authDatabase).toContain('export function createDatabase(event)')
    expect(authDatabase).toContain('event?.context?.cloudflare')
    expect(authDatabase).toContain('cloudflareEnv?.POSTGRES')
    expect(authDatabase).toContain('cloudflareContext.context.waitUntil(cleanup)')
  }, 120_000)
})
