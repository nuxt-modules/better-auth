import { createPinia, defineStore, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive, isRef, ref, watch } from 'vue'

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
const $fetch = vi.fn(async () => null)
const nuxtHooks = new Map<string, Array<() => void | Promise<void>>>()
const nuxtApp = {
  payload,
  isHydrating: false,
  hook: vi.fn((name: string, cb: () => void | Promise<void>) => {
    const hooks = nuxtHooks.get(name) || []
    hooks.push(cb)
    nuxtHooks.set(name, hooks)
  }),
}

const sessionAtom = ref<SessionState>({
  data: null,
  isPending: false,
  isRefetching: false,
  error: null,
})

const mockClient: Record<string, any> = {
  useSession: vi.fn(() => sessionAtom),
  getSession: vi.fn(async () => ({ data: null })),
  signOut: vi.fn(async () => {}),
  signIn: { social: vi.fn(async () => ({})), oauth2: vi.fn(async () => ({})), email: vi.fn(async () => ({})) },
  signUp: { email: vi.fn(async () => ({})) },
}
let activeClient: Record<string, any> = mockClient

vi.mock('#auth/client', () => ({
  default: vi.fn(() => activeClient),
}))

vi.mock('#imports', async () => {
  const vue = await import('vue')
  return {
    computed: vue.computed,
    navigateTo,
    nextTick: vue.nextTick,
    watch: vue.watch,
    useNuxtApp: () => nuxtApp,
    useRequestFetch: () => $fetch,
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

async function loadAuthComposables() {
  vi.resetModules()
  return import('../src/runtime/app/composables/useUserSession')
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}

async function triggerNuxtHook(name: string) {
  const hooks = nuxtHooks.get(name) || []
  for (const hook of hooks)
    await hook()
}

function seedHydratedState() {
  state.set('auth:session', ref({ id: 'session-1' }))
  state.set('auth:user', ref({ id: 'user-1' }))
  state.set('auth:ready', ref(false))
}

function createDynamicAuthProxy(routes: Record<string, unknown> = {}, calls: string[] = [], path: string[] = []): any {
  return new Proxy(async () => ({}), {
    get(_target, prop) {
      if (typeof prop !== 'string')
        return undefined
      if (prop === 'then' || prop === 'catch' || prop === 'finally')
        return undefined
      if (prop in routes)
        return routes[prop]
      return createDynamicAuthProxy(routes, calls, [...path, prop])
    },
    apply() {
      calls.push(path.join('.'))
      return Promise.resolve({})
    },
  })
}

describe('useUserSession hydration bootstrap', () => {
  beforeEach(() => {
    state.clear()
    nuxtHooks.clear()
    nuxtApp.hook.mockClear()
    nuxtApp.isHydrating = false
    payload.serverRendered = false
    payload.prerenderedAt = undefined
    payload.isCached = false
    requestHeaders = { cookie: 'session=test' }
    requestURL.searchParams = new URLSearchParams()
    requestURL.origin = 'http://localhost:3000'
    runtimeConfig.public.siteUrl = 'http://localhost:3000'
    runtimeConfig.public.auth.redirects = {}
    navigateTo.mockClear()
    $fetch.mockReset()
    $fetch.mockResolvedValue(null)
    activeClient = mockClient

    sessionAtom.value = {
      data: null,
      isPending: false,
      isRefetching: false,
      error: null,
    }

    mockClient.useSession.mockReset()
    mockClient.useSession.mockImplementation(() => sessionAtom)
    mockClient.getSession.mockReset()
    mockClient.signOut.mockClear()
    mockClient.updateUser = undefined
    mockClient.signIn.social.mockReset()
    mockClient.signIn.social.mockResolvedValue({})
    mockClient.signIn.oauth2.mockReset()
    mockClient.signIn.oauth2.mockResolvedValue({})
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

  it('subscribes without synchronously bridging the initial client snapshot', async () => {
    payload.serverRendered = true
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(auth.ready.value).toBe(false)
    expect(auth.session.value).toEqual({ id: 'session-1' })
    expect(auth.user.value).toEqual({ id: 'user-1' })
    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('bootstraps client session when SSR payload is not hydrated', async () => {
    payload.serverRendered = true

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('bootstraps client session for prerendered/cached payloads', async () => {
    payload.serverRendered = true
    payload.prerenderedAt = Date.now()
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('defers ready reset until suspense resolves during prerender hydration empty snapshot', async () => {
    payload.serverRendered = true
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    state.set('auth:ready', ref(true))

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await flushPromises()

    expect((nuxtHooks.get('app:suspense:resolve') || [])).toHaveLength(1)
    expect(auth.ready.value).toBe(true)

    await triggerNuxtHook('app:suspense:resolve')
    await flushPromises()

    expect(auth.ready.value).toBe(false)
  })

  it('marks ready after first client session resolution on prerender hydration', async () => {
    payload.serverRendered = true
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    state.set('auth:ready', ref(true))
    mockClient.getSession.mockResolvedValueOnce({ data: null })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await flushPromises()

    await triggerNuxtHook('app:suspense:resolve')
    await flushPromises()

    expect(auth.ready.value).toBe(false)

    nuxtApp.isHydrating = false
    await auth.fetchSession()

    expect(mockClient.getSession).toHaveBeenCalledTimes(1)
    expect(auth.ready.value).toBe(true)
  })

  it('queues prerender ready reset once across composable calls', async () => {
    payload.serverRendered = true
    payload.prerenderedAt = Date.now()
    nuxtApp.isHydrating = true
    state.set('auth:ready', ref(true))

    const useUserSession = await loadUseUserSession()
    useUserSession()
    useUserSession()
    await flushPromises()

    expect((nuxtHooks.get('app:suspense:resolve') || [])).toHaveLength(1)
  })

  it('bootstraps client session on CSR navigation', async () => {
    payload.serverRendered = false
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    useUserSession()

    expect(mockClient.useSession).toHaveBeenCalledOnce()
  })

  it('reconciles hydrated SSR auth state before clearing it', async () => {
    payload.serverRendered = true
    nuxtApp.isHydrating = true
    seedHydratedState()

    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-2', token: 'secret', ipAddress: '127.0.0.1' },
        user: { id: 'user-2', email: 'user2@example.com' },
      },
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await flushPromises()

    expect(mockClient.getSession).not.toHaveBeenCalled()
    expect(auth.session.value).toEqual({ id: 'session-1' })
    expect(auth.user.value).toEqual({ id: 'user-1' })

    nuxtApp.isHydrating = false
    await triggerNuxtHook('app:mounted')
    await flushPromises()

    expect(mockClient.getSession).toHaveBeenCalledTimes(1)
    expect(auth.session.value).toEqual({ id: 'session-2', ipAddress: '127.0.0.1' })
    expect(auth.user.value).toEqual({ id: 'user-2', email: 'user2@example.com' })
  })

  it('clears hydrated SSR auth state when reconciliation confirms no session', async () => {
    payload.serverRendered = true
    nuxtApp.isHydrating = true
    seedHydratedState()
    mockClient.getSession.mockResolvedValueOnce({ data: null })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await flushPromises()

    expect(mockClient.getSession).not.toHaveBeenCalled()
    nuxtApp.isHydrating = false
    await triggerNuxtHook('app:mounted')
    await flushPromises()

    expect(mockClient.getSession).toHaveBeenCalledTimes(1)
    expect(auth.session.value).toBeNull()
    expect(auth.user.value).toBeNull()
  })

  it('does not run hydration reconciliation when SSR state is not hydrated', async () => {
    payload.serverRendered = true
    nuxtApp.isHydrating = true

    const useUserSession = await loadUseUserSession()
    useUserSession()
    await flushPromises()

    expect(mockClient.getSession).not.toHaveBeenCalled()
    expect(nuxtHooks.get('app:mounted')).toBeUndefined()
  })

  it('queues hydration reconciliation once across composable calls', async () => {
    payload.serverRendered = true
    nuxtApp.isHydrating = true
    seedHydratedState()

    const useUserSession = await loadUseUserSession()
    useUserSession()
    useUserSession()
    await flushPromises()

    expect((nuxtHooks.get('app:mounted') || [])).toHaveLength(1)
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

  it('fetchSession passes disableCookieCache query when force is enabled', async () => {
    let capturedArgs: unknown[] = []
    mockClient.getSession.mockImplementationOnce((...args: unknown[]) => {
      capturedArgs = args
      return { data: null }
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.fetchSession({ force: true })

    expect(capturedArgs[0]).toEqual({ query: { disableCookieCache: true } })
  })

  it('fetchSession does not pass disableCookieCache query by default', async () => {
    let capturedArgs: unknown[] = []
    mockClient.getSession.mockImplementationOnce((...args: unknown[]) => {
      capturedArgs = args
      return { data: null }
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.fetchSession()

    expect(capturedArgs[0]).toEqual({ query: undefined })
  })

  it('fetchSession fetches and sets SSR session on server', async () => {
    setRuntimeFlags({ client: false, server: true })
    $fetch.mockResolvedValueOnce({
      session: { id: 'session-server', token: 'secret', ipAddress: '127.0.0.1' },
      user: { id: 'user-server', email: 'server@example.com' },
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.fetchSession()

    expect($fetch).toHaveBeenCalledWith('/api/auth/get-session', { headers: { cookie: 'session=test' } })
    expect(auth.session.value).toEqual({ id: 'session-server', ipAddress: '127.0.0.1' })
    expect(auth.user.value).toEqual({ id: 'user-server', email: 'server@example.com' })
    expect(auth.ready.value).toBe(true)
  })

  it('fetchSession clears SSR state on server when no session is returned', async () => {
    setRuntimeFlags({ client: false, server: true })
    seedHydratedState()
    $fetch.mockResolvedValueOnce(null)

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.fetchSession()

    expect(auth.session.value).toBeNull()
    expect(auth.user.value).toBeNull()
    expect(auth.ready.value).toBe(true)
  })

  it('returns only store-safe session state and actions', async () => {
    setRuntimeFlags({ client: false, server: true })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(Object.keys(auth).sort()).toEqual([
      'fetchSession',
      'loggedIn',
      'ready',
      'session',
      'signOut',
      'updateUser',
      'user',
      'waitForSession',
    ])
    expect('client' in auth).toBe(false)
    expect('signIn' in auth).toBe(false)
    expect('signUp' in auth).toBe(false)
  })

  it('keeps useUserSession safe for Pinia setup-store forwarding on client', async () => {
    const rawClient = createDynamicAuthProxy({
      useSession: mockClient.useSession,
      getSession: mockClient.getSession,
      signOut: mockClient.signOut,
      signIn: createDynamicAuthProxy(),
      signUp: createDynamicAuthProxy(),
      $store: mockClient.$store,
    })
    activeClient = rawClient

    const useUserSession = await loadUseUserSession()
    const store = { ...useUserSession() }
    const isStateLike = (value: unknown) => isRef(value) || isReactive(value)

    expect('client' in store).toBe(false)
    expect('signIn' in store).toBe(false)
    expect('signUp' in store).toBe(false)
    expect(isStateLike(store.signOut)).toBe(false)
    expect(isStateLike(store.fetchSession)).toBe(false)
  })

  it('can return useUserSession directly from an actual Pinia setup store', async () => {
    setActivePinia(createPinia())

    const useUserSession = await loadUseUserSession()
    const useAuthStore = defineStore('auth-session-forwarding', () => useUserSession())
    const store = useAuthStore()

    expect('client' in store).toBe(false)
    expect('signIn' in store).toBe(false)
    expect('signUp' in store).toBe(false)
    expect(isReactive(store.signOut)).toBe(false)
    expect(isReactive(store.fetchSession)).toBe(false)
  })

  it('allows server-side auth method reads through action namespaces but still rejects invocation', async () => {
    setRuntimeFlags({ client: false, server: true })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    const signInEmail = (auth.signIn as Record<string, (...args: unknown[]) => Promise<unknown>>).email
    const signUpEmail = (auth.signUp as Record<string, (...args: unknown[]) => Promise<unknown>>).email

    expect(isRef(signInEmail as unknown)).toBe(false)
    expect(isReactive(signInEmail as unknown)).toBe(false)
    expect(isRef(signUpEmail as unknown)).toBe(false)
    expect(isReactive(signUpEmail as unknown)).toBe(false)

    await expect(signInEmail({ email: 'user@example.com', password: 'password' })).rejects.toThrow('signIn.email() can only be called on client-side')
    await expect(signUpEmail({ email: 'user@example.com', password: 'password', name: 'User' })).rejects.toThrow('signUp.email() can only be called on client-side')
  })

  it('keeps useUserSession safe for Pinia setup-store forwarding during SSR', async () => {
    setRuntimeFlags({ client: false, server: true })

    const useUserSession = await loadUseUserSession()
    const store = { ...useUserSession() }
    const isStateLike = (value: unknown) => isRef(value) || isReactive(value)

    expect('client' in store).toBe(false)
    expect('signIn' in store).toBe(false)
    expect('signUp' in store).toBe(false)
    expect(isStateLike(store.signOut)).toBe(false)
    expect(isStateLike(store.fetchSession)).toBe(false)
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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.email({ email: 'user@example.com', password: 'password' })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it.each([
    { method: 'social', data: { provider: 'github' }, providerURL: 'https://github.com/login/oauth/authorize' },
    { method: 'oauth2', data: { providerId: 'seznam' }, providerURL: 'https://login.szn.cz/oauth/authorize' },
  ])('signIn.$method injects callbackURL and skips session sync', async ({ method, data, providerURL }) => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn[method].mockImplementationOnce(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
      return { url: providerURL, redirect: true }
    })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    if (method === 'social') {
      await auth.signIn.social(data)
    }
    else {
      await auth.signIn.oauth2(data)
    }

    expect(mockClient.signIn[method]).toHaveBeenCalledWith({ ...data, callbackURL: '/app' }, undefined)
    expect(mockClient.getSession).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('signIn.social injects callbackURL from safe redirect query first', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: '/app/billing' })
    mockClient.signIn.social.mockResolvedValueOnce({ url: 'https://github.com/login/oauth/authorize', redirect: true })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.social({ provider: 'github' } as never)

    expect(mockClient.signIn.social).toHaveBeenCalledWith({ provider: 'github', callbackURL: '/app/billing' }, undefined)
  })

  it('signIn.social ignores unsafe redirect query and falls back to auth.redirects.authenticated', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: 'https://evil.com/phish' })
    mockClient.signIn.social.mockResolvedValueOnce({ url: 'https://github.com/login/oauth/authorize', redirect: true })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.social({ provider: 'github' } as never)

    expect(mockClient.signIn.social).toHaveBeenCalledWith({ provider: 'github', callbackURL: '/app' }, undefined)
  })

  it('signIn.social does not override explicit callbackURL', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    requestURL.searchParams = new URLSearchParams({ redirect: '/app/billing' })
    mockClient.signIn.social.mockResolvedValueOnce({ url: 'https://github.com/login/oauth/authorize', redirect: true })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.social({ provider: 'github', callbackURL: '/custom' } as never)

    expect(mockClient.signIn.social).toHaveBeenCalledWith({ provider: 'github', callbackURL: '/custom' }, undefined)
  })

  it('signIn.social preserves explicit onSuccess without wrapping session sync', async () => {
    const onSuccess = vi.fn()
    mockClient.signIn.social.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.social({ provider: 'github' } as never, { onSuccess } as never)

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(mockClient.getSession).not.toHaveBeenCalled()
  })

  it.each([
    { method: 'social', data: { provider: 'github', disableRedirect: true } },
    { method: 'oauth2', data: { providerId: 'seznam', disableRedirect: true } },
  ])('signIn.$method with disableRedirect syncs session before onSuccess', async ({ method, data }) => {
    let sessionAuth!: ReturnType<Awaited<ReturnType<typeof loadUseUserSession>>>
    let sessionAtCallback: unknown
    const onSuccess = vi.fn(() => {
      sessionAtCallback = sessionAuth.session.value
    })
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn[method].mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const { useAuthActionNamespaces, useUserSession } = await loadAuthComposables()
    sessionAuth = useUserSession()
    const auth = useAuthActionNamespaces()

    if (method === 'social') {
      await auth.signIn.social(data, { onSuccess })
    }
    else {
      await auth.signIn.oauth2(data, { onSuccess })
    }

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(sessionAtCallback).toEqual({ id: 'session-1', ipAddress: '127.0.0.1' })
  })

  it('signIn.social with disableRedirect uses fallback redirect when callback is missing', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({
      data: {
        session: { id: 'session-1', ipAddress: '127.0.0.1' },
        user: { id: 'user-1', email: 'user@example.com' },
      },
    })
    mockClient.signIn.social.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

    await auth.signIn.social({ provider: 'github', disableRedirect: true } as never)

    expect(mockClient.getSession).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledWith('/app')
  })

  it('signUp does not auto-navigate to authenticated redirect when session is unresolved', async () => {
    runtimeConfig.public.auth.redirects = { authenticated: '/app' }
    mockClient.getSession.mockResolvedValueOnce({ data: null })
    mockClient.signUp.email.mockImplementation(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

    const { useAuthActionNamespaces } = await loadAuthComposables()
    const auth = useAuthActionNamespaces()

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

  it('syncs session after Better Auth refreshes hydrated SSR state', async () => {
    payload.serverRendered = true
    seedHydratedState()

    const refreshedSession = {
      data: {
        session: { id: 'session-3', token: 'secret', ipAddress: '127.0.0.1' },
        user: { id: 'user-3', email: 'user3@example.com' },
      },
      isPending: false,
      isRefetching: false,
      error: null,
    }

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    expect(auth.ready.value).toBe(false)

    sessionAtom.value = refreshedSession
    await flushPromises()

    expect(auth.ready.value).toBe(true)
    expect(auth.session.value).toEqual({ id: 'session-3', ipAddress: '127.0.0.1' })
    expect(auth.user.value).toEqual({ id: 'user-3', email: 'user3@example.com' })
  })

  it('does not re-sync session for nested mutations within the current Better Auth snapshot', async () => {
    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    sessionAtom.value = {
      data: {
        session: { id: 'session-1', metadata: { role: 'member' } },
        user: { id: 'user-1', email: 'user@example.com' },
      },
      isPending: false,
      isRefetching: false,
      error: null,
    }
    await flushPromises()
    const bridgedSession = auth.session.value

    const metadata = sessionAtom.value.data!.session.metadata as { role: string }
    metadata.role = 'admin'
    await flushPromises()

    expect(auth.session.value).toBe(bridgedSession)
  })

  it('signOut navigates to redirects.logout when configured (and no onSuccess)', async () => {
    runtimeConfig.public.auth.redirects = { logout: '/logged-out' }

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    await auth.signOut()

    expect(navigateTo).toHaveBeenCalledWith('/logged-out')
  })

  it('signOut waits for logout reactivity to flush before auto-navigation', async () => {
    runtimeConfig.public.auth.redirects = { logout: '/logged-out' }

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.session.value = { id: 'session-1' } as any
    auth.user.value = { id: 'user-1', email: 'user@example.com' } as any

    const authSettled = ref(false)
    watch(auth.loggedIn, (isLoggedIn) => {
      if (!isLoggedIn)
        authSettled.value = true
    })

    navigateTo.mockImplementationOnce(async () => {
      expect(authSettled.value).toBe(true)
    })

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

  it('coalesces concurrent signOut calls into a single client request and redirect', async () => {
    runtimeConfig.public.auth.redirects = { logout: '/logged-out' }

    let resolveSignOut: (() => void) | undefined
    mockClient.signOut.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveSignOut = resolve
    }))

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    const firstSignOut = auth.signOut()
    const secondSignOut = auth.signOut()

    expect(mockClient.signOut).toHaveBeenCalledOnce()

    resolveSignOut?.()
    await Promise.all([firstSignOut, secondSignOut])

    expect(mockClient.signOut).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith('/logged-out')
  })

  it('treats expected unauthenticated getSession errors as a normal signed-out state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockClient.getSession.mockRejectedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      status: 401,
    })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()
    auth.session.value = { id: 'session-1' } as any
    auth.user.value = { id: 'user-1', email: 'user@example.com' } as any

    await auth.fetchSession()

    expect(auth.session.value).toBeNull()
    expect(auth.user.value).toBeNull()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('signOut throws on server runtime', async () => {
    setRuntimeFlags({ client: false, server: true })

    const useUserSession = await loadUseUserSession()
    const auth = useUserSession()

    await expect(auth.signOut()).rejects.toThrow('signOut can only be called on client-side')
  })
})
