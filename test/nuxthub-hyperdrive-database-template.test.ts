import { describe, expect, it } from 'vitest'
import { buildDatabaseCode } from '../src/module/templates'

describe('buildDatabaseCode', () => {
  it('uses request-scoped hyperdrive clients with cleanup for nuxthub postgresql', () => {
    const code = buildDatabaseCode({
      provider: 'nuxthub',
      hubDialect: 'postgresql',
      usePlural: false,
      camelCase: true,
    })

    expect(code).toContain('import { db } from \'@nuxthub/db\'')
    expect(code).toContain('const requestDatabaseKey = Symbol.for(\'nuxt-better-auth.requestDatabase\')')
    expect(code).toContain('const requestDatabaseCleanupKey = Symbol.for(\'nuxt-better-auth.requestDatabaseCleanup\')')
    expect(code).toContain('context[requestDatabaseCleanupKey] = () => client.end({ timeout: 0 }).catch(() => {})')
    expect(code).toContain('client.end({ timeout: 0 })')
    expect(code).toContain('prepare: false')
    expect(code).toContain('max: 1')
    expect(code).toContain('export function createDatabase(event)')
    expect(code).not.toContain('node_modules/@nuxthub/db')
    expect(code).not.toContain('@nuxthub/db/db.mjs')
    expect(code).not.toContain('await import(\'@nuxthub/db\')')
    expect(code).not.toContain('import { db } from \'#imports\'')
    expect(code).not.toContain('import { db } from \'hub:db\'')
    expect(code).not.toContain('../hub/db.mjs')
    expect(code).not.toContain('nitropack/runtime')
    expect(code).not.toContain('useNitroApp')
    expect(code).not.toContain('hook(\'afterResponse\'')
  })

  it('keeps the existing generated adapter path for non-postgresql nuxthub databases', () => {
    const code = buildDatabaseCode({
      provider: 'nuxthub',
      hubDialect: 'sqlite',
      usePlural: false,
      camelCase: true,
    })

    expect(code).toContain('import { db } from \'@nuxthub/db\'')
    expect(code).toContain('drizzleAdapter(db, { provider: dialect')
    expect(code).not.toContain('node_modules/@nuxthub/db')
    expect(code).not.toContain('@nuxthub/db/db.mjs')
    expect(code).not.toContain('await import(\'@nuxthub/db\')')
    expect(code).not.toContain('import { db } from \'#imports\'')
    expect(code).not.toContain('import { db } from \'hub:db\'')
    expect(code).not.toContain('../hub/db.mjs')
    expect(code).not.toContain('import postgres from \'postgres\'')
    expect(code).not.toContain('nitropack/runtime')
    expect(code).not.toContain('useNitroApp')
    expect(code).not.toContain('hook(\'afterResponse\'')
  })
})
