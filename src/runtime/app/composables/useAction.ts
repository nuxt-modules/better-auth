import type { UserAuthActionHandle } from '../internal/auth-action-handles'
import { createActionHandle } from '../internal/auth-action-handles'

export function useAction<TArgs extends unknown[], TResult>(
  runner: (...args: TArgs) => Promise<TResult>,
): UserAuthActionHandle<TArgs, TResult> {
  if (typeof runner !== 'function')
    throw new TypeError('useAction(runner) requires an async function')

  return createActionHandle(() => runner)
}
