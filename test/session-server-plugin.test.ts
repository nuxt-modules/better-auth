import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  event: { context: {}, res: { headers: new Headers() } },
  requestFetchRaw: vi.fn(),
  states: new Map<string, ReturnType<typeof ref>>(),
}))

vi.mock('#imports', () => ({
  defineNuxtPlugin: <T>(plugin: T) => plugin,
  useRequestEvent: () => mocks.event,
  useRequestFetch: () => ({ raw: mocks.requestFetchRaw }),
  useState: <T>(key: string, init: () => T) => {
    if (!mocks.states.has(key))
      mocks.states.set(key, ref(init()))
    return mocks.states.get(key)
  },
}))

describe('server session bootstrap plugin', () => {
  beforeEach(() => {
    mocks.states.clear()
    mocks.requestFetchRaw.mockReset()
    mocks.event.res.headers = new Headers()
  })

  it('hydrates through Nitro and forwards refreshed cookies without exposing the token', async () => {
    const cookies = ['session_token=refreshed; Path=/; HttpOnly', 'session_data=cached; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/']
    mocks.event.res.headers.append('set-cookie', 'existing=kept; Path=/')
    mocks.requestFetchRaw.mockResolvedValue({
      ok: true,
      headers: new Headers(cookies.map(cookie => ['set-cookie', cookie])),
      _data: {
        session: { id: 'session-1', token: 'private-token' },
        user: { id: 'user-1' },
      },
    })
    const plugin = (await import('../src/runtime/app/plugins/session.server')).default

    await plugin.setup?.({} as never)

    expect(mocks.requestFetchRaw).toHaveBeenCalledWith('/api/auth/get-session', {
      parseResponse: expect.any(Function),
      ignoreResponseError: true,
    })
    expect(mocks.event.res.headers.getSetCookie()).toEqual(['existing=kept; Path=/', ...cookies])
    expect(mocks.states.get('auth:session')?.value).toEqual({ id: 'session-1' })
    expect(mocks.states.get('auth:user')?.value).toEqual({ id: 'user-1' })
    expect(mocks.states.get('auth:ready')?.value).toBe(true)
  })

  it('forwards cookie deletion on a failed session response without hydrating its body', async () => {
    const cookie = 'session_token=; Max-Age=0; Path=/'
    mocks.requestFetchRaw.mockResolvedValue({
      ok: false,
      headers: new Headers({ 'set-cookie': cookie }),
      _data: { session: { id: 'invalid-session' }, user: { id: 'invalid-user' } },
    })
    const plugin = (await import('../src/runtime/app/plugins/session.server')).default

    await plugin.setup?.({} as never)

    expect(mocks.event.res.headers.getSetCookie()).toEqual([cookie])
    expect(mocks.states.get('auth:session')?.value).toBeNull()
    expect(mocks.states.get('auth:user')?.value).toBeNull()
    expect(mocks.states.get('auth:ready')?.value).toBe(true)
  })
})
