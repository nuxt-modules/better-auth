import type { UseUserSessionReturn } from './useUserSession'
import { useUserSession } from './useUserSession'

export type UseUserSessionStateReturn = Pick<UseUserSessionReturn, 'session' | 'user' | 'loggedIn' | 'ready' | 'signOut' | 'waitForSession' | 'fetchSession' | 'updateUser'>

export function useUserSessionState(): UseUserSessionStateReturn {
  const auth = useUserSession()

  return {
    session: auth.session,
    user: auth.user,
    loggedIn: auth.loggedIn,
    ready: auth.ready,
    signOut: auth.signOut,
    waitForSession: auth.waitForSession,
    fetchSession: auth.fetchSession,
    updateUser: auth.updateUser,
  }
}
