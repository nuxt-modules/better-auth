import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('auth route rules in dev with a module dev server handler', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/dev-server-handler-route-rules', import.meta.url)),
    dev: true,
  })

  it('starts and serves the dev server handler', async () => {
    const response = await fetch(url('/_assets/file.txt'))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('asset')
  })

  it('still protects Nitro routes', async () => {
    const response = await fetch(url('/api/auth-required'))
    expect(response.status).toBe(401)
  })
})
