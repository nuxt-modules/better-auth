import type { AppAuthClient, AuthSocialProviderRegistry } from '#nuxt-better-auth'
import type { ActionHandleFor, ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

type SignIn = NonNullable<AppAuthClient>['signIn']
type AuthSocialProviderId = AuthSocialProviderRegistry extends { ids: infer T } ? Extract<T, string> : never

type TypedSocialMethod<Method> = Method extends (data: infer Data, ...rest: infer Rest) => Promise<infer Result>
  ? (data: Omit<Extract<Data, Record<string, unknown>>, 'provider'> & { provider: AuthSocialProviderId }, ...rest: Rest) => Promise<Result>
  : Method

type SignInWithTypedSocial = Omit<SignIn, 'social'> & (SignIn extends { social: infer SocialMethod } ? { social: TypedSocialMethod<SocialMethod> } : unknown)

export function useSignIn<MethodKey extends keyof SignInWithTypedSocial>(method: MethodKey): ActionHandleFor<SignInWithTypedSocial[MethodKey]> {
  if (method === undefined || method === null)
    throw new TypeError('useSignIn(method) requires a sign-in method key')

  const handles = createActionHandles(() => useUserSession().signIn as SignInWithTypedSocial, 'signIn') as ActionHandleMap<SignInWithTypedSocial>

  return handles[method] as ActionHandleFor<SignInWithTypedSocial[MethodKey]>
}
