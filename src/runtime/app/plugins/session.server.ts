import type { AuthUser, ClientAuthSession } from '#nuxt-better-auth'
import { defineNuxtPlugin, useRequestEvent, useState } from '#imports'
import { getRequestSession } from '../../server/utils/session'

export default defineNuxtPlugin({
  name: 'auth:session-init',
  enforce: 'pre',
  async setup() {
    const session = useState<ClientAuthSession | null>('auth:session', () => null)
    const user = useState<AuthUser | null>('auth:user', () => null)
    const authReady = useState('auth:ready', () => false)

    // Resolve on the outer request so Better Auth's refreshed cookies are forwarded.
    const event = useRequestEvent()
    if (event) {
      try {
        const data = await getRequestSession(event)
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
