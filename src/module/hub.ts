import type { Casing } from 'drizzle-orm/utils'

export type DbDialect = 'sqlite' | 'postgresql' | 'mysql'

export interface NuxtHubOptions {
  db?: boolean | DbDialect | { dialect?: DbDialect, casing?: Casing }
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

export function getHubCasing(hub?: NuxtHubOptions): Casing | undefined {
  if (!hub?.db || typeof hub.db !== 'object' || hub.db === null)
    return undefined
  return hub.db.casing
}
