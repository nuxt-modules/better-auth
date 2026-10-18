import { createAuthTestContext } from '@nuxtjs/better-auth/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('auth test setup options', () => {
  it('merges Nuxt setup options while keeping the port and auth origin together', async () => {
    const { setupOptions } = await createAuthTestContext({
      port: 43210,
      rootDir: '/test/fixture',
      browser: true,
      env: { NUXT_PUBLIC_SITE_URL: 'https://app.example.test', TEST_VALUE: 'kept' },
      nuxtConfig: {
        modules: ['consumer-module'],
        runtimeConfig: { public: { siteUrl: 'https://app.example.test', testValue: 'kept' } },
      },
    })
    expect(setupOptions).toMatchObject({
      port: 43210,
      rootDir: '/test/fixture',
      browser: true,
      dev: false,
      env: { NUXT_PUBLIC_SITE_URL: 'http://127.0.0.1:43210', TEST_VALUE: 'kept' },
      nuxtConfig: {
        test: true,
        runtimeConfig: { public: { siteUrl: 'http://127.0.0.1:43210', testValue: 'kept' } },
      },
    })
    expect(setupOptions.nuxtConfig?.modules).toContain('consumer-module')
  })

  it.each([{ dev: true }, { host: 'https://preview.example.test' }, { build: false }, { server: false }])(
    'rejects options that cannot install the local test bridge: %j',
    async (options) => {
      await expect(createAuthTestContext(options)).rejects.toThrow('require a local test build')
    },
  )
})
