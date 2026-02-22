import type { UserAuthActionHandle } from '../internal/auth-action-handles'
import type { UseUserSessionReturn } from './useUserSession'
import { useUserSession } from '#imports'
import { useAction } from './useAction'

type AppAuthClient = NonNullable<UseUserSessionReturn['client']>

export function useAuthClientAction<TArgs extends unknown[], TResult>(
  select: (client: AppAuthClient) => (...args: TArgs) => Promise<TResult>,
): UserAuthActionHandle<TArgs, TResult> {
  if (typeof select !== 'function')
    throw new TypeError('useAuthClientAction(select) requires a selector function')

  return useAction(async (...args: TArgs) => {
    const { client } = useUserSession()
    if (!client)
      throw new Error('Auth client is unavailable. This action can only run on client-side.')

    const method = select(client)
    if (typeof method !== 'function')
      throw new TypeError('useAuthClientAction(select) must resolve to a function')

    return method(...args)
  })
}
