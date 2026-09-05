import { admin, username } from 'better-auth/plugins'
import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth(() => ({
  emailAndPassword: { enabled: true },
  plugins: [admin(), username()] as const,
  socialProviders: {
    github: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
  user: {
    additionalFields: {
      internalCode: {
        type: 'string',
        required: false,
      },
    },
  },
}))
