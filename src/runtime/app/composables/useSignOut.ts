import { useAction } from './useAction'
import { useUserSession } from './useUserSession'

export function useSignOut() {
  const { signOut } = useUserSession()
  return useAction(signOut)
}
