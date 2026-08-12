export default defineNuxtConfig({
  extends: ['../_base-module'],

  runtimeConfig: {
    public: { siteUrl: 'http://localhost:3000' },
  },

  routeRules: {
    '/**': { auth: 'user' },
    '/login': { auth: false },
  },
})
