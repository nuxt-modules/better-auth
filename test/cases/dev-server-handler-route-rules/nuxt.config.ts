export default defineNuxtConfig({
  extends: ['../_base-module'],
  routeRules: {
    '/**': { auth: 'user' },
  },
})
