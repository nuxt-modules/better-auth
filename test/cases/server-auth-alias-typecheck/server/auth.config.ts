import { defineServerAuth } from '@onmax/nuxt-better-auth/config'
import { sessionHookAfter } from '#server/utils/hooks'

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
