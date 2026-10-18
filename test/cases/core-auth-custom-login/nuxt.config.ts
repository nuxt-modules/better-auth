export default defineNuxtConfig({
  extends: ['../core-auth'],

  auth: {
    serverConfig: '../core-auth/server/auth.config',
    clientConfig: '../core-auth/app/auth.config',
  },

  routeRules: {
    '/protected': { auth: { only: 'user', redirectTo: '/custom-login' } },
    '/custom-protected': {
      auth: {
        only: 'user',
        redirectTo: '/custom-login?scope=read&scope=write&next=/app?tab=details&mode=email#top#bottom',
      },
    },
  },
})
