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
  it('returns a keyed action handle with the expected shape', async () => {
    sessionMock = {
      signUp: {
        email: vi.fn(async () => ({ ok: true })),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp('email')
    const isPending = () => signUpEmail.status.value === 'pending'

    expect(typeof signUpEmail.execute).toBe('function')
    expect(signUpEmail.status.value).toBe('idle')
    expect(isPending()).toBe(false)
    expect(signUpEmail.data.value).toBeNull()
    expect(signUpEmail.error.value).toBeNull()
    expect(signUpEmail.error.value?.message).toBeUndefined()
  })

  it('sets success state, data and clears error on success', async () => {
    const d = deferred<{ ok: true }>()
    sessionMock = {
      signUp: {
        email: vi.fn(() => d.promise),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp('email')
    const isPending = () => signUpEmail.status.value === 'pending'

    const p = signUpEmail.execute({} as any)
    expect(signUpEmail.status.value).toBe('pending')
    expect(isPending()).toBe(true)
    expect(signUpEmail.data.value).toBeNull()

    d.resolve({ ok: true })
    await expect(p).resolves.toBeUndefined()

    expect(signUpEmail.status.value).toBe('success')
    expect(isPending()).toBe(false)
    expect(signUpEmail.data.value).toEqual({ ok: true })
    expect(signUpEmail.error.value).toBeNull()
    expect(signUpEmail.error.value?.message).toBeUndefined()
  })

  it('does not throw and sets error state for thrown method errors', async () => {
    sessionMock = {
      signUp: {
        email: vi.fn(() => {
          throw new Error('boom')
        }),
      },
    }

    const useUserSignUp = await loadUseUserSignUp()
    const signUpEmail = useUserSignUp('email')

    await expect(signUpEmail.execute({} as any)).resolves.toBeUndefined()
    expect(signUpEmail.status.value).toBe('error')
    expect(signUpEmail.data.value).toBeNull()
    expect(signUpEmail.error.value).toMatchObject({ message: 'boom' })
    expect(signUpEmail.error.value!.raw).toBeInstanceOf(Error)
    expect(signUpEmail.error.value?.message).toBe('boom')
  })

  it('throws when method key is missing', async () => {
    sessionMock = { signUp: {} }
    const useUserSignUp = await loadUseUserSignUp()
    expect(() => useUserSignUp(undefined as any)).toThrowError(TypeError)
    expect(() => useUserSignUp(undefined as any)).toThrow('requires a sign-up method key')
  })
})
