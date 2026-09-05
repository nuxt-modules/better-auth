import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it, vi } from 'vitest'

describe('serverAuth production baseURL', async () => {
  vi.stubEnv('VERCEL_URL', 'deployment.example.com')
  afterAll(() => vi.unstubAllEnvs())
  await setup({
    rootDir: fileURLToPath(new URL('./cases/base-url-inference', import.meta.url)),
  })

  it('uses the platform origin regardless of forwarded request headers', async () => {
    const firstResponse = await fetch(url('/api/test/base-url'), {
      headers: {
        'x-forwarded-host': 'first.example.com',
        'x-forwarded-proto': 'https',
      },
    })
    expect(firstResponse.status).toBe(200)
    const firstBody = await firstResponse.json() as { appName: string | undefined, baseURL: string | undefined }

    const secondResponse = await fetch(url('/api/test/base-url'), {
      headers: {
        'x-forwarded-host': 'second.example.com',
        'x-forwarded-proto': 'https',
      },
    })
    expect(secondResponse.status).toBe(200)
    const secondBody = await secondResponse.json() as { appName: string | undefined, baseURL: string | undefined }

    expect(firstBody.appName).toBe('https://first.example.com')
    expect(firstBody.baseURL).toBe('https://deployment.example.com')
    // A canonical production origin shares one cached instance.
    expect(secondBody.appName).toBe('https://first.example.com')
    expect(secondBody.baseURL).toBe('https://deployment.example.com')
  })
})
