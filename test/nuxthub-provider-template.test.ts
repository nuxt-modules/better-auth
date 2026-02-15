import { describe, expect, it } from 'vitest'
import { buildDatabaseCode } from '../src/module/templates'

describe('nuxthub provider database template', () => {
  it('imports schema from generated better-auth schema file', () => {
    const code = buildDatabaseCode({
      provider: 'nuxthub',
      hubDialect: 'sqlite',
      usePlural: false,
      camelCase: true,
    })

    expect(code).toContain(`import { db } from '@nuxthub/db'`)
    expect(code).toContain(`import * as schema from './schema.sqlite.mjs'`)
    expect(code).not.toContain(`import { db, schema } from '@nuxthub/db'`)
  })

  it('normalizes postgresql dialect to pg provider', () => {
    const code = buildDatabaseCode({
      provider: 'nuxthub',
      hubDialect: 'postgresql',
      usePlural: false,
      camelCase: true,
    })

    expect(code).toContain(`const dialect = rawDialect === 'postgresql' ? 'pg' : rawDialect`)
  })
})

