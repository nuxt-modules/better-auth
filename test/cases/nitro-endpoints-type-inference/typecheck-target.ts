import type { AuthApiEndpointPath, AuthApiEndpointResponse } from '#nuxt-better-auth'
import type { Base$Fetch } from 'nitropack/types'

declare const requestFetch: Base$Fetch

type CustomerStatePath = Extract<AuthApiEndpointPath, '/api/auth/customer/state'>
const customerStatePath: CustomerStatePath = '/api/auth/customer/state'

async function assertEndpointInference() {
  const customerState = await requestFetch('/api/auth/customer/state')
  customerState.activeSubscriptions[0]?.toUpperCase()
  customerState.hasBillingIssue.valueOf()
  // @ts-expect-error no unknown key
  void customerState.missingField

  const customerViaHelper: AuthApiEndpointResponse<'/api/auth/customer/state'> = customerState
  void customerViaHelper

  const customerSessionGet = await requestFetch('/api/auth/customer/session')
  const customerSessionPost = await requestFetch('/api/auth/customer/session', { method: 'POST' })
  customerSessionGet.ok.valueOf()
  customerSessionPost.ok.valueOf()

  const session = await requestFetch('/api/auth/get-session')
  if (session) {
    void session.user.id
    void session.session.expiresAt
  }
  // @ts-expect-error get-session can be null
  const shouldFailNullability: { user: { id: string } } = session
  void shouldFailNullability

  const sessionViaHelper: AuthApiEndpointResponse<'/api/auth/get-session', 'get'> = session
  void sessionViaHelper
}

void customerStatePath
void assertEndpointInference
