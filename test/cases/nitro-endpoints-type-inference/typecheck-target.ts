import type { Base$Fetch } from 'nitropack/types'
import type { AuthApiEndpointPath } from '#nuxt-better-auth'

declare const requestFetch: Base$Fetch

type CustomerStatePath = Extract<AuthApiEndpointPath, '/api/auth/customer/state'>
const customerStatePath: CustomerStatePath = '/api/auth/customer/state'

async function assertNoGlobalEndpointInference() {
  const customerState = await requestFetch('/api/auth/customer/state')
  // @ts-expect-error use useAuthRequestFetch for typed auth endpoint payloads
  customerState.activeSubscriptions[0]?.toUpperCase()
}

void customerStatePath
void assertNoGlobalEndpointInference
