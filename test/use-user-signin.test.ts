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
  it('returns success result and clears error on success', async () => {
    const d = deferred<{ ok: true }>()
    sessionMock = {
      signIn: {
        email: vi.fn(() => d.promise),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signIn = useUserSignIn()
    const signInEmail = signIn.email

    const p = signInEmail.execute({} as any)
    expect(signInEmail.status.value).toBe('pending')
    expect(signInEmail.pending.value).toBe(true)

    d.resolve({ ok: true })
    await expect(p).resolves.toEqual({ ok: true, data: { ok: true } })

    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.pending.value).toBe(false)
    expect(signInEmail.error.value).toBeNull()
    expect(signInEmail.errorMessage.value).toBeNull()
  })

  it('returns error result for thrown method errors', async () => {
    sessionMock = {
      signIn: {
        email: vi.fn(() => {
          throw new Error('boom')
        }),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn().email

    const result = await signInEmail.execute({} as any)
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error).toMatchObject({ message: 'boom' })
    expect(signInEmail.status.value).toBe('error')
    expect(signInEmail.error.value).toMatchObject({ message: 'boom' })
    expect(signInEmail.error.value!.raw).toBeInstanceOf(Error)
    expect(signInEmail.errorMessage.value).toBe('boom')
  })

  it('returns error result for { error } responses', async () => {
    const apiError = { message: 'invalid credentials', code: 'INVALID_EMAIL_OR_PASSWORD', statusCode: 401 }
    sessionMock = {
      signIn: {
        email: vi.fn(async () => ({ error: apiError })),
      },
    }

    const useUserSignIn = await loadUseUserSignIn()
    const signInEmail = useUserSignIn().email

    await expect(signInEmail.execute({} as any)).resolves.toEqual({
      ok: false,
      error: {
        message: 'invalid credentials',
        code: 'INVALID_EMAIL_OR_PASSWORD',
        status: 401,
        raw: apiError,
      },
    })
    expect(signInEmail.status.value).toBe('error')
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
    const signInEmail = useUserSignIn().email

    const p1 = signInEmail.execute({} as any)
    const p2 = signInEmail.execute({} as any)

    d2.resolve({ ok: true })
    await expect(p2).resolves.toEqual({ ok: true, data: { ok: true } })
    expect(signInEmail.status.value).toBe('success')
    expect(signInEmail.error.value).toBeNull()

    d1.resolve({ ok: false })
    await expect(p1).resolves.toEqual({ ok: true, data: { ok: false } })
    expect(signInEmail.status.value).toBe('success')
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
    const signInEmail = useUserSignIn().email

    expect(signInEmail.status.value).toBe('idle')
    await expect(signInEmail.execute({} as any)).resolves.toEqual({
      ok: false,
      error: {
        message: 'server access',
        code: undefined,
        status: undefined,
        raw: expect.any(Error),
      },
    })
    expect(signInEmail.status.value).toBe('error')
  })
})
