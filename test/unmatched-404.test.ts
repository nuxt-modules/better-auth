import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('unmatched routes under a catch-all auth rule', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/unmatched-404', import.meta.url)),
  })

  it('returns 404 for a url that matches no page', async () => {
    const response = await fetch(url('/missing'), { redirect: 'manual' })
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBe(null)
  })

  it('still redirects unauthenticated users away from matched protected pages', async () => {
    const response = await fetch(url('/'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/login?redirect=%2F')
  })

  it('keeps serving pages excluded from the catch-all rule', async () => {
    const response = await fetch(url('/login'), { redirect: 'manual' })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('Login Page')
  })
})
