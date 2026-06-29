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

    expect(typeof safeClient).toBe('object')
    expectVueInspectionSafe(safeClient)
    expectVueInspectionSafe(safeClient.signIn)
    expectVueInspectionSafe(safeClient.signIn.email)
    expectVueInspectionSafe(safeClient.signUp)
    expectVueInspectionSafe(safeClient.signUp.email)
    expectVueInspectionSafe((safeClient as Record<string, any>).sendVerificationEmail)
    expectVueInspectionSafe(safeClient.admin.impersonateUser)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps nested namespaces out of Vue reactive wrapping', () => {
    const client = createAuthClient({
      baseURL: 'http://localhost:3000/api/auth',
      fetchOptions: { customFetchImpl: vi.fn() },
    })
    const safeClient = createVueSafeAuthProxy(client)
    const store = reactive({ signIn: safeClient.signIn })

    expect(isReactive(store.signIn)).toBe(false)
    expect((store.signIn as Record<string, unknown>).__v_skip).toBe(true)
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

  it('preserves root dynamic client methods without making the root callable', async () => {
    const fetch = vi.fn(async () => new Response('{}', {
      headers: { 'content-type': 'application/json' },
    }))
    const client = createAuthClient({
      baseURL: 'http://localhost:3000/api/auth',
      fetchOptions: { customFetchImpl: fetch },
    })
    const safeClient = createVueSafeAuthProxy(client)
    const sendVerificationEmail = (safeClient as Record<string, any>).sendVerificationEmail

    expect(typeof safeClient).toBe('object')
    expect(typeof sendVerificationEmail).toBe('function')

    await sendVerificationEmail({ email: 'user@example.com' })

    expect(fetch).toHaveBeenCalledOnce()
  })

  it('does not probe then/catch/finally on raw dynamic proxy values while wrapping', () => {
    const probed: PropertyKey[] = []
    const rawDynamicProxy = new Proxy(() => Promise.resolve({}), {
      get(_target, prop) {
        probed.push(prop)
        return rawDynamicProxy
      },
      apply() {
        return Promise.resolve({})
      },
    })

    const safeProxy = createVueSafeAuthProxy(rawDynamicProxy)

    void safeProxy.signIn.email
    expect(probed).toEqual(['signIn', 'email'])
    expect((safeProxy as Record<string, unknown>).then).toBeUndefined()
    expect(probed).toEqual(['signIn', 'email'])
  })
})
