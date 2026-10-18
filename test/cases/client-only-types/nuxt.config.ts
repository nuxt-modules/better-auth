export default defineNuxtConfig({
  modules: ['../../../src/module'],
  auth: {
    clientOnly: true,
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://auth.example.com',
    },
  },
})
