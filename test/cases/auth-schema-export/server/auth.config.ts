import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth(({ runtimeConfig }) => ({
  appName: runtimeConfig.public.app.routes.signUp,
  emailAndPassword: { enabled: true },
}))
