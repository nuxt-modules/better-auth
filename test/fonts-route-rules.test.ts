import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('auth route rules with @nuxt/fonts', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/fonts-route-rules', import.meta.url)),
    dev: true,
  })

  it('starts and serves font assets below app.baseURL', async () => {
    const response = await fetch(url('/dashboard/_fonts/auth-route-rules-test.woff2'))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('test font')
  })

  it('returns 404 for a missing font', async () => {
    const response = await fetch(url('/dashboard/_fonts/missing.woff2'))
    expect(response.status).toBe(404)
  })

  it('still protects Nitro routes after a dev handler falls through', async () => {
    const response = await fetch(url('/dashboard/api/auth-required'))
    expect(response.status).toBe(401)
    expect(response.headers.get('x-test-dev-handler')).toBe('fallthrough')
  })
})
