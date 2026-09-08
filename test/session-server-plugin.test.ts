import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  event: { context: {}, res: { headers: new Headers() } },
  requestFetch: vi.fn(),
  states: new Map<string, ReturnType<typeof ref>>(),
}))

vi.mock('#imports', () => ({
  defineNuxtPlugin: <T>(plugin: T) => plugin,
  useRequestEvent: () => mocks.event,
  useRequestFetch: () => mocks.requestFetch,
  useState: <T>(key: string, init: () => T) => {
    if (!mocks.states.has(key))
      mocks.states.set(key, ref(init()))
    return mocks.states.get(key)
  },
}))

describe('server session bootstrap plugin', () => {
  beforeEach(() => {
    mocks.states.clear()
    mocks.requestFetch.mockReset()
    mocks.event.res.headers = new Headers()
  })

  it('hydrates through Nitro and forwards refreshed cookies without exposing the token', async () => {
    const cookies = ['session_token=refreshed; Path=/; HttpOnly', 'session_data=cached; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/']
    mocks.event.res.headers.append('set-cookie', 'existing=kept; Path=/')
    mocks.requestFetch.mockImplementation(async (_url, options) => {
      options.onResponse({ response: { headers: new Headers(cookies.map(cookie => ['set-cookie', cookie])) } })
      return {
        session: { id: 'session-1', token: 'private-token' },
        user: { id: 'user-1' },
      }
    })
    const plugin = (await import('../src/runtime/app/plugins/session.server')).default

    await plugin.setup?.({} as never)

    expect(mocks.requestFetch).toHaveBeenCalledWith('/api/auth/get-session', {
      parseResponse: expect.any(Function),
      onResponse: expect.any(Function),
    })
    expect(mocks.event.res.headers.getSetCookie()).toEqual(['existing=kept; Path=/', ...cookies])
    expect(mocks.states.get('auth:session')?.value).toEqual({ id: 'session-1' })
    expect(mocks.states.get('auth:user')?.value).toEqual({ id: 'user-1' })
    expect(mocks.states.get('auth:ready')?.value).toBe(true)
  })

  it('forwards cookie deletion on a failed session response without hydrating its body', async () => {
    const cookie = 'session_token=; Max-Age=0; Path=/'
    mocks.requestFetch.mockImplementation(async (_url, options) => {
      options.onResponse({ response: {
        headers: new Headers({ 'set-cookie': cookie }),
        _data: { session: { id: 'invalid-session' }, user: { id: 'invalid-user' } },
      } })
      throw new Error('Unauthorized')
    })
    const plugin = (await import('../src/runtime/app/plugins/session.server')).default

    await plugin.setup?.({} as never)

    expect(mocks.event.res.headers.getSetCookie()).toEqual([cookie])
    expect(mocks.states.get('auth:session')?.value).toBeNull()
    expect(mocks.states.get('auth:user')?.value).toBeNull()
    expect(mocks.states.get('auth:ready')?.value).toBe(true)
  })
})
