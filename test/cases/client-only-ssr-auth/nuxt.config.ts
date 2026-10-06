export default defineNuxtConfig({
  modules: ['../../../src/module'],
  auth: { clientOnly: true },
  runtimeConfig: {
    public: {
      siteUrl: 'http://127.0.0.1:4000',
    },
  },
})
