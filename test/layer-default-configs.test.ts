import { fileURLToPath } from 'node:url'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('layer-aware default auth config discovery', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/layer-default-configs', import.meta.url)),
  })

  it('renders the extended layer app without explicit auth config overrides', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Home')
    expect(html).toContain('Not logged in')
  })

  it('uses auth routes backed by the extended layer default configs', async () => {
    const response = await fetch(url('/api/auth/sign-up/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `layer-${Date.now()}@example.com`,
        password: 'testpass123',
        name: 'Layer User',
      }),
    })

    expect(response.status).toBe(200)
  })
})
