import { describe, expect, it } from 'vitest'
import { resolveCustomSecondaryStorageRequirement } from '../src/runtime/server/utils/custom-secondary-storage'

describe('resolveCustomSecondaryStorageRequirement', () => {
  it('returns null when mode is not custom', () => {
    expect(resolveCustomSecondaryStorageRequirement(false, false, true)).toBeNull()
    expect(resolveCustomSecondaryStorageRequirement(true, false, true)).toBeNull()
    expect(resolveCustomSecondaryStorageRequirement(undefined, false, true)).toBeNull()
  })

  it('returns null when user has secondaryStorage', () => {
    expect(resolveCustomSecondaryStorageRequirement('custom', true, true)).toBeNull()
    expect(resolveCustomSecondaryStorageRequirement('custom', true, false)).toBeNull()
  })

  it('warns in dev when custom mode is enabled but secondaryStorage is missing', () => {
    expect(resolveCustomSecondaryStorageRequirement('custom', false, true)).toEqual({
      shouldThrow: false,
      shouldWarn: true,
      message: '[nuxt-better-auth] hubSecondaryStorage: "custom" requires secondaryStorage in defineServerAuth().',
    })
  })

  it('throws in production when custom mode is enabled but secondaryStorage is missing', () => {
    expect(resolveCustomSecondaryStorageRequirement('custom', false, false)).toEqual({
      shouldThrow: true,
      shouldWarn: false,
      message: '[nuxt-better-auth] hubSecondaryStorage: "custom" requires secondaryStorage in defineServerAuth().',
    })
  })
})
