import { sessionHookAfter } from '#server/utils/hooks'
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

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
