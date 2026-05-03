import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, isReactive, isReadonly, isRef, reactive, ref } from 'vue'
import { useUserSessionState } from '../src/runtime/app/composables/useUserSessionState'

const authMock = vi.hoisted(() => ({
  useUserSession: vi.fn(),
}))

vi.mock('../src/runtime/app/composables/useUserSession', () => ({
  useUserSession: authMock.useUserSession,
}))

function createRecursiveProxy(): any {
  return new Proxy({}, {
    get() {
      return createRecursiveProxy()
    },
  })
}

function expectPiniaInspectionSafe(value: unknown) {
  expect(() => isRef(value)).not.toThrow()
  expect(() => isReadonly(value)).not.toThrow()
  expect(() => isReactive(value)).not.toThrow()
  expect(() => reactive({ value })).not.toThrow()
}

describe('useUserSessionState', () => {
  beforeEach(() => {
    authMock.useUserSession.mockReturnValue({
      client: createRecursiveProxy(),
      signIn: createRecursiveProxy(),
      signUp: createRecursiveProxy(),
      session: ref(null),
      user: ref(null),
      loggedIn: computed(() => false),
      ready: computed(() => true),
      signOut: vi.fn(async () => {}),
      waitForSession: vi.fn(async () => {}),
      fetchSession: vi.fn(async () => {}),
      updateUser: vi.fn(async () => {}),
    })
  })

  it('returns only store-safe session state and actions', () => {
    const authState = useUserSessionState()

    expect(Object.keys(authState).sort()).toEqual([
      'fetchSession',
      'loggedIn',
      'ready',
      'session',
      'signOut',
      'updateUser',
      'user',
      'waitForSession',
    ])
    expect('client' in authState).toBe(false)
    expect('signIn' in authState).toBe(false)
    expect('signUp' in authState).toBe(false)
  })

  it('can be spread into a Pinia setup store without inspecting auth client proxies', () => {
    const store = {
      ...useUserSessionState(),
    }

    for (const value of Object.values(store))
      expectPiniaInspectionSafe(value)

    expect(isRef(store.user)).toBe(true)
    expect(isRef(store.session)).toBe(true)
    expect(isRef(store.loggedIn)).toBe(true)
    expect(isRef(store.ready)).toBe(true)
    expect(isReactive(store.signOut)).toBe(false)
    expect(isReactive(store.fetchSession)).toBe(false)
  })
})
