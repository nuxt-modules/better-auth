import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./cases/nuxthub-postgres-hyperdrive-imports', import.meta.url))
const env = {
  ...process.env,
  BETTER_AUTH_SECRET: 'test-secret-for-testing-only-32chars',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/nuxt_better_auth_hyperdrive_demo',
  HYPERDRIVE_ID: 'dummy-hyperdrive-id',
}

describe('nuxthub postgresql prepare output', () => {
  it('generates better-auth database files that avoid the broken relative hub/db path', () => {
    const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
      cwd: fixtureDir,
      env,
      encoding: 'utf8',
    })

    expect(prepare.status, `nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`).toBe(0)

    const generatedDatabase = readFileSync(`${fixtureDir}/.nuxt/better-auth/database.mjs`, 'utf8')

    expect(generatedDatabase).toContain('import { db } from \'@nuxthub/db\'')
    expect(generatedDatabase).not.toContain('node_modules/@nuxthub/db')
    expect(generatedDatabase).not.toContain('@nuxthub/db/db.mjs')
    expect(generatedDatabase).not.toContain(`await import('@nuxthub/db')`)
    expect(generatedDatabase).not.toContain(`import { db } from '#imports'`)
    expect(generatedDatabase).not.toContain(`import { db } from 'hub:db'`)
    expect(generatedDatabase).not.toContain('nitropack/runtime')
    expect(generatedDatabase).not.toContain('useNitroApp')
    expect(generatedDatabase).not.toContain('../hub/db.mjs')
  }, 60_000)
})
