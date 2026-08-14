export default {
  modules: ['@nuxthub/core', '@nuxtjs/better-auth'],

  hub: { db: 'sqlite' },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
  },
}
