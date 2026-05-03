import { createAuthClient } from 'better-auth/vue'
import { describe, expect, it, vi } from 'vitest'
import { isReactive, isReadonly, isRef, reactive } from 'vue'
import { createVueSafeAuthProxy } from '../src/runtime/app/internal/vue-safe-auth-proxy'

function expectVueInspectionSafe(value: unknown) {
  expect(() => isRef(value)).not.toThrow()
  expect(() => isReadonly(value)).not.toThrow()
  expect(() => isReactive(value)).not.toThrow()
  expect(() => reactive({ value })).not.toThrow()
  expect(isRef(value)).toBe(false)
  expect(isReadonly(value)).toBe(false)
  expect(isReactive(value)).toBe(false)
}

describe('createVueSafeAuthProxy', () => {
  it('guards Better Auth dynamic client proxies from Vue reactivity probes', () => {
    const fetch = vi.fn(async () => new Response('{}', {
      headers: { 'content-type': 'application/json' },
    }))
    const client = createAuthClient({
      baseURL: 'http://localhost:3000/api/auth',
      fetchOptions: { customFetchImpl: fetch },
    })
    const safeClient = createVueSafeAuthProxy(client)

    expectVueInspectionSafe(safeClient)
    expectVueInspectionSafe(safeClient.signIn)
    expectVueInspectionSafe(safeClient.signIn.email)
    expectVueInspectionSafe(safeClient.signUp)
    expectVueInspectionSafe(safeClient.signUp.email)
    expectVueInspectionSafe(safeClient.admin.impersonateUser)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves call results and does not wrap returned promises', async () => {
    const fetch = vi.fn(async () => new Response('{}', {
      headers: { 'content-type': 'application/json' },
    }))
    const client = createAuthClient({
      baseURL: 'http://localhost:3000/api/auth',
      fetchOptions: { customFetchImpl: fetch },
    })
    const safeClient = createVueSafeAuthProxy(client)
    const result = safeClient.signIn.email({ email: 'user@example.com', password: 'password' })

    expect(typeof result.then).toBe('function')
    await result
    expect(fetch).toHaveBeenCalledOnce()
  })
})
