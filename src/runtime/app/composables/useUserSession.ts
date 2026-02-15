import type { AppAuthClient, AuthSession, AuthUser } from '#nuxt-better-auth'
import type { ComputedRef, Ref } from 'vue'
import createAppAuthClient from '#auth/client'
import { computed, nextTick, useNuxtApp, useRequestHeaders, useRequestURL, useRuntimeConfig, useState, watch } from '#imports'

export interface SignOutOptions { onSuccess?: () => void | Promise<void> }
interface RuntimeFlags { client: boolean, server: boolean }

let _sessionSignalListenerBound = false

export interface UseUserSessionReturn {
  client: AppAuthClient | null
  session: Ref<AuthSession | null>
  user: Ref<AuthUser | null>
  loggedIn: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  signIn: NonNullable<AppAuthClient>['signIn']
  signUp: NonNullable<AppAuthClient>['signUp']
  signOut: (options?: SignOutOptions) => Promise<void>
  waitForSession: () => Promise<void>
  fetchSession: (options?: { headers?: HeadersInit, force?: boolean }) => Promise<void>
  updateUser: (updates: Partial<AuthUser>) => Promise<void>
}

// Singleton client instance to ensure consistent state across all useUserSession calls
let _client: AppAuthClient | null = null
interface UpdateUserResponse { error?: unknown }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function getClient(baseURL: string): AppAuthClient {
  if (!_client)
    _client = createAppAuthClient(baseURL)
  return _client
}

function getRuntimeFlags(): RuntimeFlags {
  const globalFlags = (globalThis as { __NUXT_BETTER_AUTH_TEST_FLAGS__?: RuntimeFlags }).__NUXT_BETTER_AUTH_TEST_FLAGS__
  if (globalFlags)
    return globalFlags
  return { client: Boolean(import.meta.client), server: Boolean(import.meta.server) }
}

function ensureSessionSignalListener(client: AppAuthClient, onSignal: () => Promise<void>) {
  if (_sessionSignalListenerBound)
    return

  const store = (client as unknown as { $store?: unknown }).$store
  if (!isRecord(store))
    return

  const listen = (store as { listen?: unknown }).listen
  if (typeof listen !== 'function')
    return

  _sessionSignalListenerBound = true
  const listenFn = listen as (signal: string, cb: () => void | Promise<void>) => unknown
  listenFn('$sessionSignal', async () => {
    try {
      await onSignal()
    }
    catch {}
  })
}

