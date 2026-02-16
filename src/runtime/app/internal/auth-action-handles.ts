import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from '#imports'

export type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult>
  status: Ref<UserAuthActionStatus>
  pending: ComputedRef<boolean>
  error: Ref<unknown | null>
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
  const error = ref<unknown | null>(null)
  const pending = computed(() => status.value === 'pending')

  let latestCallId = 0

  const execute = (async (...args: TArgs) => {
    const callId = ++latestCallId
    status.value = 'pending'
    error.value = null

    try {
      const result = await getMethod()(...args)
      if (callId !== latestCallId)
        return result

      if (isErrorResult(result as unknown)) {
        status.value = 'error'
        error.value = (result as unknown as { error: unknown }).error
        return result
      }

      status.value = 'success'
      error.value = null
      return result
    }
    catch (err) {
      if (callId === latestCallId) {
        status.value = 'error'
        error.value = err
      }
      throw err
    }
  }) as UserAuthActionHandle<TArgs, TResult>['execute']

  return { execute, status, pending, error }
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
