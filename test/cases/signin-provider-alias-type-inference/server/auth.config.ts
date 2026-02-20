import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: 'test', clientSecret: 'test' },
    google: { clientId: 'test', clientSecret: 'test' },
  },
})
