import createServerAuth from './server/auth.config'

type RawConfig = ReturnType<typeof createServerAuth>
type RawSocialProviders = RawConfig extends { socialProviders: infer S } ? S : RawConfig extends { socialProviders?: infer S } ? S : {}
type RawSocialProviderIds = RawSocialProviders extends Record<string, unknown> ? Extract<keyof RawSocialProviders, string> : never

type MethodKey = 'email'
type ProviderAliasKey = RawSocialProviderIds
type NonSocialProvider<Provider> = Provider extends 'social' ? never : Provider

declare function useSignIn<Method extends MethodKey>(method: Method): unknown
declare function useSignIn<Provider extends ProviderAliasKey>(provider: NonSocialProvider<Provider>): unknown

useSignIn('email')
useSignIn('github')
useSignIn('google')

const rawGithub: RawSocialProviderIds = 'github'
const rawGoogle: RawSocialProviderIds = 'google'
void rawGithub
void rawGoogle

// @ts-expect-error social must use provider aliases
useSignIn('social')

// @ts-expect-error invalid provider typo
useSignIn('emial')
// @ts-expect-error provider not configured in socialProviders
useSignIn('discord')
