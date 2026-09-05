import type { ComputedRef, Ref } from 'vue'
import type { AppAuthClient, AuthSession, AuthUser, AuthUserUpdateInput } from '#nuxt-better-auth'
import { computed, navigateTo, nextTick, useNuxtApp, useRequestURL, useRuntimeConfig, useState, watch } from '#imports'
import { normalizeAuthActionError } from '../internal/auth-action-error'
import { resolvePostAuthSuccessRedirect, withFallbackSocialCallbackURL } from '../internal/redirect-helpers'
import { fetchSessionClient, fetchSessionServer, stripToken } from '../internal/session-fetch'
import { isRecord } from '../internal/utils'
import { createVueSafeAuthFacade, isAuthProxyProbeKey } from '../internal/vue-safe-auth-proxy'
import { wrapAuthMethod } from '../internal/wrap-auth-method'
import { getAuthRuntimeFlags, useRawAuthClient } from './useAuthClient'

export interface SignOutOptions { onSuccess?: () => void | Promise<void> }

let _signOutPromise: Promise<void> | null = null
const _sessionSyncApps = new WeakSet<object>()

export interface UseUserSessionReturn {
  session: Ref<AuthSession | null>
  user: Ref<AuthUser | null>
  loggedIn: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  signOut: (options?: SignOutOptions) => Promise<void>
  waitForSession: () => Promise<void>
  fetchSession: (options?: { headers?: HeadersInit, force?: boolean }) => Promise<void>
  updateUser: (updates: AuthUserUpdateInput) => Promise<void>
}

interface UpdateUserResponse { error?: unknown }

function createServerOnlyActionNamespace(path: string) {
  return new Proxy({}, {
    get(_target, prop) {
      if (isAuthProxyProbeKey(prop))
        return undefined
      const key = prop as string
      return async () => {
        throw new Error(`${path}.${key}() can only be called on client-side`)
      }
    },
  })
}

const _signInServerOnly = createServerOnlyActionNamespace('signIn')
const _signUpServerOnly = createServerOnlyActionNamespace('signUp')

export function useUserSession(): UseUserSessionReturn {
  const runtimeFlags = getAuthRuntimeFlags()
  const runtimeConfig = useRuntimeConfig()
  const nuxtApp = useNuxtApp()
  const rawClient = useRawAuthClient()

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

  function clearSession() {
    session.value = null
    user.value = null
  }

  async function fetchSession(options: { headers?: HeadersInit, force?: boolean } = {}) {
    if (runtimeFlags.server)
      return fetchSessionServer(session, user, authReady, options)
    if (rawClient)
      return fetchSessionClient(rawClient, session, user, authReady, options)
  }

  async function updateUser(updates: AuthUserUpdateInput) {
    if (!user.value)
      return

    const previousUser = user.value
    user.value = { ...user.value, ...updates }

    if (!rawClient)
      return

    try {
      const clientWithUpdateUser = rawClient as AppAuthClient & { updateUser: (updates: AuthUserUpdateInput) => Promise<UpdateUserResponse> }
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

  function queueHydrationReconciliation() {
    if (hydrationReconcileQueued.value)
      return

    hydrationReconcileQueued.value = true
    nuxtApp.hook('app:mounted', async () => {
      await fetchSession({ force: true })
      hydrationReconcileQueued.value = false
    })
  }

  // On client, subscribe to better-auth's reactive session store
  if (runtimeFlags.client && rawClient && !_sessionSyncApps.has(nuxtApp)) {
    const clientSession = rawClient.useSession()
    const initialClientSession = clientSession.value

    const shouldReconcileInitialHydration
      = nuxtApp.isHydrating
        && nuxtApp.payload.serverRendered
        && Boolean(session.value && user.value)
        && !initialClientSession?.data?.session
        && !initialClientSession?.data?.user
        && !initialClientSession?.isPending
        && !initialClientSession?.isRefetching

    if (shouldReconcileInitialHydration)
      queueHydrationReconciliation()

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
            queueHydrationReconciliation()
            return
          }

          clearSession()
        }
        if (!authReady.value && !newSession?.isPending && !newSession?.isRefetching)
          authReady.value = true
      },
    )

    _sessionSyncApps.add(nuxtApp)
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

  async function signOut(options?: SignOutOptions) {
    if (!rawClient)
      throw new Error('signOut can only be called on client-side')

    if (_signOutPromise) {
      await _signOutPromise
      return
    }

    _signOutPromise = (async () => {
      await rawClient.signOut()
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
    session,
    user,
    loggedIn,
    ready,
    signOut,
    waitForSession,
    fetchSession,
    updateUser,
  }
}

export function useAuthActionNamespaces() {
  const rawClient = useRawAuthClient()
  const auth = useUserSession()
  const requestURL = useRequestURL()
  type SignIn = NonNullable<AppAuthClient>['signIn']
  type SignUp = NonNullable<AppAuthClient>['signUp']

  const wrapDeps = {
    fetchSession: auth.fetchSession,
    loggedIn: auth.loggedIn,
    waitForSession: auth.waitForSession,
    resolvePostAuthSuccessRedirect: () => resolvePostAuthSuccessRedirect(requestURL),
  }

  const signIn: SignIn = rawClient?.signIn
    ? createVueSafeAuthFacade((prop) => {
        const targetRecord = rawClient.signIn as Record<string | symbol, unknown>
        const method = targetRecord[prop]
        if (typeof method !== 'function')
          return method
        const isRedirectOAuthSignIn = prop === 'social' || prop === 'oauth2'
        return wrapAuthMethod(
          (...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args),
          wrapDeps,
          isRedirectOAuthSignIn
            ? {
                shouldSkipSessionSync: (data: unknown) => !isRecord(data) || data.disableRedirect !== true,
                transformData: (data: unknown) => withFallbackSocialCallbackURL(data, requestURL),
              }
            : {},
        )
      })
    : _signInServerOnly as SignIn

  const signUp: SignUp = rawClient?.signUp
    ? createVueSafeAuthFacade((prop) => {
        const targetRecord = rawClient.signUp as Record<string | symbol, unknown>
        const method = targetRecord[prop]
        if (typeof method !== 'function')
          return method
        return wrapAuthMethod((...args: unknown[]) => (targetRecord[prop] as (...a: unknown[]) => Promise<unknown>)(...args), wrapDeps)
      })
    : _signUpServerOnly as SignUp

  return { signIn, signUp }
}
