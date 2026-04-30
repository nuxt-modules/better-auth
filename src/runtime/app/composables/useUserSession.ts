import type { AppAuthClient, AuthSession, AuthUser } from '#nuxt-better-auth'
import type { ComputedRef, Ref } from 'vue'
import createAppAuthClient from '#auth/client'
import { computed, navigateTo, nextTick, useNuxtApp, useRequestURL, useRuntimeConfig, useState, watch } from '#imports'
import { normalizeAuthActionError } from '../internal/auth-action-error'
import { resolvePostAuthSuccessRedirect, withFallbackSocialCallbackURL } from '../internal/redirect-helpers'
import { fetchSessionClient, fetchSessionServer, stripToken } from '../internal/session-fetch'
import { isRecord } from '../internal/utils'
import { wrapAuthMethod } from '../internal/wrap-auth-method'

export interface SignOutOptions { onSuccess?: () => void | Promise<void> }
interface RuntimeFlags { client: boolean, server: boolean }

let _sessionSignalListenerBound = false
let _signOutPromise: Promise<void> | null = null

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

function isReactiveProbeKey(prop: PropertyKey): boolean {
  if (typeof prop === 'symbol')
    return true
  return prop === 'then' || prop.startsWith('__v')
}

function createServerOnlyActionMethod(path: string) {
  const method = async () => {
    throw new Error(`${path}() can only be called on client-side`)
  }

  return new Proxy(method, {
    get(target, prop, receiver) {
      if (isReactiveProbeKey(prop))
        return undefined
      return Reflect.get(target, prop, receiver)
    },
  })
}

function createServerOnlyActionNamespace(path: string) {
  const cache = new Map<string, ReturnType<typeof createServerOnlyActionMethod>>()
  return new Proxy({}, {
    get(_target, prop) {
      if (isReactiveProbeKey(prop))
        return undefined
      const key = prop as string
      let method = cache.get(key)
      if (!method) {
        method = createServerOnlyActionMethod(`${path}.${key}`)
        cache.set(key, method)
      }
      return method
    },
  })
}

