declare module '#auth/database' {
  import type { BetterAuthOptions } from 'better-auth'

  export function createDatabase(): BetterAuthOptions['database'] | undefined
  export const db: typeof import('@nuxthub/db')['db'] | undefined
}

declare module '#auth/secondary-storage' {
  interface SecondaryStorage {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: unknown, ttl?: number) => Promise<void>
    delete: (key: string) => Promise<void>
  }

  export function createSecondaryStorage(): SecondaryStorage | undefined
}

declare module '#auth/server' {
  import type { BetterAuthOptions } from 'better-auth'
  import type { useRuntimeConfig } from 'nitropack/runtime'

  type ServerAuthConfig = Omit<BetterAuthOptions, 'secret' | 'baseURL'>
  type NitroRuntimeConfig = ReturnType<typeof useRuntimeConfig>

  const createServerAuth: (ctx: { runtimeConfig: NitroRuntimeConfig, db: unknown }) => ServerAuthConfig
  export default createServerAuth
}

declare module '@nuxthub/db' {
  import type { AnyColumn, AnyTable, SQL } from 'drizzle-orm'

  type TableWithColumns = AnyTable & Record<string, AnyColumn>
  type RowFromSelection<TSelection> = TSelection extends Record<string, unknown>
    ? { [K in keyof TSelection]: unknown }
    : Record<string, unknown>

  interface SelectQuery<TSelection extends Record<string, unknown> | undefined = undefined>
    extends PromiseLike<Array<RowFromSelection<TSelection>>> {
    from: (table: TableWithColumns) => SelectQuery<TSelection>
    where: (condition: SQL | undefined) => SelectQuery<TSelection>
    orderBy: (...args: unknown[]) => SelectQuery<TSelection>
    limit: (limit: number) => SelectQuery<TSelection>
    offset: (offset: number) => SelectQuery<TSelection>
  }

  interface DeleteQuery extends PromiseLike<unknown> {
    where: (condition: SQL) => DeleteQuery
  }

  export interface HubDb {
    select: <TSelection extends Record<string, unknown> | undefined = undefined>(
      selection?: TSelection,
    ) => SelectQuery<TSelection>
    delete: (table: TableWithColumns) => DeleteQuery
  }

  export const db: HubDb
  export const schema: Record<string, TableWithColumns | undefined> & {
    user?: TableWithColumns
    session?: TableWithColumns
    account?: TableWithColumns
  }
}
