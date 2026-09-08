import type { AuthApiEndpointPath, AuthApiEndpointResponse, AuthSocialProviderId } from '#nuxt-better-auth'
import { useAuthRequestFetch, useSignIn } from '@nuxtjs/better-auth/composables'

const provider: AuthSocialProviderId = 'external-oauth-provider'
const endpoint: AuthApiEndpointPath = '/custom-auth/session'

useSignIn('social').execute({ provider })
const response: Promise<AuthApiEndpointResponse<typeof endpoint, 'get'>> = useAuthRequestFetch()(endpoint)

void response

// @ts-expect-error method names still come from the Better Auth client
useSignIn('not-a-method')
