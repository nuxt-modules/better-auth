import { defineServerAuth } from '@onmax/nuxt-better-auth/config'
import { sessionHookAfter } from '#server/utils/hooks'

export default defineServerAuth(() => ({
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    session: {
      create: {
        async after() {
          await sessionHookAfter()
        },
      },
    },
  },
}))
