import type { Ref } from 'vue'
import type { AuthActionError } from '../../types'
import { ref } from '#imports'
import { normalizeAuthActionError } from './auth-action-error'
import { isRecord } from './utils'

export type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<void>
  status: Ref<UserAuthActionStatus>
  data: Ref<TResult | null>
  error: Ref<AuthActionError | null>
}

export interface CreateActionHandleOptions {
  keepPendingOnRedirect?: boolean
}

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>
export type ActionHandleFor<T> = T extends (...args: infer A) => Promise<infer R>
  ? UserAuthActionHandle<A, R>
  : never
export type ActionHandleMap<T> = {
  [K in keyof T]: ActionHandleFor<T[K]>
}

function isErrorResult(value: unknown): value is { error: unknown } {
  if (!isRecord(value))
    return false
  if (!('error' in value))
    return false
  return Boolean((value as Record<string, unknown>).error)
}

function isRedirectResult(value: unknown): value is { redirect: true, url: string } {
  if (!isRecord(value))
    return false
  return value.redirect === true && typeof value.url === 'string' && value.url.length > 0
}

function getRedirectResult(value: unknown): { redirect: true, url: string } | null {
  if (isRedirectResult(value))
    return value

  if (!isRecord(value))
    return null

  const nested = value.data
  if (isRedirectResult(nested))
    return nested

  return null
}

const REDIRECT_PENDING_FALLBACK_MS = 10_000

export function createActionHandle<TArgs extends unknown[], TResult>(
  getMethod: () => (...args: TArgs) => Promise<TResult>,
  options: CreateActionHandleOptions = {},
): UserAuthActionHandle<TArgs, TResult> {
  const status = ref<UserAuthActionStatus>('idle')
  const data = ref<TResult | null>(null) as Ref<TResult | null>
  const error = ref<AuthActionError | null>(null)

  let latestCallId = 0

  const run = async (...args: TArgs): Promise<void> => {
    const callId = ++latestCallId
    status.value = 'pending'
    data.value = null
    error.value = null

    try {
      const result = await getMethod()(...args)
      if (isErrorResult(result as unknown)) {
        const normalizedError = normalizeAuthActionError((result as unknown as { error: unknown }).error)
        if (callId === latestCallId) {
          status.value = 'error'
          data.value = null
          error.value = normalizedError
        }
        return
      }

      if (callId === latestCallId) {
        if (options.keepPendingOnRedirect !== false) {
          const redirectResult = getRedirectResult(result as unknown)
          if (redirectResult) {
            // Keep pending while the browser performs the external redirect.
            // If navigation does not happen, settle eventually to avoid a stuck UI.
            status.value = 'pending'
            data.value = result
            error.value = null

            setTimeout(() => {
              if (callId !== latestCallId || status.value !== 'pending')
                return
              status.value = 'success'
            }, REDIRECT_PENDING_FALLBACK_MS)
            return
          }
        }

        status.value = 'success'
        data.value = result
        error.value = null
      }
    }
    catch (thrown) {
      const normalizedError = normalizeAuthActionError(thrown)
      if (callId === latestCallId) {
        status.value = 'error'
        data.value = null
        error.value = normalizedError
      }
    }
  }

  const execute = (async (...args: TArgs) => {
    await run(...args)
  }) as UserAuthActionHandle<TArgs, TResult>['execute']

  return {
    execute,
    status,
    data,
    error,
  }
}

export function createActionHandles<T extends object>(
  getTarget: () => T,
  targetName: string,
): ActionHandleMap<T> {
  const handles = new Map<PropertyKey, UserAuthActionHandle<unknown[], unknown>>()

  return new Proxy({} as ActionHandleMap<T>, {
    get(_target, prop) {
      if (prop === 'then')
        return undefined

      if (handles.has(prop))
        return handles.get(prop)

      const handle = createActionHandle(() => {
        const target = getTarget() as unknown as Record<PropertyKey, unknown>
        const method = target[prop]
        if (typeof method !== 'function')
          throw new TypeError(`${targetName}.${String(prop)}() is not a function`)
        return method as AnyAsyncFn
      })

      handles.set(prop, handle)
      return handle as unknown as ActionHandleMap<T>[keyof T]
    },
  })
}
