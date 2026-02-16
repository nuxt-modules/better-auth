import type { AppAuthClient } from '#nuxt-better-auth'
import type { ActionHandleFor, ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

type SignIn = NonNullable<AppAuthClient>['signIn']

export function useUserSignIn<MethodKey extends keyof SignIn>(method: MethodKey): ActionHandleFor<SignIn[MethodKey]> {
  if (method === undefined || method === null)
    throw new TypeError('useUserSignIn(method) requires a sign-in method key')

  const handles = createActionHandles(() => useUserSession().signIn, 'signIn') as ActionHandleMap<SignIn>
  return handles[method] as ActionHandleFor<SignIn[MethodKey]>
}
