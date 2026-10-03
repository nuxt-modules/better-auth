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
    for (const key of ['raw', 'create', 'native'])
      Reflect.deleteProperty(requestFetch, key)
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

  it('preserves raw responses and routes auth requests to the external server', async () => {
    runtimeConfig.public.auth.clientOnly = true
    const response = { _data: { ok: true }, status: 200 }
    const raw = vi.fn().mockResolvedValue(response)
    Object.assign(requestFetch, { raw })
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')

    expect(await useAuthRequestFetch().raw('/api/auth/get-session', {
      headers: { 'x-client': 'nuxt' },
    })).toBe(response)

    expect(raw).toHaveBeenCalledWith('/get-session', {
      headers: { 'x-client': 'nuxt' },
      baseURL: 'https://auth.example.com/api/auth',
      credentials: 'include',
    })
  })

  it('preserves configured fetch instances and their native fetch implementation', async () => {
    runtimeConfig.public.auth.clientOnly = true
    const childFetch = vi.fn().mockResolvedValue({ ok: true })
    const childRaw = vi.fn().mockResolvedValue({ _data: { ok: true } })
    const native = vi.fn()
    const create = vi.fn(() => Object.assign(childFetch, { raw: childRaw, native, create: vi.fn() }))
    Object.assign(requestFetch, { create, native })
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')
    const fetch = useAuthRequestFetch()
    const defaults = { headers: { 'x-default': 'nuxt' } }
    const configuredFetch = fetch.create(defaults)

    expect(create).toHaveBeenCalledExactlyOnceWith(defaults)
    expect(fetch.native).toBe(native)
    expect(configuredFetch.native).toBe(native)
    await configuredFetch('/api/auth/get-session')
    await configuredFetch.raw('/api/report', { method: 'POST' })

    expect(childFetch).toHaveBeenCalledWith('/get-session', {
      baseURL: 'https://auth.example.com/api/auth',
      credentials: 'include',
    })
    expect(childRaw).toHaveBeenCalledWith('/api/report', { method: 'POST' })
  })

  it.each(['/api/report', '/api/authors', 'https://app.example.com/api/report', new Request('https://app.example.com/api/report')])('preserves native requests for %s in client-only mode', async (request) => {
    runtimeConfig.public.auth.clientOnly = true
    const response = { total: 1 }
    requestFetch.mockResolvedValue(response)
    const { useAuthRequestFetch } = await import('../src/runtime/app/composables/useAuthRequestFetch')
    const options = { credentials: 'omit' as const, headers: { 'x-client': 'nuxt' } }

    expect(await useAuthRequestFetch()(request, options)).toBe(response)
    expect(requestFetch).toHaveBeenCalledWith(request, options)
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
