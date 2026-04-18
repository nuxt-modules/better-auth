import { username } from 'better-auth/plugins'
import { defineServerAuth } from '../../../../src/runtime/config'

function customAdminLikePlugin() {
  return {
    id: 'custom-admin-like',
    $ERROR_CODES: {
      BROKEN: {
        code: 'BROKEN',
        message: 'Broken',
      },
    },
    schema: {
      session: {
        fields: {
          workspaceId: {
            type: 'string',
            required: false,
            input: false,
          },
        },
      },
      user: {
        fields: {
          role: {
            type: 'string',
            required: false,
            input: false,
          },
        },
      },
    },
  } as const
}

export default defineServerAuth(() => ({
  emailAndPassword: { enabled: true },
  plugins: [customAdminLikePlugin(), username()] as const,
  socialProviders: {
    github: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
  user: {
    additionalFields: {
      internalCode: {
        type: 'string',
        required: false,
      },
    },
  },
}))
