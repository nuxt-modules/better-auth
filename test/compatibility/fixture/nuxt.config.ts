export default defineNuxtConfig({
  modules: [...(process.env.COMPATIBILITY_DATABASE === 'true' ? ['@nuxthub/core'] : []), '@nuxtjs/better-auth'],
  hub: { db: { dialect: 'sqlite', applyMigrationsDuringBuild: false } },
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
