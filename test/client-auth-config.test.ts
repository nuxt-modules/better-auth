import { describe, expect, it, vi } from 'vitest'
import { defineClientAuth, extendClientAuth } from '../src/runtime/config'

describe('defineClientAuth', () => {
  it.each([
    { syntax: 'object', baseURL: undefined, expectedURL: 'https://derived.example/api/auth/get-session' },
    { syntax: 'callback', baseURL: undefined, expectedURL: 'https://derived.example/api/auth/get-session' },
    { syntax: 'object', baseURL: 'https://explicit.example/api/auth', expectedURL: 'https://explicit.example/api/auth/get-session' },
    { syntax: 'callback', baseURL: 'https://explicit.example/api/auth', expectedURL: 'https://explicit.example/api/auth/get-session' },
  ])('uses $syntax config with baseURL=$baseURL for client requests', async ({ syntax, baseURL, expectedURL }) => {
    const customFetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(null))
    const options = { baseURL, fetchOptions: { customFetchImpl: customFetch } }
    const factory = defineClientAuth(syntax === 'object'
      ? options
      : ({ siteUrl }) => ({
          ...options,
          fetchOptions: { ...options.fetchOptions, headers: { 'x-site': siteUrl } },
        }))

    await factory('https://derived.example/api/auth').getSession()

    const requests = customFetch.mock.calls.map(args => new Request(...args))
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe(expectedURL)
    if (syntax === 'callback')
      expect(requests[0]?.headers.get('x-site')).toBe('https://derived.example/api/auth')
  })

  it('appends contributed plugins after the app plugins', () => {
    const appPlugin = { id: 'app' }
    const layerPlugin = { id: 'layer' }
    const factory = extendClientAuth(defineClientAuth({ plugins: [appPlugin] }), [layerPlugin])

    expect(factory.resolveOptions('https://example.test').plugins).toEqual([appPlugin, layerPlugin])
  })
})
