import { memoryAdapter } from 'better-auth/adapters/memory'
import { defineServerAuth } from '../../../../src/runtime/config'

const database = memoryAdapter({ user: [], session: [], account: [], verification: [] })

export default defineServerAuth({
  database,
  user: { additionalFields: { role: { type: 'string', required: true, input: false } } },
  session: { additionalFields: { label: { type: 'string', defaultValue: 'fixture' } } },
})
