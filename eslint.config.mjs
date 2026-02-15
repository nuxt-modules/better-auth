// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['**/*.md', 'dist/**', '.nuxt/**'],
  },
  {
    rules: {
      'node/prefer-global/process': 'off',
    },
  },
  // Enforce no explicit `any` in shipped code, but keep .d.ts/tests/playground flexible.
  {
    files: ['src/**/*.{ts,tsx,vue,mjs,cjs}'],
    ignores: ['src/**/*.d.ts'],
    rules: {
      'ts/no-explicit-any': 'error',
    },
  },
  {
    files: ['test/**', 'playground/**'],
    rules: {
      'ts/no-explicit-any': 'off',
    },
  },
)
