import type { AuthApiEndpointMethod, AuthApiEndpointPath, AuthApiEndpointPatternPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import { useFetch, useLazyFetch } from 'nuxt/app'
import { useAuthRequestFetch } from '../../../src/runtime/app/composables/useAuthRequestFetch'

type DynamicPath = Extract<AuthApiEndpointPath, `/api/auth/customer/${string}/state`>
const dynamicPath: DynamicPath = '/api/auth/customer/123/state'

type DynamicPattern = Extract<AuthApiEndpointPatternPath, '/api/auth/customer/:id/state'>
const dynamicPattern: DynamicPattern = '/api/auth/customer/:id/state'

type DynamicResponse = AuthApiEndpointResponse<`/api/auth/customer/${string}/state`, 'get'>
type CustomerStateResponse = AuthApiEndpointResponse<'/api/auth/customer/state', 'get'>
// @ts-expect-error GET should not be valid for POST-only endpoint helper responses
type PostOnlyGetResponse = AuthApiEndpointResponse<'/api/auth/customer/post-only', 'get'>
// @ts-expect-error POST should not be valid for GET-only endpoint helper responses
type CustomerStatePostResponse = AuthApiEndpointResponse<'/api/auth/customer/state', 'post'>
type CustomerStateMethods = AuthApiEndpointMethod<'/api/auth/customer/state'>
type PostOnlyMethods = AuthApiEndpointMethod<'/api/auth/customer/post-only'>
declare const customerStateResponse: CustomerStateResponse
const validMethodForState: CustomerStateMethods = 'get'
const validMethodForPostOnly: PostOnlyMethods = 'post'
// @ts-expect-error POST should not be valid for GET-only endpoint
const invalidMethodForState: CustomerStateMethods = 'post'
// @ts-expect-error GET should not be valid for POST-only endpoint
const invalidMethodForPostOnly: PostOnlyMethods = 'get'

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

  const postOnlyDefault = await useFetch('/api/auth/customer/post-only')
  void postOnlyDefault

  const postOnlyExplicit = await useFetch('/api/auth/customer/post-only', { method: 'POST' })
  postOnlyExplicit.data.value?.created.valueOf()

  const customerStatePost = await useFetch('/api/auth/customer/state', { method: 'POST' })
  void customerStatePost

  const requestFetch = useAuthRequestFetch()
  const dynamicViaRequestFetch = await requestFetch('/api/auth/customer/123/state')
  dynamicViaRequestFetch.customerId.toUpperCase()

  const postOnlyViaRequestDefault = await requestFetch('/api/auth/customer/post-only')
  // @ts-expect-error request fetch defaults to GET without explicit method
  postOnlyViaRequestDefault.created.valueOf()

  const postOnlyViaRequest = await requestFetch('/api/auth/customer/post-only', { method: 'POST' })
  postOnlyViaRequest.created.valueOf()

  const dynamicWrongMethod = await requestFetch('/api/auth/customer/123/state', { method: 'POST' })
  // @ts-expect-error unsupported method must not infer endpoint payload
  dynamicWrongMethod.customerId.toUpperCase()

  const typedDynamic: DynamicResponse = dynamicViaRequestFetch
  void typedDynamic

  const unknownAuthEndpoint = await useFetch('/api/auth/unknown-custom-endpoint')
  void unknownAuthEndpoint
}

void dynamicPath
void dynamicPattern
void validMethodForState
void validMethodForPostOnly
void invalidMethodForState
void invalidMethodForPostOnly
// @ts-expect-error no unknown key on inferred endpoint response
void customerStateResponse.missingField
void assertUseFetchPathInference
