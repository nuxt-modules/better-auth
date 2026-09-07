import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestFetch = vi.fn()
const useRequestFetch = vi.fn(() => requestFetch)
const runtimeConfig = {
  public: {
    siteUrl: 'https://auth.example.com',
    auth: {
      clientOnly: false,
    },
  },
}

vi.mock('#imports', () => ({
  useRequestFetch,
  useRuntimeConfig: () => runtimeConfig,
}))

describe('useAuthRequestFetch', () => {
  beforeEach(() => {
    requestFetch.mockReset()
    useRequestFetch.mockClear()
    runtimeConfig.public.auth.clientOnly = false
  })

  it('preserves request-scoped fetch in normal mode', async () => {
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')

    expect(useAuthRequestFetch()).toBe(requestFetch)
  })

  it('targets the external auth server with credentials in client-only mode', async () => {
    runtimeConfig.public.auth.clientOnly = true
    requestFetch.mockResolvedValue({ ok: true })
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')

    await useAuthRequestFetch()('/api/auth/get-session', {
      headers: { 'x-client': 'nuxt' },
    })

    expect(useRequestFetch).toHaveBeenCalledOnce()
    expect(requestFetch).toHaveBeenCalledWith('/api/auth/get-session', {
      headers: { 'x-client': 'nuxt' },
      baseURL: 'https://auth.example.com',
      credentials: 'include',
    })
  })
})
