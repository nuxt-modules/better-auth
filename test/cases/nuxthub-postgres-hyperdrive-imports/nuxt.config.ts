export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  hub: {
    db: {
      dialect: 'postgresql',
      driver: 'postgres-js',
      applyMigrationsDuringBuild: false,
      connection: {
        hyperdriveId: process.env.HYPERDRIVE_ID,
        url: process.env.DATABASE_URL || '',
      },
    },
  },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: { siteUrl: 'http://localhost:3000' },
  },

  routeRules: {
    '/': { prerender: true },
  },
})
