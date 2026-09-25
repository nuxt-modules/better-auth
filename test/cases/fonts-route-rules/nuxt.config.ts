export default defineNuxtConfig({
  extends: ['../_base-module'],
  modules: ['@nuxt/fonts'],
  app: { baseURL: '/dashboard/' },
  routeRules: {
    '/**': { auth: 'user' },
  },
})
