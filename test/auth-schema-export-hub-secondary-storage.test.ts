import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('#auth/schema export with hubSecondaryStorage', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/auth-schema-export-hub-secondary-storage', import.meta.url)),
  })

  it('exports stable auth tables (user + account + session + verification)', async () => {
    const res = await $fetch('/api/test/schema') as {
      hasUser: boolean
      hasAccount: boolean
      hasSession: boolean
      hasVerification: boolean
    }

    expect(res.hasUser).toBe(true)
    expect(res.hasAccount).toBe(true)
    expect(res.hasSession).toBe(true)
    expect(res.hasVerification).toBe(true)
  })
})
