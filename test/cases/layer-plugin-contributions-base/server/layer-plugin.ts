import { createAuthEndpoint } from 'better-auth/api'

export default {
  id: 'layer-server-plugin',
  endpoints: {
    layerProof: createAuthEndpoint('/layer-proof', { method: 'GET' }, async () => ({ source: 'layer' as const })),
  },
  schema: {
    layerRecord: {
      fields: {
        value: {
          type: 'string',
          required: true,
        },
      },
    },
    user: {
      fields: {
        layerField: {
          type: 'string',
          required: false,
        },
      },
    },
  },
} as const
