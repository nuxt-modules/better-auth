import { describe, expect, it } from 'vitest'
import {
  analyzeAuthSchemaDrift,
  assertNoAuthSchemaDrift,
  checkAuthSchemaDrift,
  createSqliteSchemaIntrospector,
  formatAuthSchemaDriftReport,
} from '../src/schema-diagnostics'

describe('analyzeAuthSchemaDrift', () => {
  it('reports missing required tables as errors', () => {
    const report = analyzeAuthSchemaDrift({
      tables: {
        user: { name: 'user', columns: [{ name: 'id' }] },
      },
    })

    expect(report.ok).toBe(false)
    expect(report.issues.some(issue => issue.code === 'missing_table' && issue.table === 'account')).toBe(true)
  })

  it('reports compatibility warnings for known drift columns', () => {
    const report = analyzeAuthSchemaDrift({
      tables: {
        user: { name: 'user', columns: [{ name: 'id' }] },
        account: { name: 'account', columns: [{ name: 'id' }, { name: 'userId' }] },
        session: { name: 'session', columns: [{ name: 'id' }, { name: 'userId' }] },
      },
    })

    expect(report.ok).toBe(true)
    expect(report.issues.some(issue => issue.column === 'banned')).toBe(true)
    expect(report.issues.some(issue => issue.column === 'impersonatedBy')).toBe(true)
  })

  it('checks invitation email width when invitation table exists', () => {
    const report = analyzeAuthSchemaDrift({
      tables: {
        user: { name: 'user', columns: [{ name: 'id' }, { name: 'banned' }, { name: 'banReason' }, { name: 'banExpires' }] },
        account: { name: 'account', columns: [{ name: 'id' }, { name: 'userId' }] },
        session: { name: 'session', columns: [{ name: 'id' }, { name: 'userId' }, { name: 'impersonatedBy' }] },
        invitations: { name: 'invitations', columns: [{ name: 'email', maxLength: 128 }] },
      },
    })

    expect(report.issues.some(issue => issue.code === 'invitation_email_length_mismatch')).toBe(true)
  })
})

describe('checkAuthSchemaDrift', () => {
  it('builds snapshot from introspector and formats report', async () => {
    const report = await checkAuthSchemaDrift({
      listTables: async () => ['user', 'account', 'session'],
      listColumns: async tableName => ({
        user: [{ name: 'id' }],
        account: [{ name: 'id' }, { name: 'userId' }],
        session: [{ name: 'id' }, { name: 'userId' }],
      }[tableName] || []),
    })

    expect(formatAuthSchemaDriftReport(report)).toContain('Auth schema drift report')
  })

  it('throws when report contains errors', async () => {
    const report = await checkAuthSchemaDrift({
      listTables: async () => ['user'],
      listColumns: async () => [{ name: 'id' }],
    })

    expect(() => assertNoAuthSchemaDrift(report)).toThrow('Auth schema drift report')
  })
})

describe('createSqliteSchemaIntrospector', () => {
  it('maps sqlite table and pragma rows', async () => {
    const introspector = createSqliteSchemaIntrospector(async (query) => {
      if (query.includes('sqlite_master'))
        return [{ name: 'user' }]
      return [{ name: 'email', type: 'varchar(255)' }]
    })

    const tables = await introspector.listTables()
    const columns = await introspector.listColumns('user')

    expect(tables).toEqual(['user'])
    expect(columns[0]).toEqual({
      name: 'email',
      dataType: 'varchar(255)',
      maxLength: 255,
    })
  })
})
