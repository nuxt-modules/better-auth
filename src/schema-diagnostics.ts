export type AuthSchemaDriftLevel = 'error' | 'warning'

export interface AuthSchemaColumn {
  name: string
  dataType?: string | null
  maxLength?: number | null
}

export interface AuthSchemaTable {
  name: string
  columns: AuthSchemaColumn[]
}

export interface AuthSchemaSnapshot {
  tables: Record<string, AuthSchemaTable>
}

export interface AuthSchemaDriftIssue {
  level: AuthSchemaDriftLevel
  code: string
  message: string
  table?: string
  column?: string
}

export interface AuthSchemaDriftReport {
  ok: boolean
  issues: AuthSchemaDriftIssue[]
}

export interface AuthSchemaDriftOptions {
  expectSessionTable?: boolean
  tableNames?: {
    user?: string
    account?: string
    session?: string
    invitation?: string | string[]
  }
}

export interface AuthSchemaIntrospector {
  listTables: () => Promise<string[]>
  listColumns: (tableName: string) => Promise<AuthSchemaColumn[]>
}

export type SqlQuery = (query: string) => Promise<unknown[]>

interface ResolvedTableNames {
  user: string
  account: string
  session: string
  invitationCandidates: string[]
}

function resolveTableNames(options: AuthSchemaDriftOptions = {}): ResolvedTableNames {
  const invitation = options.tableNames?.invitation
  const invitationCandidates = Array.isArray(invitation)
    ? invitation
    : invitation
      ? [invitation]
      : ['invitation', 'invitations']

  return {
    user: options.tableNames?.user || 'user',
    account: options.tableNames?.account || 'account',
    session: options.tableNames?.session || 'session',
    invitationCandidates,
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function toColumnMap(columns: AuthSchemaColumn[]): Record<string, AuthSchemaColumn> {
  return Object.fromEntries(columns.map(column => [normalizeName(column.name), column]))
}

function addIssue(issues: AuthSchemaDriftIssue[], issue: AuthSchemaDriftIssue): void {
  issues.push(issue)
}

function parseLengthFromSqlType(dataType: string | null | undefined): number | null {
  if (!dataType)
    return null
  const match = dataType.match(/\((\d+)\)/)
  if (!match)
    return null
  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNumber(value: unknown): number | null {
  if (value == null)
    return null
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll('\'', '\'\'')
}

export function analyzeAuthSchemaDrift(snapshot: AuthSchemaSnapshot, options: AuthSchemaDriftOptions = {}): AuthSchemaDriftReport {
  const issues: AuthSchemaDriftIssue[] = []
  const tableNames = resolveTableNames(options)
  const expectSessionTable = options.expectSessionTable ?? true

  const tablesByName = Object.fromEntries(
    Object.values(snapshot.tables).map(table => [normalizeName(table.name), table]),
  )

  const requiredTables = [tableNames.user, tableNames.account, ...(expectSessionTable ? [tableNames.session] : [])]
  for (const tableName of requiredTables) {
    if (!tablesByName[normalizeName(tableName)]) {
      addIssue(issues, {
        level: 'error',
        code: 'missing_table',
        table: tableName,
        message: `Missing required auth table "${tableName}"`,
      })
    }
  }

  const userTable = tablesByName[normalizeName(tableNames.user)]
  const accountTable = tablesByName[normalizeName(tableNames.account)]
  const sessionTable = tablesByName[normalizeName(tableNames.session)]

  if (userTable) {
    const columns = toColumnMap(userTable.columns)
    for (const columnName of ['id']) {
      if (!columns[normalizeName(columnName)]) {
        addIssue(issues, {
          level: 'error',
          code: 'missing_required_column',
          table: userTable.name,
          column: columnName,
          message: `Missing required column "${columnName}" on "${userTable.name}"`,
        })
      }
    }

    for (const columnName of ['banned', 'banReason', 'banExpires']) {
      if (!columns[normalizeName(columnName)]) {
        addIssue(issues, {
          level: 'warning',
          code: 'missing_compat_column',
          table: userTable.name,
          column: columnName,
          message: `Compatibility column "${columnName}" is missing on "${userTable.name}"`,
        })
      }
    }
  }

  if (accountTable) {
    const columns = toColumnMap(accountTable.columns)
    for (const columnName of ['id', 'userId']) {
      if (!columns[normalizeName(columnName)]) {
        addIssue(issues, {
          level: 'error',
          code: 'missing_required_column',
          table: accountTable.name,
          column: columnName,
          message: `Missing required column "${columnName}" on "${accountTable.name}"`,
        })
      }
    }
  }

  if (expectSessionTable && sessionTable) {
    const columns = toColumnMap(sessionTable.columns)
    for (const columnName of ['id', 'userId']) {
      if (!columns[normalizeName(columnName)]) {
        addIssue(issues, {
          level: 'error',
          code: 'missing_required_column',
          table: sessionTable.name,
          column: columnName,
          message: `Missing required column "${columnName}" on "${sessionTable.name}"`,
        })
      }
    }

    if (!columns[normalizeName('impersonatedBy')]) {
      addIssue(issues, {
        level: 'warning',
        code: 'missing_compat_column',
        table: sessionTable.name,
        column: 'impersonatedBy',
        message: `Compatibility column "impersonatedBy" is missing on "${sessionTable.name}"`,
      })
    }
  }

  const invitationTable = tableNames.invitationCandidates
    .map(name => tablesByName[normalizeName(name)])
    .find(Boolean)

  if (invitationTable) {
    const columns = toColumnMap(invitationTable.columns)
    const emailColumn = columns[normalizeName('email')]
    if (!emailColumn) {
      addIssue(issues, {
        level: 'warning',
        code: 'missing_compat_column',
        table: invitationTable.name,
        column: 'email',
        message: `Compatibility column "email" is missing on "${invitationTable.name}"`,
      })
    }
    else if (emailColumn.maxLength != null && emailColumn.maxLength !== 255) {
      addIssue(issues, {
        level: 'warning',
        code: 'invitation_email_length_mismatch',
        table: invitationTable.name,
        column: 'email',
        message: `Expected "${invitationTable.name}.email" length 255 but found ${emailColumn.maxLength}`,
      })
    }
  }

  return {
    ok: !issues.some(issue => issue.level === 'error'),
    issues,
  }
}

export async function checkAuthSchemaDrift(
  introspector: AuthSchemaIntrospector,
  options: AuthSchemaDriftOptions = {},
): Promise<AuthSchemaDriftReport> {
  const tableNames = await introspector.listTables()
  const tables: Record<string, AuthSchemaTable> = {}

  await Promise.all(tableNames.map(async (tableName) => {
    const columns = await introspector.listColumns(tableName)
    tables[tableName] = { name: tableName, columns }
  }))

  return analyzeAuthSchemaDrift({ tables }, options)
}

export function formatAuthSchemaDriftReport(report: AuthSchemaDriftReport): string {
  if (!report.issues.length)
    return '[nuxt-better-auth] No auth schema drift detected.'

  const rows = report.issues.map((issue) => {
    const location = [issue.table, issue.column].filter(Boolean).join('.')
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN'
    return `- [${prefix}] ${issue.code}${location ? ` (${location})` : ''}: ${issue.message}`
  })

  return ['[nuxt-better-auth] Auth schema drift report:', ...rows].join('\n')
}

export function assertNoAuthSchemaDrift(report: AuthSchemaDriftReport): void {
  if (report.ok)
    return
  throw new Error(formatAuthSchemaDriftReport(report))
}

export function createSqliteSchemaIntrospector(query: SqlQuery): AuthSchemaIntrospector {
  return {
    async listTables() {
      const rows = await query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      return rows
        .map((row) => (row as Record<string, unknown>).name)
        .filter((name): name is string => typeof name === 'string')
    },
    async listColumns(tableName: string) {
      const rows = await query(`PRAGMA table_info('${escapeSqlLiteral(tableName)}')`)
      return rows.map((row) => {
        const record = row as Record<string, unknown>
        const dataType = typeof record.type === 'string' ? record.type : null
        return {
          name: String(record.name || ''),
          dataType,
          maxLength: parseLengthFromSqlType(dataType),
        } satisfies AuthSchemaColumn
      })
    },
  }
}

export function createPostgresSchemaIntrospector(query: SqlQuery, schema = 'public'): AuthSchemaIntrospector {
  const escapedSchema = escapeSqlLiteral(schema)
  return {
    async listTables() {
      const rows = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${escapedSchema}'`)
      return rows
        .map((row) => (row as Record<string, unknown>).table_name)
        .filter((name): name is string => typeof name === 'string')
    },
    async listColumns(tableName: string) {
      const rows = await query(`
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = '${escapedSchema}'
  AND table_name = '${escapeSqlLiteral(tableName)}'
`)
      return rows.map((row) => {
        const record = row as Record<string, unknown>
        return {
          name: String(record.column_name || ''),
          dataType: typeof record.data_type === 'string' ? record.data_type : null,
          maxLength: parseNumber(record.character_maximum_length),
        } satisfies AuthSchemaColumn
      })
    },
  }
}

export function createMySqlSchemaIntrospector(query: SqlQuery, schemaName?: string): AuthSchemaIntrospector {
  const schemaExpr = schemaName ? `'${escapeSqlLiteral(schemaName)}'` : 'DATABASE()'
  return {
    async listTables() {
      const rows = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schemaExpr}`)
      return rows
        .map((row) => (row as Record<string, unknown>).table_name)
        .filter((name): name is string => typeof name === 'string')
    },
    async listColumns(tableName: string) {
      const rows = await query(`
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = ${schemaExpr}
  AND table_name = '${escapeSqlLiteral(tableName)}'
`)
      return rows.map((row) => {
        const record = row as Record<string, unknown>
        return {
          name: String(record.column_name || ''),
          dataType: typeof record.data_type === 'string' ? record.data_type : null,
          maxLength: parseNumber(record.character_maximum_length),
        } satisfies AuthSchemaColumn
      })
    },
  }
}
