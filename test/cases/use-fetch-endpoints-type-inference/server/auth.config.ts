import { createAuthEndpoint } from 'better-auth/api'
import { defineServerAuth } from '../../../../src/runtime/config'

function customerPlugin() {
  return {
    id: 'customer-plugin',
    endpoints: {
      customerState: createAuthEndpoint('/customer/state', { method: 'GET' }, async () => {
        return {
          activeSubscriptions: ['starter', 'pro'],
          hasBillingIssue: false,
        }
      }),
      customerStateById: createAuthEndpoint('/customer/:id/state', { method: 'GET' }, async () => {
        return {
          customerId: 'customer-123',
          status: 'active' as const,
        }
      }),
      customerSession: createAuthEndpoint('/customer/session', { method: ['GET', 'POST'] as const }, async () => {
        return {
          ok: true,
        }
      }),
    },
  } as const
}

export default defineServerAuth({
  emailAndPassword: { enabled: true },
  plugins: [customerPlugin()] as const,
})
