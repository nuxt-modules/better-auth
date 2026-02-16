import type { ComputedRef, Ref } from 'vue'
import type { AuthActionError } from '../../types'
import { computed, ref } from '#imports'
import { normalizeAuthActionError } from './auth-action-error'

export type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<void>
  status: Ref<UserAuthActionStatus>
  pending: ComputedRef<boolean>
  data: Ref<TResult | null>
  error: Ref<AuthActionError | null>
  errorMessage: ComputedRef<string | null>
}

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>
export type ActionHandleFor<T> = T extends (...args: infer A) => Promise<infer R>
  ? UserAuthActionHandle<A, R>
  : never
export type ActionHandleMap<T> = {
  [K in keyof T]: ActionHandleFor<T[K]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isErrorResult(value: unknown): value is { error: unknown } {
  if (!isRecord(value))
    return false
  if (!('error' in value))
    return false
  return Boolean((value as Record<string, unknown>).error)
}

function createActionHandle<TArgs extends unknown[], TResult>(
  getMethod: () => (...args: TArgs) => Promise<TResult>,
): UserAuthActionHandle<TArgs, TResult> {
  const status = ref<UserAuthActionStatus>('idle')
  const data = ref<TResult | null>(null)
  const error = ref<AuthActionError | null>(null)
  const pending = computed(() => status.value === 'pending')
  const errorMessage = computed(() => error.value?.message ?? null)

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
    pending,
    data,
    error,
    errorMessage,
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
