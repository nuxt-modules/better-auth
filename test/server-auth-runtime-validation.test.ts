import { describe, expect, it } from 'vitest'
import { validateAuthSecret } from '../src/runtime/server/utils/validate-secret'

describe('validateAuthSecret', () => {
  it('throws when secret is missing', () => {
    expect(() => validateAuthSecret('')).toThrow('NUXT_BETTER_AUTH_SECRET is required in production')
  })

  it('throws when secret is shorter than 32 characters', () => {
    expect(() => validateAuthSecret('too-short')).toThrow('NUXT_BETTER_AUTH_SECRET must be at least 32 characters')
  })

  it('returns valid secret', () => {
    const secret = 'a'.repeat(32)
    expect(validateAuthSecret(secret)).toBe(secret)
  })
})
