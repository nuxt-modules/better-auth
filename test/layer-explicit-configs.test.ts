import { fileURLToPath } from 'node:url'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('layer-aware explicit auth config discovery', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/layer-explicit-configs', import.meta.url)),
  })

  it('renders the extended layer app using inherited explicit auth config paths', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Home')
    expect(html).toContain('Not logged in')
  })

  it('uses auth routes backed by the inherited explicit config paths', async () => {
    const response = await fetch(url('/api/auth/sign-up/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `explicit-layer-${Date.now()}@example.com`,
        password: 'testpass123',
        name: 'Explicit Layer User',
      }),
    })

    expect(response.status).toBe(200)
  })
})
