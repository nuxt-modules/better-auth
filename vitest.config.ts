import { configDefaults, defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const typeTests = [
  'test/config-extend-hook.test.ts',
  'test/define-server-auth-literal-inference.test.ts',
  'test/infer-nitro-endpoints-types.test.ts',
  'test/infer-plugins-types.test.ts',
  'test/infer-use-fetch-endpoints-types.test.ts',
  'test/require-user-session-typing.test.ts',
  'test/use-signin-provider-alias-typing.test.ts',
]

const integrationTests = [
  'test/auth-schema-export.test.ts',
  'test/composables-subpath-exports.test.ts',
  'test/config-paths.test.ts',
  'test/dev-trusted-origins.test.ts',
  'test/exports.test.ts',
  'test/layer-default-configs.test.ts',
  'test/layer-explicit-configs.test.ts',
  'test/layer-plugin-contributions.test.ts',
  'test/module-setup.test.ts',
  'test/module.test.ts',
  'test/no-db.test.ts',
  'test/no-hub.test.ts',
  'test/non-tty-secret-prompt.test.ts',
  'test/nuxthub-drizzle-schema-regression.test.ts',
  'test/nuxthub-prerender-db-import.test.ts',
  'test/pinia-setup-store.test.ts',
  'test/preserve-redirect-custom-key.test.ts',
  'test/preserve-redirect-custom-login.test.ts',
  'test/preserve-redirect-disabled.test.ts',
  'test/redirects-option.test.ts',
  'test/runtime-only-secret-build.test.ts',
  'test/server-auth-base-url-cache.test.ts',
  'test/server-auth-project-references-typecheck.test.ts',
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
          exclude: [...configDefaults.exclude, ...typeTests, ...integrationTests],
        },
      },
      {
        resolve: {
          alias: nitroCompatibilityAlias,
        },
        test: {
          name: 'types',
          include: typeTests,
          fileParallelism: false,
          testTimeout: 360_000,
          sequence: {
            groupOrder: 1,
          },
        },
      },
      {
        resolve: {
          alias: nitroCompatibilityAlias,
        },
        test: {
          name: 'integration',
          testTimeout: 360_000,
          include: integrationTests,
          fileParallelism: false,
          hookTimeout: 180_000,
          sequence: {
            groupOrder: 2,
          },
        },
      },
    ],
  },
})
