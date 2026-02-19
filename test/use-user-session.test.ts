import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

interface SessionState {
  data: { session: Record<string, unknown>, user: Record<string, unknown> } | null
  isPending: boolean
  isRefetching: boolean
  error: unknown
}

const payload = {
  serverRendered: false,
  prerenderedAt: undefined as unknown,
  isCached: false,
}

const runtimeConfig = {
  public: {
    siteUrl: 'http://localhost:3000',
    auth: {
      session: {
        skipHydratedSsrGetSession: false,
      },
      redirects: {} as Record<string, unknown>,
    },
  },
}

const requestURL: { origin: string, searchParams: URLSearchParams } = {
  origin: 'http://localhost:3000',
  searchParams: new URLSearchParams(),
}
let requestHeaders: HeadersInit | undefined = { cookie: 'session=test' }
const state = new Map<string, ReturnType<typeof ref>>()
const navigateTo = vi.fn(async () => {})

const sessionAtom = ref<SessionState>({
  data: null,
  isPending: false,
  isRefetching: false,
  error: null,
})

const mockClient: Record<string, any> = {
  useSession: vi.fn(() => sessionAtom),
  getSession: vi.fn(async () => ({ data: null })),
  $store: {
    listen: vi.fn(),
  },
  signOut: vi.fn(async () => {}),
  signIn: { social: vi.fn(async () => ({})), email: vi.fn(async () => ({})) },
  signUp: { email: vi.fn(async () => ({})) },
}

vi.mock('#auth/client', () => ({
  default: vi.fn(() => mockClient),
}))

vi.mock('#imports', async () => {
  const vue = await import('vue')
  return {
    computed: vue.computed,
    navigateTo,
    nextTick: vue.nextTick,
    watch: vue.watch,
    useNuxtApp: () => ({ payload }),
    useRequestHeaders: () => requestHeaders,
    useRequestURL: () => requestURL,
    useRuntimeConfig: () => runtimeConfig,
    useState: <T>(key: string, init: () => T) => {
      if (!state.has(key))
        state.set(key, vue.ref(init()))
      return state.get(key) as ReturnType<typeof vue.ref<T>>
    },
  }
})

function setRuntimeFlags(flags: { client: boolean, server: boolean }) {
  const state = globalThis as { __NUXT_BETTER_AUTH_TEST_FLAGS__?: { client: boolean, server: boolean } }
  state.__NUXT_BETTER_AUTH_TEST_FLAGS__ = flags
}

async function loadUseUserSession() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useUserSession')
  return mod.useUserSession
}

function seedHydratedState() {
  state.set('auth:session', ref({ id: 'session-1' }))
  state.set('auth:user', ref({ id: 'user-1' }))
  state.set('auth:ready', ref(false))
}

