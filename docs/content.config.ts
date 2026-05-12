import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    landing: defineCollection({
      type: 'page',
      source: 'index.md',
    }),
    content: defineCollection({
      type: 'page',
      source: '**/*',
    }),
  },
})
