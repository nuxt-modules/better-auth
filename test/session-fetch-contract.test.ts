import type { AuthUser, ClientAuthSession } from '#nuxt-better-auth'
import { createAuthClient } from 'better-auth/vue'
import { beforeEach, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const requestFetch = vi.hoisted(() => vi.fn())

vi.mock('#imports', () => ({
  useRequestFetch: () => requestFetch,
  useRequestHeaders: () => undefined,
}))

function createPopulatedState() {
  return {
    session: ref<ClientAuthSession | null>({ id: 'existing-session' } as ClientAuthSession),
    user: ref<AuthUser | null>({ id: 'existing-user' } as AuthUser),
    ready: ref(false),
  }
}

beforeEach(() => {
  requestFetch.mockReset()
})

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

it('clears prior client state when a successful response has no session', async () => {
  const { fetchSessionClient } = await import('../src/runtime/app/internal/session-fetch')
  const client = createAuthClient({
    baseURL: 'https://auth.example.test',
    fetchOptions: {
      customFetchImpl: async () => Response.json(null),
    },
  })
  const { session, user, ready } = createPopulatedState()

  await expect(fetchSessionClient(client, session, user, ready)).resolves.toBeUndefined()
  expect(session.value).toBeNull()
  expect(user.value).toBeNull()
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
  const { session, user, ready } = createPopulatedState()

  await expect(fetchSessionClient(client, session, user, ready)).resolves.toBeUndefined()
  expect(session.value).toBeNull()
  expect(user.value).toBeNull()
  expect(ready.value).toBe(true)
  await expect(client.getSession()).rejects.toMatchObject({ status: 401 })
})

it('preserves client session state and rejects when the auth backend returns 500', async () => {
  const { fetchSessionClient } = await import('../src/runtime/app/internal/session-fetch')
  const client = createAuthClient({
    baseURL: 'https://auth.example.test',
    fetchOptions: {
      customFetchImpl: async () => Response.json({ message: 'Database unavailable' }, { status: 500 }),
    },
  })
  const { session, user, ready } = createPopulatedState()

  await expect(fetchSessionClient(client, session, user, ready)).rejects.toThrow(
    '[nuxt-better-auth] Failed to fetch session: Database unavailable',
  )
  expect(session.value).toEqual({ id: 'existing-session' })
  expect(user.value).toEqual({ id: 'existing-user' })
  expect(ready.value).toBe(true)
})

it('preserves client session state and rethrows network failures', async () => {
  const { fetchSessionClient } = await import('../src/runtime/app/internal/session-fetch')
  const networkError = new TypeError('Network unavailable')
  const client = createAuthClient({
    baseURL: 'https://auth.example.test',
    fetchOptions: {
      customFetchImpl: async () => {
        throw networkError
      },
    },
  })
  const { session, user, ready } = createPopulatedState()

  await expect(fetchSessionClient(client, session, user, ready)).rejects.toBe(networkError)
  expect(session.value).toEqual({ id: 'existing-session' })
  expect(user.value).toEqual({ id: 'existing-user' })
  expect(ready.value).toBe(true)
})

it('preserves server session state and rethrows backend failures', async () => {
  const { fetchSessionServer } = await import('../src/runtime/app/internal/session-fetch')
  const backendError = Object.assign(new Error('Auth database unavailable'), { statusCode: 500 })
  requestFetch.mockRejectedValueOnce(backendError)
  const { session, user, ready } = createPopulatedState()

  await expect(fetchSessionServer(session, user, ready)).rejects.toBe(backendError)
  expect(session.value).toEqual({ id: 'existing-session' })
  expect(user.value).toEqual({ id: 'existing-user' })
  expect(ready.value).toBe(true)
})
