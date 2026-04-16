import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth(({ requestOrigin }) => ({
  appName: requestOrigin || 'missing-request-origin',
  socialProviders: {
    github: { clientId: 'test', clientSecret: 'test' },
  },
}))
