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

vi.mock('#imports', async () => {
  const vue = await import('vue')
  return {
    ref: vue.ref,
    computed: vue.computed,
  }
})

async function loadUseAction() {
  vi.resetModules()
  const mod = await import('../src/runtime/app/composables/useAction')
  return mod.useAction
}

describe('useAction', () => {
  it('sets success state and data on success', async () => {
    const d = deferred<{ ok: true }>()
    const runner = vi.fn(() => d.promise)

    const useAction = await loadUseAction()
    const action = useAction(runner)

    const p = action.execute('value' as any)
    expect(action.status.value).toBe('pending')
    expect(action.data.value).toBeNull()

    d.resolve({ ok: true })
    await expect(p).resolves.toBeUndefined()

    expect(action.status.value).toBe('success')
    expect(action.data.value).toEqual({ ok: true })
    expect(action.error.value).toBeNull()
  })

  it('sets normalized error state for thrown errors', async () => {
    const useAction = await loadUseAction()
    const action = useAction(async () => {
      throw new Error('boom')
    })

    await expect(action.execute()).resolves.toBeUndefined()
    expect(action.status.value).toBe('error')
    expect(action.data.value).toBeNull()
    expect(action.error.value?.message).toBe('boom')
    expect(action.error.value?.raw).toBeInstanceOf(Error)
  })

  it('sets normalized error state for { error } responses', async () => {
    const useAction = await loadUseAction()
    const action = useAction(async () => ({
      error: {
        message: 'not allowed',
        code: 'FORBIDDEN',
        statusCode: 403,
      },
    }))

    await expect(action.execute()).resolves.toBeUndefined()
    expect(action.status.value).toBe('error')
    expect(action.error.value).toMatchObject({
      message: 'not allowed',
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('is race-safe and only latest call updates state', async () => {
    const d1 = deferred<{ run: 1 }>()
    const d2 = deferred<{ run: 2 }>()
    let calls = 0

    const useAction = await loadUseAction()
    const action = useAction(async () => {
      calls++
      return calls === 1 ? d1.promise : d2.promise
    })

    const p1 = action.execute()
    const p2 = action.execute()

    d2.resolve({ run: 2 })
    await p2
    expect(action.status.value).toBe('success')
    expect(action.data.value).toEqual({ run: 2 })

    d1.resolve({ run: 1 })
    await p1
    expect(action.status.value).toBe('success')
    expect(action.data.value).toEqual({ run: 2 })
  })
})
