import { defineServerAuth } from '../../../../src/runtime/config'

export const socialProviders = {
  github: { clientId: 'test', clientSecret: 'test' },
  google: { clientId: 'test', clientSecret: 'test' },
} as const

export default defineServerAuth({
  emailAndPassword: { enabled: true },
  socialProviders,
})
