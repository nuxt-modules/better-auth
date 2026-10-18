import { fileURLToPath } from 'node:url'
import { $fetch, getBrowser, setup, url } from '@nuxt/test-utils/e2e'
import { afterEach, describe, expect, it } from 'vitest'
import { createAuthTestContext } from '@nuxtjs/better-auth/test-utils/e2e'

const auth = await createAuthTestContext({
  rootDir: fileURLToPath(new URL('./cases/test-utils', import.meta.url)),
  browser: true,
  env: { NUXT_PUBLIC_SITE_URL: 'https://app.example.test' },
  nuxtConfig: { auth: { redirects: { logout: '/signed-out' } } },
})

describe('auth E2E test helpers', async () => {
  await setup(auth.setupOptions)
  afterEach(async () => {
    await auth.clear()
  })

  it('creates a real session used by protected APIs, SSR, hydration, and logout', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z')
    const user = await auth.createUser({ name: 'Test viewer', role: 'viewer', createdAt })
    expect(user.createdAt).toEqual(createdAt)
    const login = await auth.login({ userId: user.id })
    expect(login.user.id).toBe(user.id)
    expect(login.cookies[0]?.domain).toBe('127.0.0.1')
    expect(login.session.createdAt).toBeInstanceOf(Date)
    const me = await $fetch('/api/me', { headers: login.headers })
    expect(me.user.role).toBe('viewer')
    expect(me.session.label).toBe('fixture')
    const html = await $fetch<string>('/protected', { headers: login.headers })
    expect(html).toContain('Test viewer')

    const context = await (await getBrowser()).newContext()
    try {
      await context.addCookies(login.cookies)
      const page = await context.newPage()
      await page.goto(url('/protected'))
      await page.waitForFunction(() => document.querySelector('#hydrated')?.textContent === 'true')
      expect(await page.locator('#user').textContent()).toBe('Test viewer')
      expect(await page.locator('#label').textContent()).toBe('fixture')
      await page.getByRole('button', { name: 'Sign out' }).click()
      await page.waitForURL('**/signed-out')
      expect((await context.request.get(url('/api/me'))).status()).toBe(401)
    }
    finally {
      await context.close()
    }
  })

  it('deletes only its own users and sessions and can be cleared repeatedly', async () => {
    const user = await auth.createUser({ role: 'viewer' })
    const login = await auth.login({ userId: user.id })
    await auth.clear()
    const response = await fetch(url('/api/me'), { headers: login.headers })
    expect(response.status).toBe(401)
    await auth.clear()
    await expect(auth.login({ userId: user.id })).rejects.toThrow('403')
  })

  it('rejects unauthenticated requests and another test context', async () => {
    const response = await fetch(url('/api/auth/__test__'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'createUser', data: {} }),
    })
    expect(response.status).toBe(404)
    await expect((await createAuthTestContext()).createUser()).rejects.toThrow('404')
  })
})
