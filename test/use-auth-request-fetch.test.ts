import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientOptions: { baseURL?: string, basePath?: string } = {}

vi.mock('#auth/client', () => ({
  default: { resolveOptions: (siteUrl: string) => ({ baseURL: siteUrl, ...clientOptions }) },
}))

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
    delete clientOptions.baseURL
    delete clientOptions.basePath
    requestFetch.mockReset()
    useRequestFetch.mockClear()
    runtimeConfig.public.auth.clientOnly = false
    runtimeConfig.public.siteUrl = 'https://auth.example.com'
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
    expect(requestFetch).toHaveBeenCalledWith('/get-session', {
      headers: { 'x-client': 'nuxt' },
      baseURL: 'https://auth.example.com/api/auth',
      credentials: 'include',
    })
  })

  it.each([
    [{ baseURL: '' }, '/api/auth'],
    [{ baseURL: '', basePath: '/custom/auth' }, '/custom/auth'],
    [{ baseURL: '', basePath: 'custom/auth' }, '/custom/auth'],
    [{ basePath: '/custom/auth' }, 'https://auth.example.com/custom/auth'],
    [{ basePath: 'custom/auth' }, 'https://auth.example.com/custom/auth'],
    [{ basePath: '/' }, 'https://auth.example.com'],
    [{ baseURL: 'https://other.example.com/', basePath: '/custom/auth' }, 'https://other.example.com/custom/auth'],
    [{ baseURL: 'https://other.example.com/backend', basePath: '/custom/auth' }, 'https://other.example.com/backend'],
  ])('honors resolved client options %j', async (options, baseURL) => {
    runtimeConfig.public.auth.clientOnly = true
    Object.assign(clientOptions, options)
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')

    await useAuthRequestFetch()('/api/auth/get-session')

    expect(requestFetch).toHaveBeenCalledWith('/get-session', {
      baseURL,
      credentials: 'include',
    })
  })

  it.each([
    [undefined, '/api/auth'],
    ['custom/auth', '/custom/auth'],
  ])('uses a root-relative auth URL when siteUrl is empty and basePath is %s', async (basePath, baseURL) => {
    runtimeConfig.public.auth.clientOnly = true
    runtimeConfig.public.siteUrl = ''
    clientOptions.basePath = basePath
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')

    await useAuthRequestFetch()('/api/auth/get-session')

    expect(requestFetch).toHaveBeenCalledWith('/get-session', {
      baseURL,
      credentials: 'include',
    })
  })
})
