export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  auth: {
    schema: { schemaName: 'auth' },
  },

  hub: {
    db: {
      dialect: 'postgresql',
      driver: 'postgres-js',
      applyMigrationsDuringBuild: false,
      connection: {
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
