export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '../../../src/module',
  ],

  compatibilityDate: '2026-07-15',

  nitro: {
    preset: 'cloudflare_module',
  },

  runtimeConfig: {
    public: {
      siteUrl: 'https://runtime-secret.example.workers.dev',
    },
  },
})
