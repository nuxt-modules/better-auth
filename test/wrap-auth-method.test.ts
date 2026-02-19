import { describe, expect, it, vi } from 'vitest'

/**
 * Better Auth callback patterns:
 * - Standard (email, social): signIn.email(data, { onSuccess })
 * - Passkey: signIn.passkey({ fetchOptions: { onSuccess } })
 */

function createWrapper(
  waitFn: () => Promise<void>,
  fallbackOnSuccess?: (ctx: any) => void | Promise<void>,
  wrapperOptions: { shouldSkipSessionSync?: (data: any, opts: any) => boolean } = {},
) {
  return <T extends (...args: any[]) => Promise<any>>(method: T): T => (async (...args: any[]) => {
    const [data, opts] = args
    if (wrapperOptions.shouldSkipSessionSync?.(data, opts))
      return method(data, opts)
    const nested = data?.fetchOptions?.onSuccess
    const topLevel = opts?.onSuccess
    const wrap = (cb: any) => async (ctx: any) => {
      await waitFn()
      await cb(ctx)
    }

    if (!nested && !topLevel) {
      if (!fallbackOnSuccess)
        return method(data, opts)
      if (data?.fetchOptions) {
        return method({
          ...data,
          fetchOptions: {
            ...data.fetchOptions,
            onSuccess: wrap(fallbackOnSuccess),
          },
        }, opts)
      }
      return method(data, { ...opts, onSuccess: wrap(fallbackOnSuccess) })
    }

    if (nested) {
      const onSuccess = async (ctx: any) => {
        await waitFn()
        await nested(ctx)
      }
      return method({ ...data, fetchOptions: { ...data.fetchOptions, onSuccess } }, opts)
    }
    const onSuccess = async (ctx: any) => {
      await waitFn()
      await topLevel(ctx)
    }
    return method(data, { ...opts, onSuccess })
  }) as T
}

describe('wrapAuthMethod', () => {
  it('standard: signIn.email(data, { onSuccess })', async () => {
    const wait = vi.fn()
    const onSuccess = vi.fn()
    const method = vi.fn(async (_, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait)(method)({ email: 'a@b.c' }, { onSuccess })
    expect(wait).toHaveBeenCalledBefore(onSuccess)
  })

  it('passkey: signIn.passkey({ fetchOptions: { onSuccess } })', async () => {
    const wait = vi.fn()
    const onSuccess = vi.fn()
    const method = vi.fn(async (opts) => {
      await opts?.fetchOptions?.onSuccess?.('ctx')
    })
    await createWrapper(wait)(method)({ fetchOptions: { onSuccess } })
    expect(wait).toHaveBeenCalledBefore(onSuccess)
  })

  it('uses fallback when no callback is provided', async () => {
    const wait = vi.fn()
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait, fallbackOnSuccess)(method)({ email: 'a@b.c' })
    expect(wait).toHaveBeenCalledBefore(fallbackOnSuccess)
    expect(fallbackOnSuccess).toHaveBeenCalledOnce()
  })

  it('prefers explicit onSuccess over fallback', async () => {
    const wait = vi.fn()
    const onSuccess = vi.fn()
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait, fallbackOnSuccess)(method)({ email: 'a@b.c' }, { onSuccess })
    expect(wait).toHaveBeenCalledBefore(onSuccess)
    expect(fallbackOnSuccess).not.toHaveBeenCalled()
  })

  it('no callback: passes through', async () => {
    const wait = vi.fn()
    const method = vi.fn()
    await createWrapper(wait)(method)({ email: 'a@b.c' })
    expect(wait).not.toHaveBeenCalled()
  })

  it('social sign-in path can skip session sync wrapping for redirecting requests', async () => {
    const wait = vi.fn()
    const onSuccess = vi.fn()
    const method = vi.fn(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait, undefined, {
      shouldSkipSessionSync: data => data?.disableRedirect !== true,
    })(method)({ provider: 'github' }, { onSuccess })
    expect(wait).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('social sign-in with disableRedirect keeps session sync wrapping', async () => {
    const wait = vi.fn()
    const onSuccess = vi.fn()
    const method = vi.fn(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait, undefined, {
      shouldSkipSessionSync: data => data?.disableRedirect !== true,
    })(method)({ provider: 'github', disableRedirect: true }, { onSuccess })
    expect(wait).toHaveBeenCalledBefore(onSuccess)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('social sign-in with disableRedirect keeps fallback wrapping', async () => {
    const wait = vi.fn()
    const fallbackOnSuccess = vi.fn()
    const method = vi.fn(async (_data, opts) => {
      await opts?.onSuccess?.('ctx')
    })
    await createWrapper(wait, fallbackOnSuccess, {
      shouldSkipSessionSync: data => data?.disableRedirect !== true,
    })(method)({ provider: 'github', disableRedirect: true })
    expect(wait).toHaveBeenCalledBefore(fallbackOnSuccess)
    expect(fallbackOnSuccess).toHaveBeenCalledOnce()
  })
})
