import { fileURLToPath } from 'node:url'
import { hasNuxtModule } from '@nuxt/kit'
import { $fetch, setup, useTestContext } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('no-db mode (NuxtHub without database)', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/database-less', import.meta.url)),
  })

  it('renders home page without database', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Database-less Mode')
  })

  it('auth API responds without database', async () => {
    const response = await $fetch('/api/auth/ok')
    expect(response).toEqual({ ok: true })
  })

  it('exposes runtime database metadata as none', async () => {
    expect(hasNuxtModule('@nuxthub/core', useTestContext().nuxt)).toBe(true)
    const response = await $fetch('/api/test/config') as { useDatabase: boolean, databaseProvider: string }
    expect(response.useDatabase).toBe(false)
    expect(response.databaseProvider).toBe('none')
  })
})
