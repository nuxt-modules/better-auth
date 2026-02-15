import type { DbDialect } from './hub'

export function buildSecondaryStorageCode(enabled: boolean): string {
  if (!enabled)
    return 'export function createSecondaryStorage() { return undefined }'

  return `import { kv } from '@nuxthub/kv'
export function createSecondaryStorage() {
  return {
    get: async (key) => kv.get(\`_auth:\${key}\`),
    set: async (key, value, ttl) => kv.set(\`_auth:\${key}\`, value, { ttl }),
    delete: async (key) => kv.del(\`_auth:\${key}\`),
  }
}`
}

interface BuildDatabaseCodeInput {
  provider: 'none' | 'nuxthub'
  hubDialect: DbDialect
  usePlural: boolean
  camelCase: boolean
}

export function buildDatabaseCode(input: BuildDatabaseCodeInput): string {
  if (input.provider === 'nuxthub') {
    return `import { db } from '@nuxthub/db'
import * as schema from './schema.${input.hubDialect}.mjs'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
const rawDialect = '${input.hubDialect}'
const dialect = rawDialect === 'postgresql' ? 'pg' : rawDialect
export function createDatabase() { return drizzleAdapter(db, { provider: dialect, schema, usePlural: ${input.usePlural}, camelCase: ${input.camelCase} }) }
export { db }`
  }

  return `export function createDatabase() { return undefined }
export const db = undefined`
}