const _signInServerOnly = createServerOnlyActionNamespace('signIn')
const _signUpServerOnly = createServerOnlyActionNamespace('signUp')

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
  const nuxtApp = useNuxtApp()
  const siteUrl = typeof runtimeConfig.public.siteUrl === 'string' ? runtimeConfig.public.siteUrl : requestURL.origin

  const client: AppAuthClient | null = runtimeFlags.client
    ? getClient(siteUrl)
    : null

  // Shared state via useState for SSR hydration
  const session = useState<AuthSession | null>('auth:session', () => null)
  const user = useState<AuthUser | null>('auth:user', () => null)
  const authReady = useState('auth:ready', () => false)
  const prerenderReadyResetQueued = useState('auth:prerender-ready-reset-queued', () => false)
  const hydrationReconcileQueued = useState('auth:hydration-reconcile-queued', () => false)
  const ready = computed(() => authReady.value)
  const loggedIn = computed(() => Boolean(session.value && user.value))
  const isPrerenderedPayload = computed(() => Boolean(nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached))
  const isPrerenderHydrationEmptySnapshot = computed(() => {
    if (!runtimeFlags.client)
      return false
    if (!nuxtApp.isHydrating || !nuxtApp.payload.serverRendered || !isPrerenderedPayload.value)
      return false
    return !session.value && !user.value
  })

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
    if (isPrerenderedPayload.value)
      return false
    return Boolean(session.value && user.value)
  })

  if (isPrerenderHydrationEmptySnapshot.value && authReady.value && !prerenderReadyResetQueued.value) {
    prerenderReadyResetQueued.value = true
    nuxtApp.hook('app:suspense:resolve', () => {
      try {
        if (!session.value && !user.value && authReady.value)
          authReady.value = false
      }
      finally {
        prerenderReadyResetQueued.value = false
      }
    })
  }

  if (shouldSkipInitialClientSessionFetch.value && !authReady.value)
    authReady.value = true

  function clearSession() {
    session.value = null
    user.value = null
  }

  async function fetchSession(options: { headers?: HeadersInit, force?: boolean } = {}) {
    if (runtimeFlags.server)
      return fetchSessionServer(session, user, authReady, options)
    if (client)
      return fetchSessionClient(client, session, user, authReady, options)
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
        if (result.error instanceof Error)
          throw result.error
        const normalizedError = normalizeAuthActionError(result.error)
        throw new Error(normalizedError.message)
      }
    }
    catch (error) {
      user.value = previousUser
      if (!(error instanceof Error)) {
        const normalizedError = normalizeAuthActionError(error)
        throw new Error(normalizedError.message)
      }
      throw error
    }
  }

  // On client, subscribe to better-auth's reactive session store
  if (runtimeFlags.client && client && !shouldSkipInitialClientSessionFetch.value) {
    const clientSession = client.useSession()

    watch(
      () => clientSession.value,
      (newSession) => {
        const shouldWaitForPrerenderResolution
          = isPrerenderHydrationEmptySnapshot.value
            && !newSession?.data?.session
            && !newSession?.data?.user

        if (shouldWaitForPrerenderResolution)
          return

        if (newSession?.data?.session && newSession?.data?.user) {
          session.value = stripToken(newSession.data.session as AuthSession & { token?: string })
          user.value = newSession.data.user as AuthUser
        }
        else if (!newSession?.isPending && !newSession?.isRefetching) {
          const isHydrationEmptySnapshot
            = nuxtApp.isHydrating
              && nuxtApp.payload.serverRendered
              && Boolean(session.value && user.value)
              && !newSession?.data?.session
              && !newSession?.data?.user

          if (isHydrationEmptySnapshot) {
            if (!hydrationReconcileQueued.value) {
              hydrationReconcileQueued.value = true
              nuxtApp.hook('app:mounted', async () => {
                await fetchSession({ force: true })
                hydrationReconcileQueued.value = false
              })
            }
            return
          }

          clearSession()
        }
        if (!authReady.value && !newSession?.isPending && !newSession?.isRefetching)
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
      setTimeout(() => {
        unwatch()
        resolve()
      }, 5000)
    })
  }

  // Wrap signIn/signUp methods to sync session before executing onSuccess
  type SignIn = NonNullable<AppAuthClient>['signIn']
  type SignUp = NonNullable<AppAuthClient>['signUp']

  const wrapDeps = {
    fetchSession,
    loggedIn,
    waitForSession,
    resolvePostAuthSuccessRedirect: () => resolvePostAuthSuccessRedirect(requestURL),
  }

  const signIn: SignIn = client?.signIn
    ? new Proxy(client.signIn, {
        get(target, prop) {
          const targetRecord = target as Record<string | symbol, unknown>
          const method = targetRecord[prop]
          if (typeof method !== 'function')
            return method
          const shouldSkipSessionSync = prop === 'social'
            ? (data: unknown) => {
                const socialData = isRecord(data) ? data : undefined
                return socialData?.disableRedirect !== true
              }
            : undefined
          const transformData = prop === 'social' ? (data: unknown) => withFallbackSocialCallbackURL(data, requestURL) : undefined
          return wrapAuthMethod(
            (...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args),
            wrapDeps,
            { shouldSkipSessionSync, transformData },
          )
        },
      })
    : _signInServerOnly as SignIn

  const signUp: SignUp = client?.signUp
    ? new Proxy(client.signUp, {
        get(target, prop) {
          const targetRecord = target as Record<string | symbol, unknown>
          const method = targetRecord[prop]
          if (typeof method !== 'function')
            return method
          return wrapAuthMethod((...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args), wrapDeps)
        },
      })
    : _signUpServerOnly as SignUp

  if (runtimeFlags.client && client && shouldSkipInitialClientSessionFetch.value) {
    ensureSessionSignalListener(client, () => fetchSession({ force: true }))
  }

  async function signOut(options?: SignOutOptions) {
    if (!client)
      throw new Error('signOut can only be called on client-side')

    if (_signOutPromise) {
      await _signOutPromise
      return
    }

    _signOutPromise = (async () => {
      await client.signOut()
      clearSession()

      if (options?.onSuccess) {
        await options.onSuccess()
        return
      }

      const authConfig = runtimeConfig.public.auth as { redirects?: { logout?: string } } | undefined
      const logoutRedirect = authConfig?.redirects?.logout
      if (logoutRedirect) {
        await nextTick()
        await navigateTo(logoutRedirect)
      }
    })().finally(() => {
      _signOutPromise = null
    })

    await _signOutPromise
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
