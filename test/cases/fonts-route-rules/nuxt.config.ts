export default defineNuxtConfig({
  extends: ['../_base-module'],
  modules: ['@nuxt/fonts', './modules/dev-assets'],
  app: { baseURL: '/dashboard/' },
  routeRules: {
    '/**': { auth: 'user' },
  },
})
