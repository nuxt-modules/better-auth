import type { AppAuthClient, AuthSocialProviderRegistry } from '#nuxt-better-auth'
import type { ActionHandleFor, ActionHandleMap } from '../internal/auth-action-handles'
import { useUserSession } from '#imports'
import { createActionHandles } from '../internal/auth-action-handles'

type SignIn = NonNullable<AppAuthClient>['signIn']
type SignInMethodKey = Exclude<Extract<keyof SignIn, string>, 'social'>
type SocialMethod = SignIn extends { social: infer T } ? T : never
type SocialHandle = ActionHandleFor<SocialMethod>
type AuthSocialProviderId = AuthSocialProviderRegistry extends { ids: infer T } ? Extract<T, string> : never
type KnownProviderAliasKey = Exclude<AuthSocialProviderId, SignInMethodKey>
type ProviderAliasKey = KnownProviderAliasKey
type NonSocialProvider<Provider> = Provider extends 'social' ? never : Provider
type SignInWithProviderAliases = SignIn & Record<ProviderAliasKey, SocialMethod>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

export function useSignIn<MethodKey extends SignInMethodKey>(method: MethodKey): ActionHandleFor<SignIn[MethodKey]>
export function useSignIn<Provider extends ProviderAliasKey>(provider: NonSocialProvider<Provider>): SocialHandle
export function useSignIn(method: SignInMethodKey | ProviderAliasKey): ActionHandleFor<SignIn[SignInMethodKey]> | SocialHandle {
  if (method === undefined || method === null)
    throw new TypeError('useSignIn(method) requires a sign-in method key')

  const handles = createActionHandles(() => {
    const signIn = useUserSession().signIn as SignIn & Record<PropertyKey, unknown>
    return new Proxy(signIn as SignInWithProviderAliases, {
      get(target, prop, receiver) {
        const method = Reflect.get(target as Record<PropertyKey, unknown>, prop, receiver)
        // Prefer concrete method keys when they exist (e.g. "social").
        if (typeof method === 'function')
          return method
        if (typeof prop !== 'string')
          return method

        const social = Reflect.get(target as Record<PropertyKey, unknown>, 'social')
        if (typeof social !== 'function')
          return method

        return (...args: unknown[]) => {
          const [data, ...rest] = args
          const payload = isRecord(data) ? { ...data, provider: prop } : { provider: prop }
          return (social as (...socialArgs: unknown[]) => Promise<unknown>)(payload, ...rest)
        }
      },
    })
  }, 'signIn') as ActionHandleMap<SignInWithProviderAliases>

  return handles[method as keyof SignInWithProviderAliases] as ActionHandleFor<SignIn[SignInMethodKey]> | SocialHandle
}
