import type { SchemaCasing } from '../runtime/config'

export type DbDialect = 'sqlite' | 'postgresql' | 'mysql'
export type DbDriver = 'd1' | 'd1-http' | 'postgres-js' | 'neon-http' | 'libsql' | 'mysql2' | 'pglite'

export interface NuxtHubOptions {
  db?: boolean | DbDialect | { dialect?: DbDialect, casing?: SchemaCasing, driver?: DbDriver }
  kv?: boolean
}

export function getHubDialect(hub?: NuxtHubOptions): DbDialect | undefined {
  if (!hub?.db)
    return undefined
  if (typeof hub.db === 'string')
    return hub.db
  if (typeof hub.db === 'object' && hub.db !== null)
    return hub.db.dialect
  return undefined
}

export function getHubCasing(hub?: NuxtHubOptions): SchemaCasing | undefined {
  if (!hub?.db || typeof hub.db !== 'object' || hub.db === null)
    return undefined
  return hub.db.casing
}
