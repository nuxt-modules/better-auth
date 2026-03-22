import { describe, expect, it } from 'vitest'
import { defineServerAuth } from '../src/nitro/config'

describe('defineServerAuth (nitro)', () => {
  it('wraps object syntax in a factory', () => {
    const factory = defineServerAuth({
      emailAndPassword: {
        enabled: true,
      },
    })

    expect(factory({ runtimeConfig: {} })).toEqual({
      emailAndPassword: {
        enabled: true,
      },
    })
  })

  it('passes runtimeConfig to function syntax', () => {
    const factory = defineServerAuth(({ runtimeConfig }) => ({
      appName: String(runtimeConfig.appName),
    }))

    expect(factory({ runtimeConfig: { appName: 'nitro-app' } })).toEqual({
      appName: 'nitro-app',
    })
  })
})
