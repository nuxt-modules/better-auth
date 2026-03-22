import type { ComputedRef } from 'vue'
import { nextTick } from '#imports'
import { isRecord } from './utils'

export function wrapOnSuccess(
  fetchSession: (options?: { force?: boolean }) => Promise<void>,
  loggedIn: ComputedRef<boolean>,
  waitForSession: () => Promise<void>,
  cb: (ctx: unknown) => void | Promise<void>,
) {
  return async (ctx: unknown) => {
    await fetchSession({ force: true })
    if (!loggedIn.value)
      await waitForSession()
    await nextTick()
    await cb(ctx)
  }
}

export function wrapAuthMethod<T extends (...args: unknown[]) => Promise<unknown>>(
  method: T,
  deps: {
    fetchSession: (options?: { force?: boolean }) => Promise<void>
    loggedIn: ComputedRef<boolean>
    waitForSession: () => Promise<void>
    resolvePostAuthSuccessRedirect: () => (() => Promise<void>) | undefined
  },
  wrapOptions: {
    shouldSkipSessionSync?: (data: unknown, options: unknown) => boolean
    transformData?: (data: unknown, options: unknown) => unknown
  } = {},
): T {
  return (async (...args: unknown[]) => {
    const originalData = args[0]
    const options = args[1]
    const data = wrapOptions.transformData?.(originalData, options) ?? originalData
    const dataRecord = isRecord(data) ? data : undefined
    const optionsRecord = isRecord(options) ? options : undefined

    if (wrapOptions.shouldSkipSessionSync?.(data, options))
      return method(data, options)

    type OnSuccess = (ctx: unknown) => void | Promise<void>
    const fetchOptions = isRecord(dataRecord?.fetchOptions) ? dataRecord.fetchOptions : undefined
    const nestedOnSuccess = fetchOptions?.onSuccess
    const topLevelOnSuccess = optionsRecord?.onSuccess

    const fallbackOnSuccess = deps.resolvePostAuthSuccessRedirect()
    const wrappedFallbackOnSuccess = fallbackOnSuccess && wrapOnSuccess(deps.fetchSession, deps.loggedIn, deps.waitForSession, async () => {
      if (!deps.loggedIn.value)
        return
      await fallbackOnSuccess()
    })

    // Passkey pattern: onSuccess in data.fetchOptions
    if (typeof nestedOnSuccess === 'function') {
      const nextData = {
        ...dataRecord,
        fetchOptions: {
          ...fetchOptions,
          onSuccess: wrapOnSuccess(deps.fetchSession, deps.loggedIn, deps.waitForSession, nestedOnSuccess as OnSuccess),
        },
      }
      return method(nextData as unknown as Parameters<T>[0], options as unknown as Parameters<T>[1])
    }
    // Email/social pattern: onSuccess in options
    if (typeof topLevelOnSuccess === 'function') {
      const nextOptions = {
        ...optionsRecord,
        onSuccess: wrapOnSuccess(deps.fetchSession, deps.loggedIn, deps.waitForSession, topLevelOnSuccess as OnSuccess),
      }
      return method(data as unknown as Parameters<T>[0], nextOptions as unknown as Parameters<T>[1])
    }

    if (wrappedFallbackOnSuccess) {
      if (fetchOptions) {
        const nextData = {
          ...dataRecord,
          fetchOptions: {
            ...fetchOptions,
            onSuccess: wrappedFallbackOnSuccess,
          },
        }
        return method(nextData as unknown as Parameters<T>[0], options as unknown as Parameters<T>[1])
      }

      const nextOptions = {
        ...optionsRecord,
        onSuccess: wrappedFallbackOnSuccess,
      }
      return method(data as unknown as Parameters<T>[0], nextOptions as unknown as Parameters<T>[1])
    }

    return method(data, options)
  }) as T
}
