import { sessionHookAfter } from '#server/utils/hooks'
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

export default defineServerAuth(({ db: _db }) => {
  type _DbSelect = typeof _db.select

  return {
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
  }
})
