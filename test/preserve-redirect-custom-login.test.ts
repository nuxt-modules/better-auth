import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('route protection preserveRedirect with custom login', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/core-auth-custom-login', import.meta.url)),
  })

  it('redirects to custom login and preserves requested url by default', async () => {
    const response = await fetch(url('/protected?foo=1'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/custom-login?redirect=%2Fprotected%3Ffoo%3D1')
  })
})
