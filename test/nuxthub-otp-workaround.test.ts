import { fileURLToPath } from 'node:url'
import { setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('nuxthub otp schema', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./cases/nuxthub-otp-workaround', import.meta.url)),
  })

  it('send-verification-otp succeeds (verification table present)', async () => {
    const res = await fetch(url('/api/auth/email-otp/send-verification-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `test-${Date.now()}@example.com`, type: 'sign-in' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { success?: boolean }
    expect(body.success).toBe(true)
  })
})
