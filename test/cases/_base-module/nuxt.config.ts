import { fileURLToPath } from 'node:url'

const serverConfig = fileURLToPath(new URL('./server/auth.config', import.meta.url))
const clientConfig = fileURLToPath(new URL('./app/auth.config', import.meta.url))

export default defineNuxtConfig({
  modules: ['../../../src/module'],

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
  },

  auth: {
    // Absolute paths are required because the module validates existence relative to rootDir.
    serverConfig,
    clientConfig,
  },
})
