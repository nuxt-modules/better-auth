import { describe, expect, it } from 'vitest'
import { resolveSchemaSecondaryStorageInjection } from '../src/module/schema'

describe('resolveSchemaSecondaryStorageInjection', () => {
  it('injects when hubSecondaryStorage is true', () => {
    expect(resolveSchemaSecondaryStorageInjection(true, false, true)).toEqual({ inject: true })
    expect(resolveSchemaSecondaryStorageInjection(true, true, false)).toEqual({ inject: true })
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
