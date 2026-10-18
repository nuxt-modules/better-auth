export default defineNuxtConfig({
  modules: ['@nuxtjs/better-auth'],
  auth: { redirects: { logout: '/login' } },
  runtimeConfig: { betterAuthSecret: 'test-secret-for-testing-only-32chars!' },
  routeRules: {
    '/protected': { auth: 'user' },
    '/api/me': { auth: 'user' },
  },
})
