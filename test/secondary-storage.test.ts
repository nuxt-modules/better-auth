import { describe, expect, it } from 'vitest'
import { resolveSchemaSecondaryStorageInjection } from '../src/module/schema'
import { buildSecondaryStorageCode } from '../src/module/templates'
import { resolveCustomSecondaryStorageRequirement } from '../src/runtime/server/utils/custom-secondary-storage'

describe('generated secondary storage', () => {
  it('does not emit the incomplete NuxtHub KV adapter', () => {
    expect(buildSecondaryStorageCode()).toBe('export function createSecondaryStorage() { return undefined }')
  })
})

describe('custom secondary storage runtime requirement', () => {
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

describe('schema secondary storage injection', () => {
  it('does not inject when hubSecondaryStorage is true', () => {
    expect(resolveSchemaSecondaryStorageInjection(true, false, true)).toEqual({ inject: false })
    expect(resolveSchemaSecondaryStorageInjection(true, true, false)).toEqual({ inject: false })
  })

  it('injects for custom mode only when user provides secondaryStorage', () => {
    expect(resolveSchemaSecondaryStorageInjection('custom', true, true).inject).toBe(true)
    expect(resolveSchemaSecondaryStorageInjection('custom', true, false).inject).toBe(true)
  })

  it('errors in production when custom mode is enabled but secondaryStorage is missing', () => {
    const res = resolveSchemaSecondaryStorageInjection('custom', false, true)
    expect(res.inject).toBe(false)
    expect(res.error).toContain('hubSecondaryStorage: "custom" requires secondaryStorage')
  })

  it('warns in dev when custom mode is enabled but secondaryStorage is missing', () => {
    const res = resolveSchemaSecondaryStorageInjection('custom', false, false)
    expect(res.inject).toBe(false)
    expect(res.warn).toContain('hubSecondaryStorage: "custom" requires secondaryStorage')
  })

  it('does not inject when hubSecondaryStorage is disabled', () => {
    expect(resolveSchemaSecondaryStorageInjection(false, true, true)).toEqual({ inject: false })
    expect(resolveSchemaSecondaryStorageInjection(undefined, true, true)).toEqual({ inject: false })
  })
})
