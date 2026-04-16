import { fileURLToPath } from 'node:url'

const serverConfig = fileURLToPath(new URL('./server/auth.config', import.meta.url))

export default defineNuxtConfig({
  extends: ['../_base-module'],
  auth: {
    serverConfig,
  },
})
