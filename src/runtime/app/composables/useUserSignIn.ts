import type { AppAuthClient } from '#nuxt-better-auth'
import type { ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

export function useUserSignIn(): ActionHandleMap<NonNullable<AppAuthClient>['signIn']> {
  return createActionHandles(() => useUserSession().signIn, 'signIn')
}
