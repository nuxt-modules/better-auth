import type { AuthUser, AuthUserUpdateInput, ClientAuthSession, UserSessionComposable } from '#nuxt-better-auth'
import { computed, shallowRef, watch } from 'vue'

export interface MockUserSession {
  user: AuthUser
  session: ClientAuthSession
}

/** Reactive replacement for useUserSession in Nuxt runtime tests. */
export function createUserSessionMock(initial: MockUserSession | null = null) {
  const initialSession = structuredClone(initial)
  const user = shallowRef<AuthUser | null>(null)
  const session = shallowRef<ClientAuthSession | null>(null)
  const resolved = shallowRef(true)

  function setSession(value: MockUserSession | null, options: { ready?: boolean } = {}) {
    const snapshot = structuredClone(value)
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
    loggedIn: computed(() => Boolean(user.value && session.value)),
    ready: computed(() => resolved.value),
    async fetchSession() {},
    async waitForSession() {
      if (resolved.value)
        return
      await new Promise<void>((resolve) => {
        const stop = watch(resolved, (ready) => {
          if (ready) {
            stop()
            resolve()
          }
        })
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
