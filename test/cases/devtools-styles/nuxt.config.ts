export default defineNuxtConfig({
  extends: ['../_base-module'],
  devtools: { enabled: false },
  css: ['~/assets/host.css'],
  vite: {
    optimizeDeps: {
      // Avoid a dependency-discovery reload on the first DevTools navigation.
      include: ['@nuxt/devtools-kit/iframe-client', 'better-auth/client', 'better-auth/vue'],
    },
  },
})
