import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requestEvent: {} as object | undefined,
  requestFetch: vi.fn(async () => ({ ok: true })),
  requestHeaders: new Headers({ 'sec-fetch-site': 'same-origin' }),
  requestOrigin: 'https://app.example',
  runtimeConfig: {
    public: {
      auth: { clientOnly: false },
    },
  },
}))

vi.mock('#imports', () => ({
  useRequestHeader: (name: string) => mocks.requestHeaders.get(name) ?? undefined,
  useRequestEvent: () => mocks.requestEvent,
  useRequestFetch: () => mocks.requestFetch,
  useRequestURL: () => ({ origin: mocks.requestOrigin }),
  useRuntimeConfig: () => mocks.runtimeConfig,
}))

async function loadRequestFetch() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useAuthRequestFetch')
  return mod.useAuthRequestFetch() as (request: unknown, options?: Record<string, any>) => Promise<unknown>
}

function lastOptions(): Record<string, any> | undefined {
  return mocks.requestFetch.mock.calls.at(-1)?.[1]
}

describe('useAuthRequestFetch', () => {
  beforeEach(() => {
    mocks.requestEvent = {}
    mocks.requestFetch.mockClear()
    mocks.requestHeaders = new Headers({ 'sec-fetch-site': 'same-origin' })
    mocks.requestOrigin = 'https://app.example'
    mocks.runtimeConfig.public.auth.clientOnly = false
  })

  it('returns the original fetch outside request SSR and in client-only mode', async () => {
    mocks.requestEvent = undefined
    expect(await loadRequestFetch()).toBe(mocks.requestFetch)

    mocks.requestEvent = {}
    mocks.runtimeConfig.public.auth.clientOnly = true
    expect(await loadRequestFetch()).toBe(mocks.requestFetch)
  })

  it('adds the request origin to local auth mutations without mutating caller options', async () => {
    const requestFetch = await loadRequestFetch()
    const options = {
      method: 'POST',
      headers: { 'x-request-shape': 'object' },
      body: { value: true },
    }

    await requestFetch('/api/auth/test', options)

    expect(lastOptions()).toEqual({
      ...options,
      headers: {
        'origin': 'https://app.example',
        'x-request-shape': 'object',
      },
    })
    expect(options).toEqual({
      method: 'POST',
      headers: { 'x-request-shape': 'object' },
      body: { value: true },
    })
  })

  it('does not overwrite cross-site provenance forwarded from the incoming request', async () => {
    mocks.requestHeaders = new Headers({
      'origin': 'https://outside.example',
      'referer': 'https://outside.example/page',
      'sec-fetch-site': 'cross-site',
    })
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', {
      method: 'POST',
      headers: { 'x-request-shape': 'object' },
    })

    expect(lastOptions()?.headers).toEqual({
      'x-request-shape': 'object',
    })
  })

  it.each([
    [{ origin: 'https://outside.example' }],
    [{ 'origin': '', 'sec-fetch-site': 'same-origin' }],
    [{ referer: 'https://outside.example/page' }],
    [{ 'sec-fetch-site': 'same-site' }],
    [{ 'sec-fetch-site': 'cross-site' }],
    [{ 'sec-fetch-site': 'none' }],
    [{}],
  ])('does not attest incoming provenance %o as same-origin', async (incomingHeaders) => {
    mocks.requestHeaders = new Headers(incomingHeaders)
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', { method: 'POST' })

    expect(mocks.requestFetch).toHaveBeenCalledWith('/api/auth/test', { method: 'POST' })
  })

  it.each(['/api/auth', '/api/auth?probe=1', '/api/auth/test', '/api/auth/test?probe=1'])('recognizes the local auth route boundary for %s', async (request) => {
    const requestFetch = await loadRequestFetch()

    await requestFetch(request, { method: 'POST', baseURL: '/' })

    expect(lastOptions()?.headers).toEqual({ origin: 'https://app.example' })
  })

  it.each([
    [[['x-request-shape', 'tuple']]],
    [new Headers({ 'x-request-shape': 'headers' })],
  ])('normalizes iterable caller headers before the H3 request-fetch boundary', async (headers) => {
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', { method: 'PATCH', headers })

    expect(lastOptions()?.headers).toEqual({
      'origin': 'https://app.example',
      'x-request-shape': headers instanceof Headers ? 'headers' : 'tuple',
    })
  })

  it.each([
    [{ Origin: 'https://caller.example' }],
    [[['ORIGIN', 'https://caller.example']]],
    [new Headers({ Origin: 'https://caller.example' })],
  ])('preserves a caller origin case-insensitively', async (headers) => {
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', { method: 'DELETE', headers })

    expect(lastOptions()?.headers).toEqual({ origin: 'https://caller.example' })
  })

  it('preserves a caller referer without replacing its provenance', async () => {
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', {
      method: 'POST',
      headers: { Referer: 'https://caller.example/page' },
    })

    expect(lastOptions()?.headers).toEqual({
      referer: 'https://caller.example/page',
    })
  })

  it('does not attest caller-provided cross-site fetch metadata', async () => {
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    })

    expect(lastOptions()?.headers).toEqual({ 'sec-fetch-site': 'cross-site' })
  })

  it('does not treat caller-provided fetch metadata as incoming provenance', async () => {
    mocks.requestHeaders = new Headers()
    const requestFetch = await loadRequestFetch()

    await requestFetch('/api/auth/test', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin' },
    })

    expect(lastOptions()?.headers).toEqual({ 'sec-fetch-site': 'same-origin' })
  })

  it.each(['GET', 'get', 'HEAD', 'head', 'OPTIONS', 'options'])('leaves the safe %s method unchanged', async (method) => {
    const requestFetch = await loadRequestFetch()
    const options = { method, headers: new Headers({ 'x-test': 'safe' }) }

    await requestFetch('/api/auth/test', options)

    expect(mocks.requestFetch).toHaveBeenCalledWith('/api/auth/test', options)
  })

  it('leaves the default GET unchanged', async () => {
    const requestFetch = await loadRequestFetch()
    const options = { headers: { 'x-test': 'default' } }

    await requestFetch('/api/auth/test', options)

    expect(mocks.requestFetch).toHaveBeenCalledWith('/api/auth/test', options)
  })

  it.each([
    ['https://api.example/api/auth/test', { method: 'POST' }],
    ['//api.example/api/auth/test', { method: 'POST' }],
    ['/api/authentic', { method: 'POST' }],
    ['/api/auth/test', { method: 'POST', baseURL: 'https://api.example' }],
    ['/api/auth/test', { method: 'POST', baseURL: '/proxy' }],
    [new URL('https://api.example/api/auth/test'), { method: 'POST' }],
    [new Request('https://api.example/api/auth/test', { method: 'POST' }), { method: 'POST' }],
  ])('leaves non-local request %s unchanged', async (request, options) => {
    const requestFetch = await loadRequestFetch()

    await requestFetch(request, options)

    expect(mocks.requestFetch).toHaveBeenCalledWith(request, options)
  })
})
