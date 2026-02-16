export default defineNuxtConfig({
  extends: ['../core-auth'],

  auth: {
    redirects: {
      login: '/login',
      guest: '/app',
    },
  },
})
