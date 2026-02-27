import type { AuthApiEndpointPath, AuthApiEndpointPatternPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import { useFetch, useLazyFetch } from 'nuxt/app'
import { useAuthRequestFetch } from '../../../src/runtime/app/composables/useAuthRequestFetch'

type DynamicPath = Extract<AuthApiEndpointPath, `/api/auth/customer/${string}/state`>
const dynamicPath: DynamicPath = '/api/auth/customer/123/state'

type DynamicPattern = Extract<AuthApiEndpointPatternPath, '/api/auth/customer/:id/state'>
const dynamicPattern: DynamicPattern = '/api/auth/customer/:id/state'

type DynamicResponse = AuthApiEndpointResponse<`/api/auth/customer/${string}/state`, 'get'>
type CustomerStateResponse = AuthApiEndpointResponse<'/api/auth/customer/state', 'get'>
declare const customerStateResponse: CustomerStateResponse

async function assertUseFetchPathInference() {
  const customerStateResult = await useFetch('/api/auth/customer/state')
  customerStateResult.data.value?.activeSubscriptions[0]?.toUpperCase()
  customerStateResult.data.value?.hasBillingIssue.valueOf()

  const lazyCustomerState = await useLazyFetch('/api/auth/customer/state')
  lazyCustomerState.data.value?.activeSubscriptions[0]?.toUpperCase()

  const dynamicStateResult = await useFetch('/api/auth/customer/123/state')
  dynamicStateResult.data.value?.customerId.toUpperCase()
  dynamicStateResult.data.value?.status.toUpperCase()

  const customerSessionPost = await useFetch('/api/auth/customer/session', { method: 'POST' })
  customerSessionPost.data.value?.ok.valueOf()

  const requestFetch = useAuthRequestFetch()
  const dynamicViaRequestFetch = await requestFetch('/api/auth/customer/123/state')
  dynamicViaRequestFetch.customerId.toUpperCase()

  const typedDynamic: DynamicResponse = dynamicViaRequestFetch
  void typedDynamic

  const unknownAuthEndpoint = await useFetch('/api/auth/unknown-custom-endpoint')
  void unknownAuthEndpoint
}

void dynamicPath
void dynamicPattern
// @ts-expect-error no unknown key on inferred endpoint response
void customerStateResponse.missingField
void assertUseFetchPathInference
