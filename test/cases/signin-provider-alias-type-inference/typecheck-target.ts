import type { socialProviders } from './server/auth.config'

type RawSocialProviderIds = Extract<keyof typeof socialProviders, string>

interface ActionHandle<Payload> {
  execute: (payload: Payload) => Promise<void>
}

declare function useSignIn(method: 'email'): ActionHandle<{ email: string, password: string }>
declare function useSignIn(method: 'social'): ActionHandle<{ provider: RawSocialProviderIds, callbackURL?: string }>

useSignIn('email')
useSignIn('social')

const rawGithub: RawSocialProviderIds = 'github'
const rawGoogle: RawSocialProviderIds = 'google'
void rawGithub
void rawGoogle

useSignIn('social').execute({ provider: 'github' })
useSignIn('social').execute({ provider: 'google', callbackURL: '/app' })

// @ts-expect-error provider not configured in socialProviders
useSignIn('social').execute({ provider: 'discord' })

// @ts-expect-error invalid provider typo
useSignIn('emial')
// @ts-expect-error provider aliases are not valid keyed methods
useSignIn('github')
