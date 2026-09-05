import type { AuthSession, AuthUser, ClientAuthSession } from '#nuxt-better-auth'
import { defineNuxtPlugin, useRequestEvent, useRequestHeaders, useState } from '#imports'

export default defineNuxtPlugin({
  name: 'auth:session-init',
  enforce: 'pre',
  async setup() {
    const session = useState<ClientAuthSession | null>('auth:session', () => null)
    const user = useState<AuthUser | null>('auth:user', () => null)
    const authReady = useState('auth:ready', () => false)

    // Fetch session on SSR using Better Auth's API endpoint
    const event = useRequestEvent()
    if (event) {
      try {
        const headers = useRequestHeaders(['cookie'])
        const data = await $fetch<{ session: AuthSession & { token?: string }, user: AuthUser } | null>('/api/auth/get-session', { headers })
        if (data?.session && data?.user) {
          // Filter out sensitive token field from client state
          const { token: _, ...safeSession } = data.session
          session.value = safeSession
          user.value = data.user
        }
      }
      catch {
        // Session fetch failed - user unauthenticated
      }
    }
    authReady.value = true
  },
})
