import { fileURLToPath } from 'node:url'

const serverConfig = fileURLToPath(new URL('./server/auth.config', import.meta.url))

export default defineNuxtConfig({
  extends: ['../_base-module'],
  runtimeConfig: {
    public: { siteUrl: 'http://localhost:3000' },
  },
  auth: {
    serverConfig,
  },
  nitro: {
    typescript: {
      tsConfig: {
        exclude: [fileURLToPath(new URL('../../../src/runtime/server/internal/nitro3.ts', import.meta.url))],
      },
    },
  },
  routeRules: {
    '/admin/**': { auth: { user: { role: 'admin', internalCode: 'x' } } },
  },
})
