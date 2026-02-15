import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'Base Test App',
  socialProviders: {
    github: { clientId: 'test', clientSecret: 'test' },
  },
})
