import { fileURLToPath } from 'node:url'
import yaml from '@rollup/plugin-yaml'
import { generateDiagnosticPages } from './diagnostics/generate'

await generateDiagnosticPages(fileURLToPath(new URL('./content/6.errors', import.meta.url)))

const siteUrl = 'https://better-auth.nuxt.dev'

export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@vueuse/nuxt', 'motion-v/nuxt', '@vercel/analytics/nuxt', '@vercel/speed-insights/nuxt', 'nuxt-shiki'],

  icon: {
    customCollections: [{ prefix: 'custom', dir: './public/icons' }],
  },

  css: ['~/assets/css/main.css'],

  // Used by useSiteConfig() and for absolute OG URLs.
  site: {
    url: siteUrl,
    name: 'Nuxt Better Auth',
    description: 'Nuxt module for Better Auth with auto schema generation, route protection, and session management.',
    defaultLocale: 'en',
  },

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:image', content: 'https://better-auth.nuxt.dev/og.png' },
        { name: 'twitter:image', content: 'https://better-auth.nuxt.dev/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
      ],
    },
  },

  mdc: {
    highlight: {
      noApiRoute: false,
      theme: { default: 'synthwave-84', dark: 'synthwave-84', light: 'one-light' },
      langs: ['bash', 'json', 'js', 'ts', 'vue', 'html', 'css', 'yaml', 'sql'],
    },
  },

  shiki: {
    bundledLangs: ['ts', 'vue', 'js', 'bash', 'json'],
    bundledThemes: ['github-dark'],
    defaultLang: 'ts',
    defaultTheme: 'github-dark',
  },

  devtools: { enabled: true },

  future: { compatibilityVersion: 4 },

  compatibilityDate: '2026-02-18',

  mcp: { enabled: false },

  nitro: {
    preset: 'cloudflare-module',
    // Docus reads this environment variable instead of site.url for its sitemap.
    // Supply the canonical fallback in the server bundle, including prerendering.
    replace: { 'process.env.NUXT_SITE_URL': JSON.stringify(siteUrl) },
    cloudflare: {
      nodeCompat: true,
      wrangler: {
        name: 'better-auth',
        observability: { enabled: true, logs: { enabled: true, invocation_logs: true } },
      },
    },
  },

  vite: { plugins: [yaml()] },

  ogImage: { compatibility: { runtime: { resvg: false } } },
})
