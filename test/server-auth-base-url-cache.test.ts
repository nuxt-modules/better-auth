import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('serverAuth baseURL inference', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/base-url-inference', import.meta.url)),
  })

  it('derives baseURL from each request host when siteUrl is unset', async () => {
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
    expect(firstBody.baseURL).toBe('https://first.example.com')
    expect(secondBody.appName).toBe('https://second.example.com')
    expect(secondBody.baseURL).toBe('https://second.example.com')
  })
})
