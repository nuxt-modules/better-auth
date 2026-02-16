import { fileURLToPath } from 'node:url'
import { loadNuxt } from 'nuxt'
import { describe, expect, it } from 'vitest'

describe('auth.redirects removal', () => {
  it('throws with migration guidance when auth.redirects is configured', async () => {
    const previousSecret = process.env.BETTER_AUTH_SECRET
    try {
      process.env.BETTER_AUTH_SECRET = 'test-secret-for-testing-only-32chars!'
      await expect(loadNuxt({
        cwd: fileURLToPath(new URL('./cases/core-auth-legacy-redirects', import.meta.url)),
        dev: false,
        ready: true,
        overrides: { _prepare: true },
      })).rejects.toThrow('`auth.redirects` has been removed')
    }
    finally {
      if (previousSecret === undefined)
        delete process.env.BETTER_AUTH_SECRET
      else
        process.env.BETTER_AUTH_SECRET = previousSecret
    }
  })
})
