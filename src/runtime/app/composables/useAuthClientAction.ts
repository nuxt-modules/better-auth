import type { AppAuthClient } from '#nuxt-better-auth'
import type { UserAuthActionHandle } from '../internal/auth-action-handles'
import { useAction } from './useAction'
import { useAuthClient } from './useAuthClient'

export function useAuthClientAction<TArgs extends unknown[], TResult>(
  select: (client: AppAuthClient) => (...args: TArgs) => Promise<TResult>,
): UserAuthActionHandle<TArgs, TResult> {
  if (typeof select !== 'function')
    throw new TypeError('useAuthClientAction(select) requires a selector function')

  return useAction(async (...args: TArgs) => {
    const client = useAuthClient()
    if (!client)
      throw new Error('Auth client is unavailable. This action can only run on client-side.')

    const method = select(client)
    if (typeof method !== 'function')
      throw new TypeError('useAuthClientAction(select) must resolve to a function')

    return method(...args)
  })
}
