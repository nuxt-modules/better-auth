import { fileURLToPath } from 'node:url'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('nuxt-better-auth module', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/core-auth', import.meta.url)),
  })

  describe('page rendering', () => {
    it('renders home page with BetterAuthState component', async () => {
      const html = await $fetch('/')
      expect(html).toContain('Home')
      expect(html).toContain('Not logged in')
    })

    it('does not expose devtools config endpoint in production', async () => {
      const response = await fetch(url('/api/_better-auth/config'))
      expect(response.status).toBe(404)
    })

    it('exposes runtime database metadata as nuxthub', async () => {
      const response = await $fetch('/api/test/config') as { useDatabase: boolean, databaseProvider: string }
      expect(response.useDatabase).toBe(true)
      expect(response.databaseProvider).toBe('nuxthub')
    })
  })

  describe('route protection', () => {
    it('redirects unauthenticated users from protected routes', async () => {
      const html = await $fetch('/protected')
      expect(html).toContain('login')
    })

    it('preserves requested url in redirect query by default', async () => {
      const response = await fetch(url('/protected?foo=1'), { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/login?redirect=%2Fprotected%3Ffoo%3D1')
    })

    it('allows access to guest routes when unauthenticated', async () => {
      const html = await $fetch('/login')
      expect(html).toContain('Login')
    })

    it('redirects to custom login when redirectTo is set', async () => {
      const response = await fetch(url('/custom-protected'), { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/custom-login?redirect=%2Fcustom-protected')
    })

    it('preserves requested url for object auth rules (e.g. role-based)', async () => {
      const response = await fetch(url('/admin?foo=1'), { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/login?redirect=%2Fadmin%3Ffoo%3D1')
    })

    it('applies auth from route rules to dynamic catch-all routes', async () => {
      const response = await fetch(url('/dynamic/protected'), { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/login?redirect=%2Fdynamic%2Fprotected')
    })

    it('does not override redirect query if already present in redirectTo', async () => {
      const response = await fetch(url('/custom-protected-has-redirect?foo=1'), { redirect: 'manual' })
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toContain('/custom-login?redirect=/')
      expect(response.headers.get('location')).not.toContain('%2Fcustom-protected-has-redirect%3Ffoo%3D1')
    })
  })

  describe('aPI protection', () => {
    it('returns 401 on protected API without auth', async () => {
      const response = await fetch(url('/api/test/me'))
      expect(response.status).toBe(401)
    })
  })

  describe('authenticated access', () => {
    const testUser = { email: `test-${Date.now()}@example.com`, password: 'testpass123', name: 'Test User' }
    let cookies: string

    it('signup and access protected API', async () => {
      // Sign up
      const signupRes = await fetch(url('/api/auth/sign-up/email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      })
      expect(signupRes.status).toBe(200)
      cookies = signupRes.headers.get('set-cookie') || ''

      // Access protected API with session
      const meRes = await fetch(url('/api/test/me'), { headers: { cookie: cookies } })
      expect(meRes.status).toBe(200)
      const data = await meRes.json()
      expect(data.email).toBe(testUser.email)
    })

    it('hydrates session on SSR', async () => {
      // Fetch home page with auth cookies - should show user name, not "Not logged in"
      const response = await fetch(url('/'), { headers: { cookie: cookies } })
      const html = await response.text()
      expect(html).toContain('Test User')
      expect(html).not.toContain('Not logged in')
    })
  })
})
