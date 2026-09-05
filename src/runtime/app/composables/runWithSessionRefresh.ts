import { isAuthActionErrorResult } from '../internal/auth-action-handles'
import { refreshSessionAfterAuthAction } from '../internal/wrap-auth-method'
import { useUserSession } from './useUserSession'

export async function runWithSessionRefresh<TResult>(runner: () => Promise<TResult>): Promise<TResult> {
  if (typeof runner !== 'function')
    throw new TypeError('runWithSessionRefresh(runner) requires an async function')

  const auth = useUserSession()
  const result = await runner()

  if (!isAuthActionErrorResult(result))
    await refreshSessionAfterAuthAction(auth.fetchSession, auth.loggedIn, auth.waitForSession)

  return result
}
