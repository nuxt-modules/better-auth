export default defineNuxtConfig({
  extends: ['../_base-module'],
  app: { baseURL: '/app/' },
  runtimeConfig: {
    public: { siteUrl: 'https://example.com/ignored-path' },
  },
})
