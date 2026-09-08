import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createUserSessionMock } from '@nuxtjs/better-auth/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import SessionPanel from '../cases/test-utils/app/components/SessionPanel.vue'

const { auth } = await vi.hoisted(async () => {
  const { createUserSessionMock } = await import('@nuxtjs/better-auth/test-utils/runtime')
  return { auth: createUserSessionMock() }
})
mockNuxtImport('useUserSession', () => () => auth)

const fixture = {
  user: {
    role: 'viewer',
    id: 'user-1',
    name: 'Viewer',
    email: 'viewer@example.test',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    label: 'fixture',
    id: 'session-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 3600_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

beforeEach(() => auth.reset())
afterEach(() => vi.useRealTimers())

describe('nuxt session mock', () => {
  it('isolates initial fixtures from mutations and restores them on reset', async () => {
    const initial = reactive(structuredClone(fixture))
    const mock = createUserSessionMock(initial)
    initial.user.name = 'Changed outside the mock'
    mock.user.value!.name = 'Changed inside the mock'
    mock.reset()
    expect(mock.user.value?.name).toBe('Viewer')
    expect(mock.session.value?.expiresAt).toEqual(fixture.session.expiresAt)
    mock.setSession({ user: mock.user.value!, session: mock.session.value! })
    expect(mock.user.value?.name).toBe('Viewer')
    await mock.fetchSession({ force: true })
    expect(mock.loggedIn.value).toBe(true)
  })

  it('updates mounted components and clears state on sign out', async () => {
    const wrapper = await mountSuspended(SessionPanel)
    expect(wrapper.text()).toContain('Guest')
    auth.setSession(fixture)
    await nextTick()
    expect(wrapper.text()).toContain('Viewer')
    auth.user.value!.name = 'Direct update'
    await nextTick()
    expect(wrapper.text()).toContain('Direct update')
    await auth.updateUser({ name: 'Updated viewer' })
    await nextTick()
    expect(wrapper.text()).toContain('Updated viewer')
    expect(fixture.user.name).toBe('Viewer')
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('Guest')
    wrapper.unmount()
  })

  it('waits for authentication even when ready and cancels its timeout after login', async () => {
    vi.useFakeTimers()
    expect(auth.loggedIn.value).toBe(false)
    expect(auth.ready.value).toBe(true)
    const resolved = vi.fn()
    const pending = auth.waitForSession().then(resolved)
    await nextTick()
    expect(resolved).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)
    auth.setSession(fixture, { ready: false })
    await pending
    expect(resolved).toHaveBeenCalledOnce()
    expect(auth.ready.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await auth.waitForSession()
    expect(vi.getTimerCount()).toBe(0)
    const callback = vi.fn()
    await auth.signOut({ onSuccess: callback })
    expect(callback).toHaveBeenCalledOnce()
    expect(auth.user.value).toBeNull()
    expect(auth.session.value).toBeNull()
  })

  it('stops waiting after five seconds without an authenticated session', async () => {
    vi.useFakeTimers()
    auth.setSession(null, { ready: false })
    const resolved = vi.fn()
    const pending = auth.waitForSession().then(resolved)
    await vi.advanceTimersByTimeAsync(4999)
    expect(resolved).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(resolved).toHaveBeenCalledOnce()
    expect(auth.loggedIn.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
