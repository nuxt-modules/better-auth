import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('route protection preserveRedirect disabled', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/core-auth-no-preserve', import.meta.url)),
  })

  it('does not append redirect query when preserveRedirect is false', async () => {
    const response = await fetch(url('/protected?foo=1'), { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/login')
    expect(response.headers.get('location')).not.toContain('redirect=')
  })
})
