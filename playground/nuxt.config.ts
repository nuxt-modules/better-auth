export default defineNuxtConfig({
  modules: ['nitro-cloudflare-dev', '@nuxthub/core', '@nuxt/ui', 'nuxt-qrcode', '@nuxtjs/i18n', '../src/module', ['npm-agentskills/nuxt', { targets: ['claude'] }]],

  css: ['~/assets/css/main.css'],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales',
    strategy: 'no_prefix',
  },

  app: {
    head: {
      title: 'Nuxt Better Auth Demo',
      meta: [
        { name: 'description', content: 'Official demo showcasing Better Auth features with Nuxt: email/password, social auth, passkeys, 2FA, admin panel.' },
        { property: 'og:title', content: 'Nuxt Better Auth Demo' },
        { property: 'og:description', content: 'Official demo showcasing Better Auth features with Nuxt.' },
        { property: 'og:image', content: 'https://demo.better-auth.nuxtjs.org/og.png' },
        { name: 'twitter:image', content: 'https://demo.better-auth.nuxtjs.org/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  hub: { db: { dialect: 'sqlite', driver: 'd1', connection: { databaseId: '19843a99-07d8-4c3b-b479-b48ba3792ce3' } } },

  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      siteUrl: 'https://demo-nuxt-better-auth.onmax.me',
    },
  },

  routeRules: {
    '/app/**': { auth: 'user' },
    '/admin/**': { auth: { user: { role: 'admin' } } },
    '/login': { auth: 'guest' },
    '/register': { auth: 'guest' },
    '/forget-password': { auth: 'guest' },
    '/two-factor': { auth: false },
    '/two-factor/otp': { auth: false },
  },

  nitro: {
    preset: 'cloudflare-module',
    virtual: { '#react-email-mock': 'export const render = () => ""' },
    alias: { '@react-email/render': '#react-email-mock' },
    cloudflare: {
      nodeCompat: true,
      wrangler: {
        name: 'nuxt-better-auth-demo',
        routes: [{ pattern: 'demo-nuxt-better-auth.onmax.me', zone_name: 'onmax.me', custom_domain: true }],
        observability: { enabled: true, logs: { enabled: true, invocation_logs: true } },
      },
    },
  },

  compatibilityDate: '2025-01-01',
})
