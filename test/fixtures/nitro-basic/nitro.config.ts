import { resolve } from 'pathe'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  serverDir: 'server',
  modules: [resolve(import.meta.dirname, '../../../dist/nitro.mjs')],
  betterAuth: {
    config: 'server/auth.config',
  },
  routeRules: {
    '/api/test/me': {
      auth: 'user',
    },
    '/api/test/guest': {
      auth: {
        only: 'guest',
      },
    },
  },
})
