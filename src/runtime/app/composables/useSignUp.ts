import type { AppAuthClient } from '#nuxt-better-auth'
import type { ActionHandleFor, ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

type SignUp = NonNullable<AppAuthClient>['signUp']

export function useSignUp<MethodKey extends keyof SignUp>(method: MethodKey): ActionHandleFor<SignUp[MethodKey]> {
  if (method === undefined || method === null)
    throw new TypeError('useSignUp(method) requires a sign-up method key')

  const handles = createActionHandles(() => useUserSession().signUp, 'signUp') as ActionHandleMap<SignUp>
  return handles[method] as ActionHandleFor<SignUp[MethodKey]>
}
