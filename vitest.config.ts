import { configDefaults, defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const integrationTests = [
  'test/module.test.ts',
  'test/no-db.test.ts',
  'test/no-hub.test.ts',
  'test/dev-trusted-origins.test.ts',
  'test/server-auth-base-url-cache.test.ts',
]

const nitroCompatibilityAlias = {
  '#better-auth/nitro-compat': fileURLToPath(new URL('./src/runtime/server/internal/nitro2.ts', import.meta.url)),
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: nitroCompatibilityAlias,
        },
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...integrationTests],
        },
      },
      {
        resolve: {
          alias: nitroCompatibilityAlias,
        },
        test: {
          name: 'integration',
          include: integrationTests,
          fileParallelism: false,
          hookTimeout: 180_000,
          sequence: {
            groupOrder: 1,
          },
        },
      },
    ],
  },
})
