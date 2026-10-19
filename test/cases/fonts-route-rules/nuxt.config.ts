export default defineNuxtConfig({
  extends: ['../_base-module'],
  modules: ['@nuxt/fonts', './modules/dev-assets'],
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
      fontsource: false,
      npm: false,
      adobe: false,
    },
  },
  app: { baseURL: '/dashboard/' },
  routeRules: {
    '/**': { auth: 'user' },
  },
})
