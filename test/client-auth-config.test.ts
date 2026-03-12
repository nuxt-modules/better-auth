import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createAuthClient } = vi.hoisted(() => ({
  createAuthClient: vi.fn((options: unknown) => options),
}))

vi.mock('better-auth/vue', () => ({
  createAuthClient,
}))

const { defineClientAuth } = await import('../src/runtime/config')

describe('defineClientAuth', () => {
  beforeEach(() => {
    createAuthClient.mockClear()
  })

  it('passes the inferred siteUrl to function syntax', () => {
    let capturedUrl = ''
    const factory = defineClientAuth((ctx) => {
      capturedUrl = ctx.siteUrl
      return {}
    })

    factory('http://test.local')

    expect(capturedUrl).toBe('http://test.local')
  })

  it('keeps the resolved baseURL authoritative', () => {
    const factory = defineClientAuth({
      baseURL: 'https://explicit.example/api/auth',
      plugins: [],
    })

    const client = factory('https://derived.example/api/auth')

    expect(createAuthClient).toHaveBeenCalledOnce()
    expect(createAuthClient).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://explicit.example/api/auth',
    }))
    expect(client).toMatchObject({
      baseURL: 'https://explicit.example/api/auth',
    })
  })
})
