import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('#auth/schema export', async () => {
  const rootDir = fileURLToPath(new URL('./cases/auth-schema-export', import.meta.url))
  rmSync(join(rootDir, '.nuxt'), { force: true, recursive: true })

  const prepare = spawnSync('npx', ['nuxi', 'prepare'], {
    cwd: rootDir,
    encoding: 'utf8',
  })
  if (prepare.status !== 0)
    throw new Error(`clean nuxi prepare failed:\n${prepare.stdout}\n${prepare.stderr}`)

  await setup({
    rootDir,
  })

  it('exports stable auth tables with plural generation enabled', async () => {
    const res = await $fetch('/api/test/schema') as {
      hasUser: boolean
      hasNamedUser: boolean
      hasUsers: boolean
      hasSession: boolean
      hasNamedSession: boolean
      hasSessions: boolean
      hasAccount: boolean
      hasNamedAccount: boolean
      hasAccounts: boolean
      hasVerification: boolean
    }

    expect(res.hasUser).toBe(true)
    expect(res.hasNamedUser).toBe(true)
    expect(res.hasUsers).toBe(true)
    expect(res.hasSession).toBe(true)
    expect(res.hasNamedSession).toBe(true)
    expect(res.hasSessions).toBe(true)
    expect(res.hasAccount).toBe(true)
    expect(res.hasNamedAccount).toBe(true)
    expect(res.hasAccounts).toBe(true)
    expect(res.hasVerification).toBe(true)
  })
})
