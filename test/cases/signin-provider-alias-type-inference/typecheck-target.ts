import { useSignIn } from '../../../src/runtime/app/composables/useSignIn'
import type { AuthSocialProviderId } from '#nuxt-better-auth'
import type { socialProviders } from './server/auth.config'

type RawSocialProviderIds = Extract<keyof typeof socialProviders, string>

useSignIn('email')
useSignIn('social')

const rawGithub: RawSocialProviderIds = 'github'
const rawGoogle: RawSocialProviderIds = 'google'
void rawGithub
void rawGoogle

const typedGithub: AuthSocialProviderId = 'github'
void typedGithub

// @ts-expect-error provider not configured in socialProviders
const typedDiscord: AuthSocialProviderId = 'discord'
void typedDiscord

useSignIn('social').execute({ provider: 'github' })
useSignIn('social').execute({ provider: 'google', callbackURL: '/app' })

// @ts-expect-error provider not configured in socialProviders
useSignIn('social').execute({ provider: 'discord' })

// @ts-expect-error invalid provider typo
useSignIn('emial')
// @ts-expect-error provider aliases are not valid keyed methods
useSignIn('github')
