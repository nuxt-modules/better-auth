import { defineServerAuth } from '../../../src/runtime/config'

const objectConfig = defineServerAuth({
  advanced: { database: { generateId: 'uuid' } },
  user: {
    additionalFields: {
      address: { type: 'string', required: false, fieldName: 'address' },
    },
  },
})

const callbackConfig = defineServerAuth(() => ({
  advanced: { database: { generateId: 'uuid' } },
  user: {
    additionalFields: {
      city: { type: 'string', required: false },
    },
  },
}))

void objectConfig
void callbackConfig

defineServerAuth({
  advanced: { database: {
    // @ts-expect-error invalid generateId literal
    generateId: 'invalid-id',
  } },
})

defineServerAuth({
  user: {
    additionalFields: {
      badField: {
        // @ts-expect-error invalid additionalFields type literal
        type: 'invalid-type',
      },
    },
  },
})

defineServerAuth({ basePath: '/api/auth' })
defineServerAuth(() => ({ basePath: '/api/auth' }))
// @ts-expect-error The module only registers /api/auth on the server.
defineServerAuth({ basePath: '/custom/auth' })
// @ts-expect-error Callback configs have the same routing restriction.
defineServerAuth(() => ({ basePath: '/custom/auth' }))
