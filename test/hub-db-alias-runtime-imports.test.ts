import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function ensureBuild(): void {
  const build = spawnSync('pnpm', ['exec', 'nuxt-module-build', 'build'], {
    encoding: 'utf8',
    env: process.env,
  })
  expect(build.status, `nuxt-module-build failed:\n${build.stdout}\n${build.stderr}`).toBe(0)
}

describe('@nuxthub/db runtime imports', () => {
  it('emits runtime-safe @nuxthub/db imports and avoids broken hub aliases in built runtime files', () => {
    ensureBuild()

    const moduleOutput = readFileSync('dist/module.mjs', 'utf8')
    const accountsOutput = readFileSync('dist/runtime/server/api/_better-auth/accounts.get.js', 'utf8')
    const sessionsOutput = readFileSync('dist/runtime/server/api/_better-auth/sessions.get.js', 'utf8')
    const deleteSessionOutput = readFileSync('dist/runtime/server/api/_better-auth/sessions.delete.js', 'utf8')
    const usersOutput = readFileSync('dist/runtime/server/api/_better-auth/users.get.js', 'utf8')

    expect(moduleOutput).not.toContain('resolveModule("@nuxthub/db"')
    expect(moduleOutput).not.toContain('relativeHubDbPath')
    expect(moduleOutput).not.toContain('node_modules/@nuxthub/db')
    expect(moduleOutput).not.toContain(`import { db } from 'hub:db'`)
    expect(moduleOutput).not.toContain(`import { db } from '#imports'`)
    expect(moduleOutput).not.toContain('nitropack/runtime')
    expect(moduleOutput).not.toContain('useNitroApp')
    expect(moduleOutput).not.toContain('../hub/db.mjs')

    for (const output of [accountsOutput, sessionsOutput, deleteSessionOutput, usersOutput]) {
      expect(output).toContain('@nuxthub/db')
      expect(output).not.toContain(`import { db } from 'hub:db'`)
      expect(output).not.toContain('../hub/db.mjs')
    }
  }, 20_000)
})
