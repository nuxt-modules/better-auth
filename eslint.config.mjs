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
  // Enforce no explicit `any` in shipped code, but keep tests/playground flexible for now.
  {
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
