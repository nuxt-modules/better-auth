import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    include: ['test/runtime/**/*.nuxt.spec.ts'],
    environment: 'nuxt',
    environmentOptions: {
      nuxt: { rootDir: fileURLToPath(new URL('./test/cases/test-utils', import.meta.url)) },
    },
  },
})
