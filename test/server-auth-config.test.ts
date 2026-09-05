import { describe, expect, it } from 'vitest'
import { defineClientAuth, defineServerAuth, extendServerAuth } from '../src/runtime/config'

describe('extendServerAuth', () => {
  it('appends contributed plugins after the app plugins', () => {
    const appPlugin = { id: 'app' }
    const layerPlugin = { id: 'layer' }
    const factory = extendServerAuth(defineServerAuth({ plugins: [appPlugin] }), [layerPlugin])

    expect(factory({} as never).plugins).toEqual([appPlugin, layerPlugin])
  })
})

describe('server basePath', () => {
  it.each([undefined, '/api/auth'])('accepts the registered path %s', (basePath) => {
    expect(defineServerAuth({ basePath })({} as never).basePath).toBe(basePath)
  })

  it.each(['/custom/auth', '/', ''])('rejects unsupported path %s in object and callback configs', (basePath) => {
    // JavaScript consumers and runtime values still receive a useful error.
    const config = { basePath } as never
    expect(() => defineServerAuth(config)({} as never)).toThrow('Server basePath must be /api/auth')
    expect(() => defineServerAuth(() => config)({} as never)).toThrow('Server basePath must be /api/auth')
  })

  it('preserves custom paths for external auth clients', () => {
    const client = defineClientAuth({ basePath: '/custom/auth' })
    expect(client.resolveOptions('https://auth.example.com').basePath).toBe('/custom/auth')
  })
})
