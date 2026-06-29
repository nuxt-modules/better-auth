import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchSession: vi.fn(async () => {}),
  nextTick: vi.fn(async () => {}),
  waitForSession: vi.fn(async () => {}),
  loggedIn: { value: true },
}))

vi.mock('#imports', () => ({
  nextTick: mocks.nextTick,
}))

vi.mock('../src/runtime/app/composables/useUserSession', () => ({
  useUserSession: () => ({
    fetchSession: mocks.fetchSession,
    loggedIn: mocks.loggedIn,
    waitForSession: mocks.waitForSession,
  }),
}))

async function loadRunWithSessionRefresh() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/runWithSessionRefresh')
  return mod.runWithSessionRefresh
}

describe('runWithSessionRefresh', () => {
  beforeEach(() => {
    mocks.fetchSession.mockClear()
    mocks.nextTick.mockClear()
    mocks.waitForSession.mockClear()
    mocks.loggedIn.value = true
  })

  it('runs the action, refreshes the session, and returns the action result', async () => {
    const runWithSessionRefresh = await loadRunWithSessionRefresh()
    const runner = vi.fn(async () => ({ ok: true }))

    await expect(runWithSessionRefresh(runner)).resolves.toEqual({ ok: true })

    expect(runner).toHaveBeenCalledOnce()
    expect(mocks.fetchSession).toHaveBeenCalledWith({ force: true })
    expect(mocks.waitForSession).not.toHaveBeenCalled()
    expect(mocks.nextTick).toHaveBeenCalledOnce()
  })

  it('waits when the forced refresh has not produced a logged-in session yet', async () => {
    mocks.loggedIn.value = false
    const runWithSessionRefresh = await loadRunWithSessionRefresh()

    await runWithSessionRefresh(async () => ({ ok: true }))

    expect(mocks.fetchSession).toHaveBeenCalledWith({ force: true })
    expect(mocks.waitForSession).toHaveBeenCalledOnce()
    expect(mocks.nextTick).toHaveBeenCalledOnce()
  })

  it('does not refresh after rejected actions', async () => {
    const runWithSessionRefresh = await loadRunWithSessionRefresh()
    const error = new Error('boom')

    await expect(runWithSessionRefresh(async () => {
      throw error
    })).rejects.toThrow('boom')

    expect(mocks.fetchSession).not.toHaveBeenCalled()
  })

  it('does not refresh Better Auth error results', async () => {
    const runWithSessionRefresh = await loadRunWithSessionRefresh()
    const result = { error: { message: 'nope' } }

    await expect(runWithSessionRefresh(async () => result)).resolves.toBe(result)

    expect(mocks.fetchSession).not.toHaveBeenCalled()
  })

  it('requires a runner function', async () => {
    const runWithSessionRefresh = await loadRunWithSessionRefresh()

    await expect(runWithSessionRefresh(null as never)).rejects.toThrow('runWithSessionRefresh(runner) requires an async function')
  })
})
