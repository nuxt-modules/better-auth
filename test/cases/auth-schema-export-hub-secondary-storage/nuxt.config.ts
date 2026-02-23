export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  hub: {
    db: 'sqlite',
    kv: true,
  },

  auth: {
    hubSecondaryStorage: true,
  },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: { siteUrl: 'http://localhost:3000' },
  },
})
