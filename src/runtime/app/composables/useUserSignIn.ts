import type { AppAuthClient } from '#nuxt-better-auth'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref, useUserSession } from '#imports'

type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

interface UserAuthActionHandle<T extends (...args: any[]) => Promise<any>> {
  execute: (...args: Parameters<T>) => ReturnType<T>
  status: Ref<UserAuthActionStatus>
  pending: ComputedRef<boolean>
  error: Ref<unknown | null>
}

type AnyAsyncFn = (...args: any[]) => Promise<any>
type ActionHandleMap<T> = {
  [K in keyof T]: T[K] extends AnyAsyncFn ? UserAuthActionHandle<T[K]> : never
}

function isErrorResult(value: unknown): value is { error: unknown } {
  return Boolean(value && typeof value === 'object' && 'error' in value && (value as any).error)
}

function createActionHandle<T extends AnyAsyncFn>(getMethod: () => T): UserAuthActionHandle<T> {
  const status = ref<UserAuthActionStatus>('idle')
  const error = ref<unknown | null>(null)
  const pending = computed(() => status.value === 'pending')

  let latestCallId = 0

  const execute = (async (...args: Parameters<T>) => {
    const callId = ++latestCallId
    status.value = 'pending'
    error.value = null

    try {
      const result = await getMethod()(...args)

      if (callId !== latestCallId)
        return result as ReturnType<T>

      if (isErrorResult(result)) {
        status.value = 'error'
        error.value = (result as any).error
        return result as ReturnType<T>
      }

      status.value = 'success'
      error.value = null
      return result as ReturnType<T>
    }
    catch (err) {
      if (callId === latestCallId) {
        status.value = 'error'
        error.value = err
      }
      throw err
    }
  }) as UserAuthActionHandle<T>['execute']

  return { execute, status, pending, error }
}

export function useUserSignIn(): ActionHandleMap<NonNullable<AppAuthClient>['signIn']> {
  const { signIn } = useUserSession()
  const handles = new Map<PropertyKey, UserAuthActionHandle<AnyAsyncFn>>()

  return new Proxy({} as ActionHandleMap<NonNullable<AppAuthClient>['signIn']>, {
    get(_target, prop) {
      // Avoid being treated like a Promise.
      if (prop === 'then')
        return undefined

      // Avoid creating handles for inspection symbols.
      if (typeof prop === 'symbol')
        return undefined

      if (handles.has(prop))
        return handles.get(prop)

      const handle = createActionHandle(() => {
        return (signIn as any)[prop] as AnyAsyncFn
      })

      handles.set(prop, handle)
      return handle
    },
  })
}
