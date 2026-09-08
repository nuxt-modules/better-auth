import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { createUserSessionMock } from '@nuxtjs/better-auth/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
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

describe('nuxt session mock', () => {
  it('isolates initial fixtures from mutations and restores them on reset', async () => {
    const initial = structuredClone(fixture)
    const mock = createUserSessionMock(initial)
    initial.user.name = 'Changed outside the mock'
    mock.user.value!.name = 'Changed inside the mock'
    mock.reset()
    expect(mock.user.value?.name).toBe('Viewer')
    expect(mock.session.value?.expiresAt).toEqual(fixture.session.expiresAt)
    await mock.fetchSession({ force: true })
    expect(mock.loggedIn.value).toBe(true)
  })

  it('updates mounted components and clears state on sign out', async () => {
    const wrapper = await mountSuspended(SessionPanel)
    expect(wrapper.text()).toContain('Guest')
    auth.setSession(fixture)
    await nextTick()
    expect(wrapper.text()).toContain('Viewer')
    await auth.updateUser({ name: 'Updated viewer' })
    await nextTick()
    expect(wrapper.text()).toContain('Updated viewer')
    expect(fixture.user.name).toBe('Viewer')
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('Guest')
    wrapper.unmount()
  })

  it('resets between tests and resolves readiness when a session is supplied', async () => {
    expect(auth.loggedIn.value).toBe(false)
    auth.setSession(null, { ready: false })
    let ready = false
    const pending = auth.waitForSession().then(() => {
      ready = true
    })
    await nextTick()
    expect(ready).toBe(false)
    auth.setSession(fixture)
    await pending
    expect(auth.ready.value).toBe(true)
    const callback = vi.fn()
    await auth.signOut({ onSuccess: callback })
    expect(callback).toHaveBeenCalledOnce()
    expect(auth.user.value).toBeNull()
    expect(auth.session.value).toBeNull()
  })
})
