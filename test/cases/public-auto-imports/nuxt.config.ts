export default defineNuxtConfig({
  extends: ['../_base-module'],
  auth: { clientOnly: process.env.TEST_CLIENT_ONLY === 'true' },
  runtimeConfig: {
    public: { siteUrl: 'http://localhost:3000' },
  },
})
