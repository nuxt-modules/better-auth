import { describe, expect, it, vi } from 'vitest'
import { useUserSessionState } from '../src/runtime/app/composables/useUserSessionState'

const authMock = vi.hoisted(() => ({ useUserSession: vi.fn() }))

vi.mock('../src/runtime/app/composables/useUserSession', () => ({
  useUserSession: authMock.useUserSession,
}))

describe('useUserSessionState', () => {
  it('forwards the original session instance as a deprecated alias', () => {
    const session = { user: { value: null } }
    authMock.useUserSession.mockReturnValue(session)

    expect(useUserSessionState()).toBe(session)
  })
})
