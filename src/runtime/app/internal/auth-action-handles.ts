import type { AuthActionError, AuthActionResult } from '../../types'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref } from '#imports'
import { normalizeAuthActionError } from './auth-action-error'

export type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult>
  executeSafe: (...args: TArgs) => Promise<AuthActionResult<TResult>>
  status: Ref<UserAuthActionStatus>
  pending: ComputedRef<boolean>
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
  const error = ref<AuthActionError | null>(null)
  const pending = computed(() => status.value === 'pending')
  const errorMessage = computed(() => error.value?.message ?? null)

  let latestCallId = 0

  type ExecuteOutcome = {
    result?: TResult
    error?: AuthActionError
    thrown?: unknown
    kind: 'success' | 'result-error' | 'thrown-error'
  }

  const run = async (...args: TArgs): Promise<ExecuteOutcome> => {
    const callId = ++latestCallId
    status.value = 'pending'
    error.value = null

    try {
      const result = await getMethod()(...args)
      if (callId !== latestCallId)
        return { kind: 'success', result }

      if (isErrorResult(result as unknown)) {
        const normalizedError = normalizeAuthActionError((result as unknown as { error: unknown }).error)
        status.value = 'error'
        error.value = normalizedError
        return { kind: 'result-error', result, error: normalizedError }
      }

      status.value = 'success'
      error.value = null
      return { kind: 'success', result }
    }
    catch (thrown) {
      const normalizedError = normalizeAuthActionError(thrown)
      if (callId === latestCallId) {
        status.value = 'error'
        error.value = normalizedError
      }
      return { kind: 'thrown-error', thrown, error: normalizedError }
    }
  }

  const execute = (async (...args: TArgs) => {
    const outcome = await run(...args)
    if (outcome.kind === 'thrown-error')
      throw outcome.thrown
    return outcome.result as TResult
  }) as UserAuthActionHandle<TArgs, TResult>['execute']

  const executeSafe = (async (...args: TArgs) => {
    const outcome = await run(...args)
    if (outcome.kind === 'success')
      return { ok: true, data: outcome.result as TResult }
    return { ok: false, error: outcome.error as AuthActionError }
  }) as UserAuthActionHandle<TArgs, TResult>['executeSafe']

  return {
    execute,
    executeSafe,
    status,
    pending,
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
    }
    },
  })
}
