export default defineNuxtConfig({
  modules: ['@nuxtjs/better-auth'],
  routeRules: {
    '/api/guest': { auth: 'guest' },
  },
  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },
})
