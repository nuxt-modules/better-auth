import { describe, expect, it } from 'vitest'
import { diagnostics } from '../src/module/diagnostics'

describe('missing config diagnostic', () => {
  it.each([
    ['custom/auth', 'custom/auth.ts'],
    ['custom/auth.config', 'custom/auth.config.ts'],
    ['custom/auth.ts', 'custom/auth.ts'],
    ['custom/auth.js', 'custom/auth.js'],
    ['custom/auth.mts', 'custom/auth.mts'],
    ['custom/auth.cts', 'custom/auth.cts'],
    ['custom/auth.mjs', 'custom/auth.mjs'],
    ['custom/auth.cjs', 'custom/auth.cjs'],
  ])('reports the configured filename for %s', (file, expected) => {
    for (const factory of ['defineServerAuth', 'defineClientAuth'] as const) {
      const diagnostic = diagnostics.NUXT_AUTH_MISSING_CONFIG({ file, factory })
      expect(diagnostic.message).toBe(`Missing ${expected}`)
      expect(diagnostic.fix).toBe(`Create ${expected} with export default ${factory}(...).`)
    }
  })
})
