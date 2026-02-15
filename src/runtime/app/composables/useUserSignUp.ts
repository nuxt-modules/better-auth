import type { AppAuthClient } from '#nuxt-better-auth'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref, useUserSession } from '#imports'

type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult>
  status: Ref<UserAuthActionStatus>
  pending: ComputedRef<boolean>
  error: Ref<unknown | null>
}

type AnyAsyncFn = (...args: unknown[]) => Promise<unknown>
type ActionHandleFor<T> = T extends (...args: infer A) => Promise<infer R>
  ? UserAuthActionHandle<A, R>
  : never
type ActionHandleMap<T> = {
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

export function useUserSignUp(): ActionHandleMap<NonNullable<AppAuthClient>['signUp']> {
  const handles = new Map<PropertyKey, UserAuthActionHandle<unknown[], unknown>>()

  return new Proxy({} as ActionHandleMap<NonNullable<AppAuthClient>['signUp']>, {
    get(_target, prop) {
      if (prop === 'then')
        return undefined

      if (handles.has(prop))
        return handles.get(prop)

      const handle = createActionHandle(() => {
        const { signUp } = useUserSession()
        const record = signUp as unknown as Record<PropertyKey, unknown>
        const method = record[prop]
        if (typeof method !== 'function')
          throw new TypeError(`signUp.${String(prop)}() is not a function`)
        return method as AnyAsyncFn
      })

      handles.set(prop, handle)
      return handle as unknown as ActionHandleMap<NonNullable<AppAuthClient>['signUp']>[keyof NonNullable<AppAuthClient>['signUp']]
    },
  })
}
