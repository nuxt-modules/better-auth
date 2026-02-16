import type { AppAuthClient } from '#nuxt-better-auth'
import type { ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

export function useUserSignUp(): ActionHandleMap<NonNullable<AppAuthClient>['signUp']> {
  return createActionHandles(() => useUserSession().signUp, 'signUp')
}
