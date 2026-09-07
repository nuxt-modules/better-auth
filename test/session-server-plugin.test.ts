import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  event: { context: {} },
  getRequestSession: vi.fn(),
  states: new Map<string, ReturnType<typeof ref>>(),
}))

vi.mock('#imports', () => ({
  defineNuxtPlugin: <T>(plugin: T) => plugin,
  useRequestEvent: () => mocks.event,
  useState: <T>(key: string, init: () => T) => {
    if (!mocks.states.has(key))
      mocks.states.set(key, ref(init()))
    return mocks.states.get(key)
  },
}))

vi.mock('../src/runtime/server/utils/session', () => ({
  getRequestSession: mocks.getRequestSession,
}))

describe('server session bootstrap plugin', () => {
  beforeEach(() => {
    mocks.states.clear()
    mocks.getRequestSession.mockReset()
  })

  it('hydrates through the request-scoped server session path', async () => {
    mocks.getRequestSession.mockResolvedValue({
      session: { id: 'session-1', token: 'private-token' },
      user: { id: 'user-1' },
    })
    const plugin = (await import('../src/runtime/app/plugins/session.server')).default

    await plugin.setup?.({} as never)

    expect(mocks.getRequestSession).toHaveBeenCalledWith(mocks.event)
    expect(mocks.states.get('auth:session')?.value).toEqual({ id: 'session-1' })
    expect(mocks.states.get('auth:user')?.value).toEqual({ id: 'user-1' })
    expect(mocks.states.get('auth:ready')?.value).toBe(true)
  })
})
