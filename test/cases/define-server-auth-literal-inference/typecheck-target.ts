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

// @ts-expect-error invalid generateId literal
defineServerAuth({
  advanced: { database: { generateId: 'invalid-id' } },
})

// @ts-expect-error invalid additionalFields type literal
defineServerAuth({
  user: {
    additionalFields: {
      badField: { type: 'invalid-type' },
    },
  },
})

defineServerAuth({ basePath: '/api/auth' })
defineServerAuth(() => ({ basePath: '/api/auth' }))
// @ts-expect-error The module only registers /api/auth on the server.
defineServerAuth({ basePath: '/custom/auth' })
// @ts-expect-error Callback configs have the same routing restriction.
defineServerAuth(() => ({ basePath: '/custom/auth' }))
