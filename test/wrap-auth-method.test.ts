import type { ComputedRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { wrapAuthMethod } from '../src/runtime/app/internal/wrap-auth-method'

const mocks = vi.hoisted(() => ({
  nextTick: vi.fn(async () => {}),
}))

vi.mock('#imports', () => ({
  nextTick: mocks.nextTick,
}))

/**
 * Better Auth callback patterns:
 * - Standard (email, social): signIn.email(data, { onSuccess })
 * - Passkey: signIn.passkey({ fetchOptions: { onSuccess } })
 */

function createDeps(
  fetchSession: () => Promise<void>,
  fallbackOnSuccess?: () => void | Promise<void>,
  loggedIn = true,
) {
  return {
    fetchSession,
    loggedIn: { value: loggedIn } as ComputedRef<boolean>,
    waitForSession: vi.fn(async () => {}),
    resolvePostAuthSuccessRedirect: () => fallbackOnSuccess,
  }
}

describe('wrapAuthMethod', () => {
  beforeEach(() => {
    mocks.nextTick.mockClear()
  })

  it('does not wait after a successful action destroys an existing session', async () => {
    vi.useFakeTimers()
    let settledBeforeTimeout = false
    let timerCountBeforeCleanup = 0
    const loggedIn = ref(true)
    const waitForSession = vi.fn(() => new Promise<void>((resolve) => {
      setTimeout(resolve, 5000)
    }))
    const onSuccess = vi.fn()

    try {
      const wrapped = wrapAuthMethod(
        vi.fn(async (_data, options) => {
          loggedIn.value = false
          await options?.onSuccess?.({ data: { success: true } })
        }),
        {
          fetchSession: vi.fn(async () => {}),
          loggedIn: computed(() => loggedIn.value),
          waitForSession,
          resolvePostAuthSuccessRedirect: () => undefined,
        },
        { shouldWaitForSession: () => true },
      )

      let settled = false
      const pending = wrapped({}, { onSuccess }).then(() => {
        settled = true
      })
      await vi.advanceTimersByTimeAsync(0)
      settledBeforeTimeout = settled
      timerCountBeforeCleanup = vi.getTimerCount()
      await vi.runAllTimersAsync()
      await pending
    }
    finally {
      vi.useRealTimers()
    }

    expect(settledBeforeTimeout).toBe(true)
    expect(timerCountBeforeCleanup).toBe(0)
    expect(waitForSession).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('refreshes before a standard onSuccess callback', async () => {
    const fetchSession = vi.fn(async () => {})
    const onSuccess = vi.fn()
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession))

    await wrapped({ email: 'a@b.c' }, { onSuccess })

    expect(fetchSession).toHaveBeenCalledWith({ force: true })
    expect(fetchSession).toHaveBeenCalledBefore(onSuccess)
    expect(onSuccess).toHaveBeenCalledWith('ctx')
    expect(mocks.nextTick).toHaveBeenCalledOnce()
  })

  it('refreshes before a nested passkey onSuccess callback', async () => {
    const fetchSession = vi.fn(async () => {})
    const onSuccess = vi.fn()
    const method = vi.fn(async (data) => {
      await data?.fetchOptions?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession))

    await wrapped({ fetchOptions: { onSuccess } })

    expect(fetchSession).toHaveBeenCalledBefore(onSuccess)
    expect(onSuccess).toHaveBeenCalledWith('ctx')
  })

  it('uses the post-auth redirect fallback when no callback is provided', async () => {
    const fetchSession = vi.fn(async () => {})
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession, fallbackOnSuccess))

    await wrapped({ email: 'a@b.c' })

    expect(fetchSession).toHaveBeenCalledBefore(fallbackOnSuccess)
    expect(fallbackOnSuccess).toHaveBeenCalledOnce()
  })

  it('puts the fallback in existing nested fetch options', async () => {
    const fetchSession = vi.fn(async () => {})
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (data) => {
      await data?.fetchOptions?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession, fallbackOnSuccess))

    await wrapped({ fetchOptions: { credentials: 'include' } })

    expect(fetchSession).toHaveBeenCalledBefore(fallbackOnSuccess)
    expect(method.mock.calls[0]?.[0].fetchOptions.credentials).toBe('include')
  })

  it('prefers an explicit onSuccess callback over the fallback', async () => {
    const fetchSession = vi.fn(async () => {})
    const onSuccess = vi.fn()
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession, fallbackOnSuccess))

    await wrapped({ email: 'a@b.c' }, { onSuccess })

    expect(fetchSession).toHaveBeenCalledBefore(onSuccess)
    expect(fallbackOnSuccess).not.toHaveBeenCalled()
  })

  it('passes through when no callback or fallback is available', async () => {
    const fetchSession = vi.fn(async () => {})
    const method = vi.fn(async () => ({ ok: true }))
    const data = { email: 'a@b.c' }
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession))

    await expect(wrapped(data)).resolves.toEqual({ ok: true })

    expect(method).toHaveBeenCalledWith(data, undefined)
    expect(fetchSession).not.toHaveBeenCalled()
  })

  it('can skip session synchronization for redirecting social sign-in', async () => {
    const fetchSession = vi.fn(async () => {})
    const onSuccess = vi.fn()
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession), {
      shouldSkipSessionSync: data => (data as { disableRedirect?: boolean })?.disableRedirect !== true,
    })

    await wrapped({ provider: 'github' }, { onSuccess })

    expect(fetchSession).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('keeps session synchronization for social sign-in without a redirect', async () => {
    const fetchSession = vi.fn(async () => {})
    const onSuccess = vi.fn()
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, createDeps(fetchSession), {
      shouldSkipSessionSync: data => (data as { disableRedirect?: boolean })?.disableRedirect !== true,
    })

    await wrapped({ provider: 'github', disableRedirect: true }, { onSuccess })

    expect(fetchSession).toHaveBeenCalledBefore(onSuccess)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not run the redirect fallback when refresh did not produce a session', async () => {
    const fetchSession = vi.fn(async () => {})
    const fallbackOnSuccess = vi.fn()
    const deps = createDeps(fetchSession, fallbackOnSuccess, false)
    const method = vi.fn(async (_data, options) => {
      await options?.onSuccess?.('ctx')
    })
    const wrapped = wrapAuthMethod(method, deps, { shouldWaitForSession: () => true })

    await wrapped({ email: 'a@b.c' })

    expect(deps.waitForSession).toHaveBeenCalledOnce()
    expect(fallbackOnSuccess).not.toHaveBeenCalled()
  })
})
