export default defineNuxtConfig({
  modules: ['@nuxthub/core', '@onmax/nuxt-better-auth'],

  hub: { db: 'sqlite' },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
  },
})
