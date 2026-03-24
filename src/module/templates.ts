import type { DbDialect } from './hub'

export function buildSecondaryStorageCode(useHubKV: boolean): string {
  if (!useHubKV)
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
    if (input.hubDialect === 'postgresql') {
      return `import { db } from '@nuxthub/db'
import * as schema from './schema.${input.hubDialect}.mjs'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const dialect = 'pg'
const requestDatabaseKey = Symbol.for('nuxt-better-auth.requestDatabase')
const fallbackRequestDatabaseContext = new WeakMap()

function getRequestDatabaseContext(event) {
  const eventWithContext = event
  if (eventWithContext?.context && typeof eventWithContext.context === 'object')
    return eventWithContext.context

  let context = fallbackRequestDatabaseContext.get(event)
  if (!context) {
    context = {}
    fallbackRequestDatabaseContext.set(event, context)
  }
  return context
}

function createHyperdriveAdapter(client) {
  return drizzleAdapter(drizzle({ client, schema }), { provider: dialect, schema, usePlural: ${input.usePlural}, camelCase: ${input.camelCase} })
}

function registerClientCleanup(event, client) {
  const response = event?.node?.res
  if (!response || typeof response.once !== 'function')
    return

  let closed = false

  const cleanup = () => {
    if (closed)
      return

    closed = true
    const close = client.end({ timeout: 0 }).catch(() => {})
    const waitUntil = event?.waitUntil || event?.req?.waitUntil || event?.node?.req?.waitUntil
    if (typeof waitUntil === 'function')
      waitUntil.call(event?.req || event?.node?.req || event, close)
    else
      void close
  }

  response.once('finish', cleanup)
  response.once('close', cleanup)
}

export function createDatabase(event) {
  const hyperdrive = process.env.POSTGRES || globalThis.__env__?.POSTGRES || globalThis.POSTGRES
  if (!hyperdrive?.connectionString)
    return drizzleAdapter(db, { provider: dialect, schema, usePlural: ${input.usePlural}, camelCase: ${input.camelCase} })

  if (event) {
    const context = getRequestDatabaseContext(event)
    const cached = context[requestDatabaseKey]
    if (cached)
      return cached

    const client = postgres(hyperdrive.connectionString, {
      prepare: false,
      onnotice: () => {},
      max: 1,
    })
    const database = createHyperdriveAdapter(client)

    context[requestDatabaseKey] = database
    registerClientCleanup(event, client)
    return database
  }
  const client = postgres(hyperdrive.connectionString, {
    prepare: false,
    onnotice: () => {},
    max: 1,
  })

  return createHyperdriveAdapter(client)
}
export { db }`
    }

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

export function buildSchemaExportCode(hasHubDb: boolean, hubDialect: DbDialect): string {
  if (!hasHubDb)
    return 'export const schema = undefined\n'

  return `export * from './schema.${hubDialect}.mjs'
import * as schema from './schema.${hubDialect}.mjs'
export { schema }
`
}

export function buildAuthRouteRulesCode(authRouteRules: Record<string, { auth: unknown }>): string {
  return `export const authRouteRules = ${JSON.stringify(authRouteRules, null, 2)}\n`
}
