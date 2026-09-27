import { fileURLToPath } from 'node:url'
import { fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('auth under app.baseURL', async () => {
  await setup({ rootDir: fileURLToPath(new URL('./cases/app-base-url', import.meta.url)) })

  it('serves auth endpoints below the app base path', async () => {
    const response = await fetch(url('/app/api/auth/ok'))
    expect(response.status).toBe(200)
  })

  it('uses the app base path in generated auth URLs', async () => {
    const response = await fetch(url('/app/api/auth-base'))
    expect(response.status).toBe(200)
    expect(new URL(await response.text()).pathname).toBe('/app/api/auth')
  })
})
