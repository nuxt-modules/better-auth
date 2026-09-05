import { describe, expect, it, vi } from 'vitest'
import { isReactive, isRef } from 'vue'

const runtimeConfig = {
  public: {
    siteUrl: 'http://localhost:3000',
  },
}
const requestURL = {
  origin: 'http://request-origin.test',
}
const rawClient = {
  signIn: {
    email: vi.fn(async () => ({ ok: true })),
  },
  sendVerificationEmail: vi.fn(async () => ({ ok: true })),
}
const createAppAuthClient = vi.fn(() => rawClient)

vi.mock('#auth/client', () => ({
  default: createAppAuthClient,
}))

vi.mock('#imports', () => ({
  useRequestURL: () => requestURL,
  useRuntimeConfig: () => runtimeConfig,
}))

function setRuntimeFlags(flags: { client: boolean, server: boolean }) {
  const state = globalThis as { __NUXT_BETTER_AUTH_TEST_FLAGS__?: { client: boolean, server: boolean } }
  state.__NUXT_BETTER_AUTH_TEST_FLAGS__ = flags
}

async function loadUseAuthClient() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useAuthClient')
  return mod.useAuthClient
}

describe('useAuthClient', () => {
  it('returns null on server runtime', async () => {
    setRuntimeFlags({ client: false, server: true })

    const useAuthClient = await loadUseAuthClient()

    expect(useAuthClient()).toBeNull()
    expect(createAppAuthClient).not.toHaveBeenCalled()
  })

  it('returns a Vue-safe client facade on client runtime', async () => {
    setRuntimeFlags({ client: true, server: false })

    const useAuthClient = await loadUseAuthClient()
    const client = useAuthClient()

    expect(createAppAuthClient).toHaveBeenCalledWith('http://localhost:3000')
    expect(client).not.toBeNull()
    expect(isRef(client!.signIn.email)).toBe(false)
    expect(isReactive(client!.signIn.email)).toBe(false)
    await expect(client!.signIn.email({ email: 'user@example.com', password: 'password' })).resolves.toEqual({ ok: true })
  })

  it('falls back to the request origin when runtime siteUrl is empty', async () => {
    setRuntimeFlags({ client: true, server: false })
    runtimeConfig.public.siteUrl = ''

    const useAuthClient = await loadUseAuthClient()
    useAuthClient()

    expect(createAppAuthClient).toHaveBeenLastCalledWith(requestURL.origin)
  })
})
