export default defineNuxtConfig({
  modules: ['@onmax/nuxt-better-auth'],
  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },
})
