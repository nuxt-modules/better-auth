import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('#auth/schema export', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/auth-schema-export', import.meta.url)),
  })

  it('exports stable auth tables (user + verification)', async () => {
    const res = await $fetch('/api/test/schema') as { hasUser: boolean, hasVerification: boolean }
    expect(res.hasUser).toBe(true)
    expect(res.hasVerification).toBe(true)
  })
})
