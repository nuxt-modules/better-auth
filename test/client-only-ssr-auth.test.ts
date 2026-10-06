import { fileURLToPath } from 'node:url'
import { fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('client-only auth route middleware during SSR', async () => {
  await setup({ rootDir: fileURLToPath(new URL('./cases/client-only-ssr-auth', import.meta.url)) })

  it('renders a protected page without requesting the missing local session endpoint', async () => {
    const response = await fetch(url('/'))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('Protected page')
    expect(body).not.toContain('/api/auth/get-session')
  })
})
