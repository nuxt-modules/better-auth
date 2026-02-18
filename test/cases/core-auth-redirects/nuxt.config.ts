export default defineNuxtConfig({
  extends: ['../core-auth'],

  auth: {
    serverConfig: '../core-auth/server/auth.config',
    clientConfig: '../core-auth/app/auth.config',
    redirects: {
      login: '/custom-login',
      guest: '/protected',
    },
  },
})
