import { describe, expect, it } from 'vitest'
import { defineServerAuth, extendServerAuth } from '../src/runtime/config'

describe('extendServerAuth', () => {
  it('appends contributed plugins after the app plugins', () => {
    const appPlugin = { id: 'app' }
    const layerPlugin = { id: 'layer' }
    const factory = extendServerAuth(defineServerAuth({ plugins: [appPlugin] }), [layerPlugin])

    expect(factory({} as never).plugins).toEqual([appPlugin, layerPlugin])
  })
})
