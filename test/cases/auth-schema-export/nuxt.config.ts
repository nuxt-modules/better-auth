export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  hub: { db: 'sqlite' },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: {
      app: { routes: { signUp: '/auth/sign-up' } },
      siteUrl: 'http://localhost:3000',
    },
  },
})
