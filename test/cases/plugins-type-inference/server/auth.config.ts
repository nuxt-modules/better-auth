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
  user: {
    additionalFields: {
      internalCode: {
        type: 'string',
        required: false,
      },
    },
  },
}))
