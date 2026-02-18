import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('auth.redirects option', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/core-auth-redirects', import.meta.url)),
  })

  it('redirects unauthenticated users to redirects.login and preserves requested url by default', async () => {
    const response = await fetch(url('/protected?foo=1'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/custom-login?redirect=%2Fprotected%3Ffoo%3D1')
  })

  it('redirects authenticated users on guest routes to redirects.guest', async () => {
    const testUser = { email: `test-${Date.now()}@example.com`, password: 'testpass123', name: 'Test User' }

    const signupRes = await fetch(url('/api/auth/sign-up/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    expect(signupRes.status).toBe(200)
    const cookies = signupRes.headers.get('set-cookie') || ''

    const res = await fetch(url('/login'), { redirect: 'manual', headers: { cookie: cookies } })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/protected')
  })
})
