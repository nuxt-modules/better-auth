import type { AuthApiEndpointPath, AuthApiEndpointResponse, AuthSocialProviderId } from '#nuxt-better-auth'
import { useAuthRequestFetch, useSignIn } from '@nuxtjs/better-auth/composables'

const provider: AuthSocialProviderId = 'external-oauth-provider'
const endpoint = '/api/auth/custom-session' satisfies AuthApiEndpointPath

useSignIn('social').execute({ provider })
const response: Promise<AuthApiEndpointResponse<typeof endpoint, 'get'>> = useAuthRequestFetch()(endpoint)

void response

// @ts-expect-error method names still come from the Better Auth client
useSignIn('not-a-method')

declare module 'nitropack/types' {
  interface InternalApi {
    '/api/report': { get: { total: number } }
  }
}

async function assertNativeFetchTypes() {
  const report = await useAuthRequestFetch()('/api/report')
  const total: number = report.total
  // @ts-expect-error native route responses retain their property types
  const invalidTotal: string = report.total
  const explicitResponse: { custom: boolean } = await useAuthRequestFetch()<{ custom: boolean }>('/api/custom')

  void total
  void invalidTotal
  void explicitResponse
}
void assertNativeFetchTypes
