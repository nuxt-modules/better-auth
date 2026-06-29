import type { UseUserSessionReturn } from './useUserSession'
import { useUserSession } from './useUserSession'

export type UseUserSessionStateReturn = UseUserSessionReturn

export function useUserSessionState(): UseUserSessionStateReturn {
  return useUserSession()
}
