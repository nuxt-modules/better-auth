export default defineNuxtConfig({
  extends: ['../core-auth'],

  auth: {
    serverConfig: '../core-auth/server/auth.config',
    clientConfig: '../core-auth/app/auth.config',
  },

  routeRules: {
    '/protected': { auth: { only: 'user', redirectTo: '/custom-login' } },
  },
})
