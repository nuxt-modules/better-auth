import { defineServerAuth } from '../../../../src/runtime/config'
import { posts } from './db/schema/posts'

export default defineServerAuth(({ runtimeConfig }) => ({
  appName: runtimeConfig.public.app.routes.signUp,
  user: { modelName: 'person' },
  session: { modelName: 'loginSession' },
  account: { modelName: 'identity' },
  verification: { modelName: 'challenge' },
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
