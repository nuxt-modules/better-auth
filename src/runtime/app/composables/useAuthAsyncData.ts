import type { AsyncDataOptions } from '#app'
import { useAsyncData } from '#imports'
import { useAuthRequestFetch } from './useAuthRequestFetch'
import { useUserSession } from './useUserSession'

export interface UseAuthAsyncDataOptions<T> extends Omit<AsyncDataOptions<T | null>, 'default'> {
  requireAuth?: boolean
}

export function useAuthAsyncData<T>(
  key: string,
  fetcher: (requestFetch: ReturnType<typeof useAuthRequestFetch>) => Promise<T>,
  options: UseAuthAsyncDataOptions<T> = {},
) {
  const requestFetch = useAuthRequestFetch()
  const { loggedIn } = useUserSession()
  const { requireAuth = true, ...asyncDataOptions } = options

  return useAsyncData<T | null>(key, async () => {
    if (requireAuth && !loggedIn.value)
      return null

    return await fetcher(requestFetch)
  }, {
    default: () => null,
    ...asyncDataOptions,
  })
}
