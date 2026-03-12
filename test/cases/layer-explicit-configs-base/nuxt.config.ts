export default defineNuxtConfig({
  extends: ['../core-auth'],

  auth: {
    serverConfig: 'custom/server-auth',
    clientConfig: 'custom/client-auth',
  },
})
