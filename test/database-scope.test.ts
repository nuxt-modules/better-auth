import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { buildDatabaseCode } from '../src/module/templates'

function loadDatabase() {
  const postgres = vi.fn(() => ({}))
  const code = buildDatabaseCode({ provider: 'nuxthub', hubDialect: 'postgresql', usePlural: false, camelCase: false })
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '')
  const database = runInNewContext(`${code}\n;({ isRequestScopedDatabase, createDatabase })`, {
    process: { env: {} },
    db: {},
    schema: {},
    postgres,
    drizzle: (options: unknown) => options,
    drizzleAdapter: (database: unknown) => database,
  })
  return { ...database, postgres }
}

describe('generated database request scope', () => {
  it.each(['context', 'runtime'])('recognizes Hyperdrive in the %s binding location', (location) => {
    const { isRequestScopedDatabase, createDatabase, postgres } = loadDatabase()
    const cloudflare = { env: { POSTGRES: { connectionString: 'postgres://hyperdrive/test' } } }
    const event = location === 'context'
      ? { context: { cloudflare } }
      : { context: {}, req: { runtime: { cloudflare } } }

    expect(isRequestScopedDatabase(event)).toBe(true)
    const first = createDatabase(event)
    expect(createDatabase(event)).toBe(first)
    expect(postgres).toHaveBeenCalledExactlyOnceWith('postgres://hyperdrive/test', expect.objectContaining({ prepare: false, max: 1 }))
  })

  it('keeps database access process-wide without a Hyperdrive connection string', () => {
    const { isRequestScopedDatabase, createDatabase, postgres } = loadDatabase()
    const event = { req: { runtime: { cloudflare: { env: {} } } } }
    expect(isRequestScopedDatabase(event)).toBe(false)
    expect(isRequestScopedDatabase()).toBe(false)
    createDatabase(event)
    expect(postgres).not.toHaveBeenCalled()
  })
})
