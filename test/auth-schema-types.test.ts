import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { organization } from 'better-auth/plugins'
import { describe, expect, it } from 'vitest'
import { buildSchemaExportTypes } from '../src/module/templates'
import { generateDrizzleSchema } from '../src/schema-generator'

async function checkSchemaTypes(dialect: 'sqlite' | 'postgresql' | 'mysql', usePlural: boolean, hasHubDb = true, secondaryStorage = false, customModelNames = false) {
  const cacheDir = join(import.meta.dirname, '../node_modules/.cache')
  mkdirSync(cacheDir, { recursive: true })
  const dir = mkdtempSync(join(cacheDir, 'auth-schema-types-'))
  try {
    const modelNames = customModelNames
      ? { user: 'person', session: 'loginSession', account: 'identity', verification: 'challenge' }
      : undefined
    const options = {
      plugins: [organization()],
      user: { modelName: modelNames?.user, additionalFields: { customField: { type: 'string' as const, required: true } } },
      session: { modelName: modelNames?.session },
      account: { modelName: modelNames?.account },
      verification: { modelName: modelNames?.verification },
      secondaryStorage: secondaryStorage ? { get: async () => null, set: async () => {}, delete: async () => {} } : undefined,
    }
    if (hasHubDb)
      writeFileSync(join(dir, `schema.${dialect}.ts`), await generateDrizzleSchema(options, dialect, { usePlural }))
    writeFileSync(join(dir, 'schema.mjs'), '')
    writeFileSync(join(dir, 'schema.d.ts'), buildSchemaExportTypes(hasHubDb, dialect, modelNames))
    const userTable = customModelNames ? `person${usePlural ? 's' : ''}` : usePlural ? 'users' : 'user'
    const accountTable = customModelNames ? `identity${usePlural ? 's' : ''}` : usePlural ? 'accounts' : 'account'
    const verificationTable = customModelNames ? `challenge${usePlural ? 's' : ''}` : usePlural ? 'verifications' : 'verification'
    writeFileSync(join(dir, 'consumer.ts'), hasHubDb
      ? `import { user, session, account, verification, schema, ${userTable} as generatedUser, ${accountTable} as generatedAccount, ${secondaryStorage ? 'verification' : verificationTable} as generatedVerification, ${usePlural ? 'organizations' : 'organization'} } from '#auth/schema'
type Assert<T extends true> = T
type IsAny<T> = 0 extends (1 & T) ? true : false
type UserIsTyped = Assert<IsAny<typeof user> extends false ? true : false>
type SchemaIsTyped = Assert<IsAny<typeof schema.user> extends false ? true : false>
type CustomField = Assert<typeof user.$inferSelect.customField extends string ? true : false>
type PluginField = Assert<typeof ${usePlural ? 'organizations' : 'organization'}.$inferSelect.slug extends string ? true : false>
type SchemaCustomField = Assert<typeof schema.user.$inferSelect.customField extends string ? true : false>
type UserAlias = Assert<typeof user extends typeof generatedUser ? true : false>
type AccountAlias = Assert<typeof account extends typeof generatedAccount ? true : false>
type VerificationAlias = Assert<typeof verification extends typeof generatedVerification ? true : false>
${secondaryStorage ? 'const missingVerification: undefined = verification' : 'type VerificationValue = Assert<typeof verification.$inferSelect.value extends string ? true : false>'}
${secondaryStorage ? 'const missingSession: undefined = session' : 'type SessionId = Assert<typeof session.$inferSelect.userId extends string ? true : false>'}
// @ts-expect-error Unknown columns must fail.
type UnknownColumn = typeof user.nonexistentColumn
`
      : `import { user, session, account, verification, schema } from '#auth/schema'
const missing: undefined[] = [user, session, account, verification, schema]
// @ts-expect-error No database means no user table.
user.id
`)
    for (const alias of ['schema.d.ts', 'schema']) {
      const program = ts.createProgram([join(dir, 'consumer.ts')], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        types: [],
        paths: { '#auth/schema': [join(dir, alias)] },
      })
      const diagnostics = ts.getPreEmitDiagnostics(program)
      expect(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([])
    }
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('#auth/schema declaration resolution', () => {
  it.each(['sqlite', 'postgresql', 'mysql'] as const)('preserves %s table and additional-field types', async (dialect) => {
    await checkSchemaTypes(dialect, false)
    await checkSchemaTypes(dialect, true)
  })

  it('types omitted session tables as undefined', async () => {
    await checkSchemaTypes('sqlite', false, true, true)
  })

  it.each([false, true])('preserves custom core model names with usePlural=%s', async (usePlural) => {
    await checkSchemaTypes('sqlite', usePlural, true, false, true)
  })

  it('types database-less exports as undefined', async () => {
    await checkSchemaTypes('sqlite', false, false)
  })
})
