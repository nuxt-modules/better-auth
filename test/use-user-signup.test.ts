import { describe, expect, it, vi } from 'vitest'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let sessionMock: any

vi.mock('#imports', async () => {
  const vue = await import('vue')
  return {
    ref: vue.ref,
    computed: vue.computed,
    useUserSession: () => sessionMock,
  }
})

async function loadUseUserSignUp() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useUserSignUp')
  return mod.useUserSignUp
}

describe('useUserSignUp', () => {
  it('tracks status transitions and clears error on success', async () => {
    const d = deferred<{ ok: true }>()
    sessionMock = {
      signUp: {
        email: vi.fn(() => d.promise),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUp = useUserSignUp()
    const signUpEmail = signUp.email

    const p = signUpEmail.execute({} as any)
    expect(signUpEmail.status.value).toBe('pending')
    expect(signUpEmail.pending.value).toBe(true)

    d.resolve({ ok: true })
    await p

    expect(signUpEmail.status.value).toBe('success')
    expect(signUpEmail.pending.value).toBe(false)
    expect(signUpEmail.error.value).toBeNull()
  })

  it('sets error and rethrows when the method throws', async () => {
    sessionMock = {
      signUp: {
        email: vi.fn(() => {
          throw new Error('boom')
        }),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp().email

    await expect(signUpEmail.execute({} as any)).rejects.toThrow('boom')
    expect(signUpEmail.status.value).toBe('error')
    expect((signUpEmail.error.value as Error).message).toBe('boom')
  })

  it('sets error status for { error } responses without throwing', async () => {
    sessionMock = {
      signUp: {
        email: vi.fn(async () => ({ error: 'invalid credentials' })),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp().email

    await expect(signUpEmail.execute({} as any)).resolves.toEqual({ error: 'invalid credentials' })
    expect(signUpEmail.status.value).toBe('error')
    expect(signUpEmail.error.value).toBe('invalid credentials')
  })

  it('is race-safe (only latest call updates state)', async () => {
    const d1 = deferred<{ ok: false }>()
    const d2 = deferred<{ ok: true }>()
    let calls = 0

    sessionMock = {
      signUp: {
        email: vi.fn(() => {
          calls++
          return calls === 1 ? d1.promise : d2.promise
        }),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp().email

    const p1 = signUpEmail.execute({} as any)
    const p2 = signUpEmail.execute({} as any)

    d2.resolve({ ok: true })
    await p2
    expect(signUpEmail.status.value).toBe('success')
    expect(signUpEmail.error.value).toBeNull()

    d1.resolve({ ok: false })
    await p1
    expect(signUpEmail.status.value).toBe('success')
    expect(signUpEmail.error.value).toBeNull()
  })

  it('is SSR-safe (method is only accessed inside execute)', async () => {
    sessionMock = {
      signUp: new Proxy({}, {
        get: () => {
          throw new Error('server access')
        },
      }),
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp().email

    expect(signUpEmail.status.value).toBe('idle')
    await expect(signUpEmail.execute({} as any)).rejects.toThrow('server access')
    expect(signUpEmail.status.value).toBe('error')
  })
})
