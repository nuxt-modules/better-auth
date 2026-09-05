import { createAuthClient } from 'better-auth/vue'
import { expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('#imports', () => ({ useRequestHeaders: () => undefined }))

it.each([false, true])('loads a session with global fetchOptions.throw=%s', async (throwErrors) => {
  const { fetchSessionClient } = await import('../src/runtime/app/internal/session-fetch')
  const client = createAuthClient({
    baseURL: 'https://auth.example.test',
    fetchOptions: {
      throw: throwErrors,
      customFetchImpl: async () => Response.json({ session: { id: 's', token: 'private' }, user: { id: 'u' } }),
    },
  })
  const session = ref(null)
  const user = ref(null)
  const ready = ref(false)

  await fetchSessionClient(client, session, user, ready)

  expect(session.value).toEqual({ id: 's' })
  expect(user.value).toEqual({ id: 'u' })
  expect(ready.value).toBe(true)
})

it('keeps the configured error behavior for other client calls', async () => {
  const { fetchSessionClient } = await import('../src/runtime/app/internal/session-fetch')
  const client = createAuthClient({
    baseURL: 'https://auth.example.test',
    fetchOptions: {
      throw: true,
      customFetchImpl: async () => Response.json({ message: 'Unauthorized' }, { status: 401 }),
    },
  })
  const session = ref(null)
  const user = ref(null)
  const ready = ref(false)

  await expect(fetchSessionClient(client, session, user, ready)).resolves.toBeUndefined()
  expect(ready.value).toBe(true)
  await expect(client.getSession()).rejects.toMatchObject({ status: 401 })
})