describe('useUserSession hydration bootstrap', () => {
  beforeEach(() => {
    state.clear()
    payload.serverRendered = false
    payload.prerenderedAt = undefined
    payload.isCached = false
    requestHeaders = { cookie: 'session=test' }
    requestURL.searchParams = new URLSearchParams()
    requestURL.origin = 'http://localhost:3000'
    runtimeConfig.public.siteUrl = 'http://localhost:3000'
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = false
    runtimeConfig.public.auth.redirects = {}
    navigateTo.mockClear()

    sessionAtom.value = {
      data: null,
      isPending: false,
      isRefetching: false,
      error: null,
    }

    mockClient.useSession.mockReset()
    mockClient.useSession.mockImplementation(() => sessionAtom)
    mockClient.getSession.mockReset()
    mockClient.$store.listen.mockClear()
    mockClient.signOut.mockClear()
    mockClient.updateUser = undefined
    mockClient.signIn.social.mockReset()
    mockClient.signIn.social.mockResolvedValue({})
    mockClient.signIn.email.mockReset()
    mockClient.signIn.email.mockResolvedValue({})
    mockClient.signUp.email.mockReset()
    mockClient.signUp.email.mockResolvedValue({})
    mockClient.getSession.mockResolvedValue({ data: null })

    setRuntimeFlags({ client: true, server: false })
  })

  afterEach(() => {
    delete (globalThis as { __NUXT_BETTER_AUTH_TEST_FLAGS__?: { client: boolean, server: boolean } }).__NUXT_BETTER_AUTH_TEST_FLAGS__
  })

  it('bootstraps client session by default even when SSR payload is hydrated', async () => {
    payload.serverRendered = true
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(auth.ready.value).toBe(true)
    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('skips initial client session bootstrap when option is enabled and SSR payload is hydrated', async () => {
    payload.serverRendered = true
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = true
    seedHydratedState()

    let _signalCb: (() => void | Promise<void>) | undefined
    mockClient.$store.listen.mockImplementation((_signal: string, cb: () => void | Promise<void>) => {
      _signalCb = cb
      return () => {
        _signalCb = undefined
      }
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(mockClient.useSession).not.toHaveBeenCalled()
    expect(auth.ready.value).toBe(true)
    expect(mockClient.$store.listen).toHaveBeenCalledOnce()
    expect(_signalCb).toBeDefined()
  })

  it('bootstraps client session when SSR payload is not hydrated (even with option enabled)', async () => {
    payload.serverRendered = true
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = true

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('bootstraps client session for prerendered/cached payloads', async () => {
    payload.serverRendered = true
    payload.prerenderedAt = Date.now()
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = true
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('bootstraps client session on CSR navigation', async () => {
    payload.serverRendered = false
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = true
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('fetchSession still calls getSession and updates state', async () => {
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-2', token: 'secret', ipAddress: '127.0.0.1' },
        user: { id: 'user-2', email: 'user@example.com' },
      },
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.fetchSession()

    expect(mockClient.getSession).toHaveBeenCalledOnce()
    expect(auth.session.value).toEqual({ id: 'session-2', ipAddress: '127.0.0.1' })
    expect(auth.user.value).toEqual({ id: 'user-2', email: 'user@example.com' })
  })

  it('signIn uses auth.redirects.authenticated when no callback is provided', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signIn.email({ email: 'user@example.com', password: 'password' })
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('signIn prioritizes redirect query over auth.redirects.authenticated', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: '/app/billing' })
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signIn.email({ email: 'user@example.com', password: 'password' })
    expect(navigateTo).toHaveBeenCalledWith('/app/billing')
  })

  it('signIn ignores unsafe redirect query and uses auth.redirects.authenticated', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: 'https://evil.com/phish' })
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signIn.email({ email: 'user@example.com', password: 'password' })
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('signIn does not auto-navigate when no onSuccess callback and no fallback redirect is set', async () => {
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signIn.email({ email: 'user@example.com', password: 'password' })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('signUp does not auto-navigate to authenticated redirect when session is unresolved', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({ data: null })
    mockClient.signUp.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signUp.email({ email: 'user@example.com', password: 'password', name: 'User' })

    expect(navigateTo).not.toHaveBeenCalled()
  }, 10000)

  it('signUp uses auth.redirects.authenticated when no callback is provided', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signUp.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signUp.email({ email: 'user@example.com', password: 'password', name: 'User' })
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('signUp prioritizes redirect query over auth.redirects.authenticated', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: '/welcome' })
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signUp.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await auth.signUp.email({ email: 'user@example.com', password: 'password', name: 'User' })
    expect(navigateTo).toHaveBeenCalledWith('/welcome')
  })

  it('updateUser persists on client and updates local state optimistically', async () => {
    mockClient.updateUser = vi.fn(async () => ({ data: { status: true } }))
    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.user.value = { id: 'user-1', name: 'Old', email: 'a@b.com' }

    await auth.updateUser({ name: 'New' })

    expect(mockClient.updateUser).toHaveBeenCalledWith({ name: 'New' })
    expect(auth.user.value!.name).toBe('New')
  })

  it('updateUser reverts local state when the server call throws', async () => {
    mockClient.updateUser = vi.fn(async () => {
      throw new Error('fail')
    })
    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.user.value = { id: 'user-1', name: 'Old', email: 'a@b.com' }

    await expect(auth.updateUser({ name: 'New' })).rejects.toThrow('fail')
    expect(auth.user.value!.name).toBe('Old')
  })

  it('updateUser reverts local state when server returns an error payload', async () => {
    mockClient.updateUser = vi.fn(async () => ({ error: { message: 'invalid user update' } }))
    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.user.value = { id: 'user-1', name: 'Old', email: 'a@b.com' }

    await expect(auth.updateUser({ name: 'New' })).rejects.toThrow('invalid user update')
    expect(auth.user.value!.name).toBe('Old')
  })

  it('updateUser only updates local state on server (no client)', async () => {
    setRuntimeFlags({ client: false, server: true })
    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.user.value = { id: 'user-1', name: 'Old', email: 'a@b.com' }

    await auth.updateUser({ name: 'New' })
    expect(auth.user.value!.name).toBe('New')
  })

  it('syncs session on $sessionSignal when option is enabled and SSR payload is hydrated', async () => {
    payload.serverRendered = true
    runtimeConfig.public.auth.session.skipHydratedSsrGetSession = true
    seedHydratedState()

    let signalCb: (() => void | Promise<void>) | undefined
    mockClient.$store.listen.mockImplementation((_signal: string, cb: () => void | Promise<void>) => {
      signalCb = cb
      return () => {
        signalCb = undefined
      }
    })

    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-3', token: 'secret', ipAddress: '127.0.0.1' },
        user: { id: 'user-3', email: 'user3@example.com' },
      },
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(mockClient.useSession).not.toHaveBeenCalled()
    expect(auth.ready.value).toBe(true)

    await signalCb?.()

    expect(mockClient.getSession).toHaveBeenCalledOnce()
    expect(auth.session.value).toEqual({ id: 'session-3', ipAddress: '127.0.0.1' })
    expect(auth.user.value).toEqual({ id: 'user-3', email: 'user3@example.com' })
  })

  it('signOut navigates to redirects.logout when configured (and no onSuccess)', async () => {
    runtimeConfig.public.auth.redirects = { logout: '/logged-out' }

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.signOut()

    expect(navigateTo).toHaveBeenCalledWith('/logged-out')
  })

  it('signOut does not auto-navigate when onSuccess is provided', async () => {
    runtimeConfig.public.auth.redirects = { logout: '/logged-out' }

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    const onSuccess = vi.fn()
    await auth.signOut({ onSuccess })

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('signOut does not auto-navigate when redirects.logout is not configured', async () => {
    runtimeConfig.public.auth.redirects = {}

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.signOut()

    expect(navigateTo).not.toHaveBeenCalled()
  })
})
