import type { ComputedRef, Ref } from 'vue'
import type { AuthActionError, AuthActionResult } from '../../types'
import { computed, ref } from '#imports'
import { normalizeAuthActionError } from './auth-action-error'

export type UserAuthActionStatus = 'idle' | 'pending' | 'success' | 'error'

export interface UserAuthActionHandle<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<AuthActionResult<TResult>>
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

  type ExecuteOutcome
    = | { kind: 'success', result: TResult }
      | { kind: 'error', error: AuthActionError }

  const run = async (...args: TArgs): Promise<ExecuteOutcome> => {
    const callId = ++latestCallId
    status.value = 'pending'
    error.value = null

    try {
      const result = await getMethod()(...args)
      if (isErrorResult(result as unknown)) {
        const normalizedError = normalizeAuthActionError((result as unknown as { error: unknown }).error)
        if (callId === latestCallId) {
          status.value = 'error'
          error.value = normalizedError
        }
        return { kind: 'error', error: normalizedError }
      }

      if (callId === latestCallId) {
        status.value = 'success'
        error.value = null
      }
      return { kind: 'success', result }
    }
    catch (thrown) {
      const normalizedError = normalizeAuthActionError(thrown)
      if (callId === latestCallId) {
        status.value = 'error'
        error.value = normalizedError
      }
      return { kind: 'error', error: normalizedError }
    }
  }

  const execute = (async (...args: TArgs) => {
    const outcome = await run(...args)
    if (outcome.kind === 'success')
      return { ok: true, data: outcome.result }
    return { ok: false, error: outcome.error }
  }) as UserAuthActionHandle<TArgs, TResult>['execute']

  return {
    execute,
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
    },
  })
}