export function useUserSession(): UseUserSessionReturn {
  const runtimeFlags = getRuntimeFlags()
  const runtimeConfig = useRuntimeConfig()
  const requestURL = useRequestURL()

  // Client only - create better-auth client for client-side operations (singleton)
  const client: AppAuthClient | null = runtimeFlags.client
    ? getClient(runtimeConfig.public.siteUrl || requestURL.origin)
    : null

  // Shared state via useState for SSR hydration
  const session = useState<AuthSession | null>('auth:session', () => null)
  const user = useState<AuthUser | null>('auth:user', () => null)
  const authReady = useState('auth:ready', () => false)
  const ready = computed(() => authReady.value)
  const loggedIn = computed(() => Boolean(session.value && user.value))

  const nuxtApp = useNuxtApp()
  const skipHydratedSsrGetSession = computed(() => {
    const authConfig = runtimeConfig.public.auth as { session?: { skipHydratedSsrGetSession?: boolean } } | undefined
    return Boolean(authConfig?.session?.skipHydratedSsrGetSession)
  })
  const shouldSkipInitialClientSessionFetch = computed(() => {
    if (!skipHydratedSsrGetSession.value)
      return false
    if (!runtimeFlags.client)
      return false
    if (!nuxtApp.payload.serverRendered)
      return false
    // Don't skip for prerendered/cached payloads; we want a real session check after mount.
    if (nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached)
      return false
    // SSR already hydrated state: avoid duplicate /api/auth/get-session on first paint.
    return Boolean(session.value && user.value)
  })

  if (shouldSkipInitialClientSessionFetch.value && !authReady.value)
    authReady.value = true

  function clearSession() {
    session.value = null
    user.value = null
  }

  async function updateUser(updates: Partial<AuthUser>) {
    if (!user.value)
      return

    const previousUser = user.value
    user.value = { ...user.value, ...updates }

    if (!client)
      return

    try {
      const clientWithUpdateUser = client as AppAuthClient & { updateUser: (updates: Partial<AuthUser>) => Promise<UpdateUserResponse> }
      const result = await clientWithUpdateUser.updateUser(updates)
      if (result?.error) {
        if (typeof result.error === 'string')
          throw new Error(result.error)
        if (result.error instanceof Error)
          throw result.error
        if (typeof result.error === 'object' && result.error && 'message' in result.error && typeof result.error.message === 'string')
          throw new Error(result.error.message)
        throw new Error('Failed to update user')
      }
    }
    catch (error) {
      user.value = previousUser
      throw error
    }
  }

  // On client, subscribe to better-auth's reactive session store
  // This auto-updates when signIn/signUp/signOut triggers the session signal
  if (runtimeFlags.client && client && !shouldSkipInitialClientSessionFetch.value) {
    const clientSession = client.useSession()

    // Sync better-auth's reactive session to our useState
    watch(
      () => clientSession.value,
      (newSession) => {
        if (newSession?.data?.session && newSession?.data?.user) {
          // Filter out sensitive token field
          const { token: _, ...safeSession } = newSession.data.session as AuthSession & { token?: string }
          session.value = safeSession as AuthSession
          user.value = newSession.data.user as AuthUser
        }
        else if (!newSession?.isPending) {
          clearSession()
        }
        if (!authReady.value && !newSession?.isPending)
          authReady.value = true
      },
      { immediate: true, deep: true },
    )
  }

  function waitForSession(): Promise<void> {
    return new Promise((resolve) => {
      if (loggedIn.value) {
        resolve()
        return
      }
      const unwatch = watch(loggedIn, (isLoggedIn) => {
        if (isLoggedIn) {
          unwatch()
          resolve()
        }
      })
      // Timeout fallback to prevent hanging
      setTimeout(() => {
        unwatch()
        resolve()
      }, 5000)
    })
  }

  // Wrap signIn methods to wait for session sync before calling onSuccess
  type SignIn = NonNullable<AppAuthClient>['signIn']
  type SignUp = NonNullable<AppAuthClient>['signUp']

  // Wraps onSuccess callback to sync session before executing
  function wrapOnSuccess(cb: (ctx: unknown) => void | Promise<void>) {
    return async (ctx: unknown) => {
      await fetchSession({ force: true })
      if (!loggedIn.value)
        await waitForSession()
      await nextTick()
      await cb(ctx)
    }
  }

  function wrapAuthMethod<T extends (...args: unknown[]) => Promise<unknown>>(method: T): T {
    return (async (...args: unknown[]) => {
      const data = args[0]
      const options = args[1]
      const dataRecord = isRecord(data) ? data : undefined
      const optionsRecord = isRecord(options) ? options : undefined

      type OnSuccess = (ctx: unknown) => void | Promise<void>
      const fetchOptions = isRecord(dataRecord?.fetchOptions) ? dataRecord.fetchOptions : undefined
      const nestedOnSuccess = fetchOptions?.onSuccess
      const topLevelOnSuccess = optionsRecord?.onSuccess

      // Passkey pattern: onSuccess in data.fetchOptions
      if (typeof nestedOnSuccess === 'function') {
        const nextData = {
          ...dataRecord,
          fetchOptions: {
            ...fetchOptions,
            onSuccess: wrapOnSuccess(nestedOnSuccess as OnSuccess),
          },
        }
        return method(nextData as unknown as Parameters<T>[0], options as unknown as Parameters<T>[1])
      }
      // Email/social pattern: onSuccess in options
      if (typeof topLevelOnSuccess === 'function') {
        const nextOptions = {
          ...optionsRecord,
          onSuccess: wrapOnSuccess(topLevelOnSuccess as OnSuccess),
        }
        return method(data as unknown as Parameters<T>[0], nextOptions as unknown as Parameters<T>[1])
      }
      return method(data, options)
    }) as T
  }

  const signIn: SignIn = client?.signIn
    ? new Proxy(client.signIn, {
        get(target, prop) {
          const targetRecord = target as Record<string | symbol, unknown>
          const method = targetRecord[prop]
          if (typeof method !== 'function')
            return method
          // Don't bind - call through target to preserve better-auth's Proxy context
          return wrapAuthMethod((...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args))
        },
      })
    : new Proxy({} as SignIn, {
        get: (_, prop) => { throw new Error(`signIn.${String(prop)}() can only be called on client-side`) },
      })

  const signUp: SignUp = client?.signUp
    ? new Proxy(client.signUp, {
        get(target, prop) {
          const targetRecord = target as Record<string | symbol, unknown>
          const method = targetRecord[prop]
          if (typeof method !== 'function')
            return method
          // Don't bind - call through target to preserve better-auth's Proxy context
          return wrapAuthMethod((...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args))
        },
      })
    : new Proxy({} as SignUp, {
        get: (_, prop) => { throw new Error(`signUp.${String(prop)}() can only be called on client-side`) },
      })

  async function fetchSession(options: { headers?: HeadersInit, force?: boolean } = {}) {
    // On server, session is already fetched by server middleware - nothing to do
    if (runtimeFlags.server) {
      if (!authReady.value)
        authReady.value = true
      return
    }

    if (client) {
      try {
        const headers = options.headers || useRequestHeaders(['cookie'])
        const fetchOptions = headers ? { headers } : undefined
        const query = options.force ? { disableCookieCache: true } : undefined
        const result = await client.getSession({ query }, fetchOptions)
        const data = result.data as { session: AuthSession & { token?: string }, user: AuthUser } | null

        if (data?.session && data?.user) {
          // Filter out sensitive token field
          const { token: _, ...safeSession } = data.session
          session.value = safeSession as AuthSession
          user.value = data.user
        }
        else {
          clearSession()
        }
      }
      catch (error) {
        clearSession()
        console.error('[nuxt-better-auth] Failed to fetch session:', error)
      }
      finally {
        if (!authReady.value)
          authReady.value = true
      }
    }
  }

  if (runtimeFlags.client && client && shouldSkipInitialClientSessionFetch.value) {
    ensureSessionSignalListener(client, () => fetchSession({ force: true }))
  }

  async function signOut(options?: SignOutOptions) {
    if (!client)
      throw new Error('signOut can only be called on client-side')
    await client.signOut()
    clearSession()
    if (options?.onSuccess)
      await options.onSuccess()
  }

  return {
    client,
    session,
    user,
    loggedIn,
    ready,
    signIn,
    signUp,
    signOut,
    waitForSession,
    fetchSession,
    updateUser,
  }
}
