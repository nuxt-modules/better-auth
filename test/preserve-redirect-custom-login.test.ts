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

  it('preserves login query values and the entire hash in server redirects', async () => {
    const response = await fetch(url('/custom-protected?foo=1'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    const location = response.headers.get('location') || ''

    expect(location).toBe('/custom-login?scope=read&scope=write&next=/app?tab=details&mode=email&redirect=%2Fcustom-protected%3Ffoo%3D1#top#bottom')
    const target = new URL(location, url('/'))
    expect(target.searchParams.getAll('scope')).toEqual(['read', 'write'])
    expect(target.searchParams.get('next')).toBe('/app?tab=details')
    expect(target.searchParams.get('mode')).toBe('email')
    expect(target.searchParams.get('redirect')).toBe('/custom-protected?foo=1')
    expect(target.hash).toBe('#top#bottom')
  })
})
