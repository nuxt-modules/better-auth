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

async function loadUseUserSignIn() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useUserSignIn')
  return mod.useUserSignIn
}

describe('useUserSignIn', () => {
  it('sets success state, data and clears error on success', async () => {
    const d = deferred<{ ok: true }>()
    sessionMock = {
      signIn: {
        email: vi.fn(() => d.promise),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    const p = signInEmail.execute({} as any)
    expect(signInEmail.status.value).toBe('pending')
    expect(signInEmail.data.value).toBeNull()

    d.resolve({ ok: true })
    await expect(p).resolves.toBeUndefined()

    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.data.value).toEqual({ ok: true })
    expect(signInEmail.error.value).toBeNull()
    expect(signInEmail.errorMessage.value).toBeNull()
  })

  it('clears previous data when a new execute starts', async () => {
    const d1 = deferred<{ ok: true }>()
    const d2 = deferred<{ ok: 'second' }>()
    let calls = 0
    sessionMock = {
      signIn: {
        email: vi.fn(() => {
          calls++
          return calls === 1 ? d1.promise : d2.promise
        }),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    const p1 = signInEmail.execute({} as any)
    d1.resolve({ ok: true })
    await p1
    expect(signInEmail.data.value).toEqual({ ok: true })

    const p2 = signInEmail.execute({} as any)
    expect(signInEmail.status.value).toBe('pending')
    expect(signInEmail.data.value).toBeNull()

    d2.resolve({ ok: 'second' })
    await p2
    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.data.value).toEqual({ ok: 'second' })
  })

  it('does not throw and sets error state for thrown method errors', async () => {
    sessionMock = {
      signIn: {
        email: vi.fn(() => {
          throw new Error('boom')
        }),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    await expect(signInEmail.execute({} as any)).resolves.toBeUndefined()
    expect(signInEmail.status.value).toBe('error')
    expect(signInEmail.data.value).toBeNull()
    expect(signInEmail.error.value).toMatchObject({ message: 'boom' })
    expect(signInEmail.error.value!.raw).toBeInstanceOf(Error)
    expect(signInEmail.errorMessage.value).toBe('boom')
  })

  it('does not throw and sets error state for { error } responses', async () => {
    const apiError = { message: 'invalid credentials', code: 'INVALID_EMAIL_OR_PASSWORD', statusCode: 401 }
    sessionMock = {
      signIn: {
        email: vi.fn(async () => ({ error: apiError })),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    await expect(signInEmail.execute({} as any)).resolves.toBeUndefined()
    expect(signInEmail.status.value).toBe('error')
    expect(signInEmail.data.value).toBeNull()
    expect(signInEmail.error.value).toMatchObject({
      message: 'invalid credentials',
      code: 'INVALID_EMAIL_OR_PASSWORD',
      status: 401,
    })
    expect(signInEmail.errorMessage.value).toBe('invalid credentials')
  })

  it('is race-safe (only latest call updates state)', async () => {
    const d1 = deferred<{ ok: false }>()
    const d2 = deferred<{ ok: true }>()
    let calls = 0

    sessionMock = {
      signIn: {
        email: vi.fn(() => {
          calls++
          return calls === 1 ? d1.promise : d2.promise
        }),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    const p1 = signInEmail.execute({} as any)
    const p2 = signInEmail.execute({} as any)

    d2.resolve({ ok: true })
    await expect(p2).resolves.toBeUndefined()
    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.data.value).toEqual({ ok: true })
    expect(signInEmail.error.value).toBeNull()

    d1.resolve({ ok: false })
    await expect(p1).resolves.toBeUndefined()
    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.data.value).toEqual({ ok: true })
    expect(signInEmail.error.value).toBeNull()
  })

  it('is SSR-safe (method is only accessed inside execute)', async () => {
    sessionMock = {
      signIn: new Proxy({}, {
        get: () => {
          throw new Error('server access')
        },
      }),
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    expect(signInEmail.status.value).toBe('idle')
    await expect(signInEmail.execute({} as any)).resolves.toBeUndefined()
    expect(signInEmail.status.value).toBe('error')
    expect(signInEmail.data.value).toBeNull()
    expect(signInEmail.error.value).toMatchObject({
      message: 'server access',
    })
  })

  it('returns a keyed action handle with the expected shape', async () => {
    sessionMock = {
      signIn: {
        email: vi.fn(async () => ({ ok: true })),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn('email')

    expect(typeof signInEmail.execute).toBe('function')
    expect(signInEmail.status.value).toBe('idle')
    expect(signInEmail.pending.value).toBe(false)
    expect(signInEmail.data.value).toBeNull()
    expect(signInEmail.error.value).toBeNull()
    expect(signInEmail.errorMessage.value).toBeNull()
  })

  it('throws when method key is missing', async () => {
    sessionMock = { signIn: {} }
    const useUserSignIn = await loadUseUserSignIn()
    expect(() => useUserSignIn(undefined as any)).toThrowError(TypeError)
    expect(() => useUserSignIn(undefined as any)).toThrow('requires a sign-in method key')
  })

  it('sets error state for invalid method key', async () => {
    sessionMock = {
      signIn: {
        email: vi.fn(async () => ({ ok: true })),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const invalid = useUserSignIn('invalid' as any)

    await expect(invalid.execute({} as any)).resolves.toBeUndefined()
    expect(invalid.status.value).toBe('error')
    expect(invalid.error.value?.raw).toBeInstanceOf(TypeError)
    expect(invalid.errorMessage.value).toBe('signIn.invalid() is not a function')
  })
})
