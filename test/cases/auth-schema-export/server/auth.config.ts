import { defineServerAuth } from '../../../../src/runtime/config'
import { posts } from './db/schema/posts'

export default defineServerAuth(({ runtimeConfig }) => ({
  appName: runtimeConfig.public.app.routes.signUp,
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        async after() {
          void posts
        },
      },
    },
  },
}))
