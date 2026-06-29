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
