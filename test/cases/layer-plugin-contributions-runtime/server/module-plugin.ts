import { createAuthEndpoint } from 'better-auth/api'

export default {
  id: 'module-server-plugin',
  endpoints: {
    moduleProof: createAuthEndpoint('/module-proof', { method: 'GET' }, async () => ({ source: 'module' as const })),
  },
} as const
