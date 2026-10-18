export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  auth: {
    schema: { usePlural: true },
  },

  hub: { db: 'sqlite' },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: {
      app: { routes: { signUp: '/auth/sign-up' } },
      siteUrl: 'http://localhost:3000',
    },
  },
})
