import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('route protection preserveRedirect with custom query key', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/core-auth-custom-redirect-key', import.meta.url)),
  })

  it('uses redirectQueryKey for redirect query param', async () => {
    const response = await fetch(url('/protected?foo=1'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''
    expect(location).toContain('/login?returnTo=%2Fprotected%3Ffoo%3D1')
    expect(location).not.toContain('redirect=')
  })
})
