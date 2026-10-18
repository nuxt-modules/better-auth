import type { AuthUser, AuthUserUpdateInput, ClientAuthSession, UserSessionComposable } from '#nuxt-better-auth'
import { computed, ref, shallowRef, toRaw, watch } from 'vue'

export interface MockUserSession {
  user: AuthUser
  session: ClientAuthSession
}

/** Reactive replacement for useUserSession in Nuxt runtime tests. */
export function createUserSessionMock(initial: MockUserSession | null = null) {
  function cloneSession(value: MockUserSession | null) {
    return value && structuredClone({ user: toRaw(value.user), session: toRaw(value.session) })
  }

  const initialSession = cloneSession(initial)
  const user = ref<AuthUser | null>(null)
  const session = ref<ClientAuthSession | null>(null)
  const resolved = shallowRef(true)
  const loggedIn = computed(() => Boolean(user.value && session.value))

  function setSession(value: MockUserSession | null, options: { ready?: boolean } = {}) {
    const snapshot = cloneSession(value)
    user.value = snapshot?.user ?? null
    session.value = snapshot?.session ?? null
    resolved.value = options.ready ?? true
  }

  function reset() {
    setSession(initialSession)
  }

  const auth: UserSessionComposable = {
    user,
    session,
    loggedIn,
    ready: computed(() => resolved.value),
    async fetchSession() {},
    async waitForSession() {
      if (loggedIn.value)
        return
      await new Promise<void>((resolve) => {
        let timeout: ReturnType<typeof setTimeout>
        const stop = watch(loggedIn, (authenticated) => {
          if (authenticated) {
            clearTimeout(timeout)
            stop()
            resolve()
          }
        })
        timeout = setTimeout(() => {
          stop()
          resolve()
        }, 5000)
      })
    },
    async signOut(options?: { onSuccess?: () => void | Promise<void> }) {
      setSession(null)
      await options?.onSuccess?.()
    },
    async updateUser(updates: AuthUserUpdateInput) {
      if (user.value)
        user.value = { ...user.value, ...updates }
    },
  }

  reset()
  return { ...auth, setSession, reset }
}
