export default defineNuxtConfig({
  extends: ['../_base-module'],
  runtimeConfig: {
    public: {
      siteUrl: 'https://foo.workers.dev',
    },
  },
})
