import { describe, expect, it, vi } from 'vitest'

const { createAuthClient } = vi.hoisted(() => ({
  createAuthClient: vi.fn((options: unknown) => options),
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient,
}))

const { defineClientAuth, extendClientAuth } = await import('../src/runtime/config')

describe('defineClientAuth', () => {
  it('passes the inferred siteUrl to function syntax', () => {
    let capturedUrl = ''
    const factory = defineClientAuth((ctx) => {
      capturedUrl = ctx.siteUrl
      return {}
    })

    factory('http://test.local')

    expect(capturedUrl).toBe('http://test.local')
  })

  it('keeps an explicit baseURL override', () => {
    const factory = defineClientAuth({
      baseURL: 'https://explicit.example/api/auth',
      plugins: [],
    })

    const client = factory('https://derived.example/api/auth')

    expect(client).toMatchObject({
      baseURL: 'https://explicit.example/api/auth',
    })
  })

  it('falls back to the inferred baseURL when object syntax leaves it undefined', () => {
    const factory = defineClientAuth({
      baseURL: undefined,
      plugins: [],
    })

    const client = factory('https://derived.example/api/auth')

    expect(client).toMatchObject({
      baseURL: 'https://derived.example/api/auth',
    })
  })

  it('falls back to the inferred baseURL when function syntax leaves it undefined', () => {
    const factory = defineClientAuth(() => ({
      baseURL: undefined,
      plugins: [],
    }))

    const client = factory('https://derived.example/api/auth')

    expect(client).toMatchObject({
      baseURL: 'https://derived.example/api/auth',
    })
  })

  it('appends contributed plugins after the app plugins', () => {
    const appPlugin = { id: 'app' }
    const layerPlugin = { id: 'layer' }
    const factory = extendClientAuth(defineClientAuth({ plugins: [appPlugin] }), [layerPlugin])

    expect(factory('https://example.test')).toMatchObject({
      plugins: [appPlugin, layerPlugin],
    })
  })
})
