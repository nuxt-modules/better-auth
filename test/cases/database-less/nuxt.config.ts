export default defineNuxtConfig({
  extends: ['../_base-module'],
  modules: ['@nuxthub/core'],
  hub: { db: false },
  runtimeConfig: {
    public: { siteUrl: 'http://localhost:3000' },
  },
})
