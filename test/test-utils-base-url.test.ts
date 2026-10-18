import { fileURLToPath } from 'node:url'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { afterEach, describe, expect, it } from 'vitest'
import { createAuthTestContext } from '@nuxtjs/better-auth/test-utils/e2e'

const auth = await createAuthTestContext({
  rootDir: fileURLToPath(new URL('./cases/test-utils-base-url', import.meta.url)),
})

describe('auth E2E helpers under app.baseURL', async () => {
  await setup(auth.setupOptions)
  afterEach(() => auth.clear())

  it('creates, logs in, and clears users below the fixture base path', async () => {
    const user = await auth.createUser({ name: 'Nested viewer', role: 'viewer' })
    const login = await auth.login({ userId: user.id })
    const me = await $fetch('/app/api/me', { headers: login.headers })
    expect(me.user.id).toBe(user.id)

    await auth.clear()

    const response = await fetch(url('/app/api/me'), { headers: login.headers })
    expect(response.status).toBe(401)
    await auth.clear()
    await expect(auth.login({ userId: user.id })).rejects.toThrow('403')
  })

  it('keeps the prefixed bridge private to its test context', async () => {
    const response = await fetch(url('/app/api/auth/__test__'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'createUser', data: {} }),
    })
    expect(response.status).toBe(404)
    await expect((await createAuthTestContext()).createUser()).rejects.toThrow('404')
  })
})
