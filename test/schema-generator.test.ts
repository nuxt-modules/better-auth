import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import type { BetterAuthModuleOptions } from '../src/runtime/config'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runWithNuxtContext } from '@nuxt/kit'
import { getAuthTables } from 'better-auth/db'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerNuxtHubSchemaHook, setupBetterAuthSchema } from '../src/module/schema'
import { buildSchemaExportCode } from '../src/module/templates'
import { defineClientAuth, defineServerAuth } from '../src/runtime/config'
import { generateDrizzleSchema, loadUserAuthConfig } from '../src/schema-generator'

const TEST_DIR = join(import.meta.dirname, '.test-configs')
const projectDirs: string[] = []

beforeAll(() => {
  if (!existsSync(TEST_DIR))
    mkdirSync(TEST_DIR, { recursive: true })
})
afterEach(() => {
  for (const dir of projectDirs.splice(0, projectDirs.length))
    rmSync(dir, { recursive: true, force: true })
})
afterAll(() => {
  if (existsSync(TEST_DIR))
    rmSync(TEST_DIR, { recursive: true })
})

const silentConsola = {
  info: () => {},
  warn: () => {},
  error: () => {},
  success: () => {},
} as unknown as ConsolaInstance

/** A schema file from an earlier, successful generation. */
const PREVIOUS_SCHEMA = 'export const user = sqliteTable("user", { customField: text("customField") })\n'

const BROKEN_CONFIG = `import './does-not-exist'\n\nexport default defineServerAuth({ plugins: [] })`
const NO_DEFAULT_EXPORT_CONFIG = `export const auth = defineServerAuth({ plugins: [] })`
const ADDITIONAL_FIELDS_CONFIG = `export default defineServerAuth({ user: { additionalFields: { customField: { type: 'string', required: false } } } })`

/**
 * A throwaway Nuxt project on disk, carrying only what `setupBetterAuthSchema`
 * reads: a sqlite hub dialect, a build dir to write into, and an auth config
 * whose contents each test chooses.
 */
function createSchemaProject(options: { dev: boolean, config: string }) {
  const rootDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-project-'))
  projectDirs.push(rootDir)

  const buildDir = join(rootDir, '.nuxt')
  const serverDir = join(rootDir, 'server')
  mkdirSync(buildDir, { recursive: true })
  mkdirSync(serverDir, { recursive: true })

  const serverConfigPath = join(serverDir, 'auth.config')
  writeFileSync(`${serverConfigPath}.ts`, options.config)

  const hooks = new Map<string, (payload: { paths: string[], dialect: string }) => void | Promise<void>>()

  const nuxt = {
    options: {
      dev: options.dev,
      alias: {},
      runtimeConfig: {},
      rootDir,
      buildDir,
      build: { templates: [] },
      hub: { db: 'sqlite' },
    },
    callHook: async () => {},
    hook: (name: string, cb: (payload: { paths: string[], dialect: string }) => void | Promise<void>) => {
      hooks.set(name, cb)
    },
  } as unknown as Nuxt

  const schemaPath = join(buildDir, 'better-auth', 'schema.sqlite.ts')

  let setupPromise: Promise<boolean> | undefined
  const finishSetup = () => {
    setupPromise ||= runWithNuxtContext(nuxt, () => setupBetterAuthSchema(
      nuxt,
      serverConfigPath,
      {} as BetterAuthModuleOptions,
      silentConsola,
      undefined,
    )).then(() => true)
    return setupPromise
  }
  const run = async () => {
    await finishSetup()
  }
  registerNuxtHubSchemaHook(nuxt, finishSetup)

  const writeExistingSchema = (contents: string) => {
    mkdirSync(join(buildDir, 'better-auth'), { recursive: true })
    writeFileSync(schemaPath, contents)
  }

  /** Fires NuxtHub's `hub:db:schema:extend` hook and returns the paths it collected. */
  const collectHubSchemaPaths = async () => {
    const paths: string[] = []
    await hooks.get('hub:db:schema:extend')?.({ paths, dialect: 'sqlite' })
    return paths
  }

  return { run, schemaPath, writeExistingSchema, collectHubSchemaPaths }
}

describe('generateDrizzleSchema', () => {
  it('singular table names by default', async () => {
    const schema = await generateDrizzleSchema({}, 'sqlite')
    expect(schema).toContain('export const user = sqliteTable("user"')
    expect(schema).toContain('"session"')
    expect(schema).toContain('export const session = ')
  })

  it('plural table names with usePlural', async () => {
    const schema = await generateDrizzleSchema({}, 'sqlite', { usePlural: true })
    expect(schema).toContain('"users"')
    expect(schema).toContain('"sessions"')
    expect(schema).toContain('export const users = ')
    expect(schema).toContain('export const sessions = ')
  })

  it('postgresql uses text id by default', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql')
    expect(schema).toContain('text("id").primaryKey()')
    expect(schema).not.toContain('uuid("id")')
  })

  it('postgresql uses uuid id with useUuid', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql', { useUuid: true })
    expect(schema).toContain('uuid("id")')
  })

  it('postgresql uses a custom schema namespace', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql', { schemaName: 'auth' })
    expect(schema).toContain('const authSchema = pgSchema("auth")')
    expect(schema).toContain('export const user = authSchema.table("user"')
    expect(schema).not.toContain('pgTable')
  })

  it('postgresql FK columns use uuid with useUuid', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql', { useUuid: true })
    expect(schema).toContain('uuid("userId")')
  })

  it('sqlite ignores useUuid (no native uuid support)', async () => {
    const schema = await generateDrizzleSchema({}, 'sqlite', { useUuid: true })
    expect(schema).toContain('text("id").primaryKey()')
    expect(schema).not.toContain('uuid')
  })

  it('mysql FK columns use varchar(36) with useUuid', async () => {
    const schema = await generateDrizzleSchema({}, 'mysql', { useUuid: true })
    expect(schema).toContain('varchar("userId", { length: 36 })')
  })

  it('snake_case field names with casing option', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql', { casing: 'snake_case' })
    expect(schema).toContain('email_verified')
    expect(schema).toContain('created_at')
  })

  it('snake_case table names with casing option', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql', { casing: 'snake_case' })
    expect(schema).toContain('pgTable("user"')
  })

  it('generates relations', async () => {
    const schema = await generateDrizzleSchema({}, 'postgresql')
    expect(schema).toContain('relations')
  })
})

describe('buildSchemaExportCode', () => {
  it('exports stable undefined auth table aliases without hub db', () => {
    const code = buildSchemaExportCode(false, 'sqlite')
    expect(code).toContain('export const user = undefined')
    expect(code).toContain('export const session = undefined')
    expect(code).toContain('export const account = undefined')
    expect(code).toContain('export const verification = undefined')
    expect(code).toContain('export const schema = undefined')
  })
})

describe('getAuthTables with secondaryStorage', () => {
  it('excludes session table when secondaryStorage is provided', () => {
    const mockStorage = { get: async () => null, set: async () => {}, delete: async () => {} }
    const tables = getAuthTables({ secondaryStorage: mockStorage })
    expect(tables).not.toHaveProperty('session')
    expect(tables).toHaveProperty('user')
    expect(tables).toHaveProperty('account')
  })

  it('includes session table when secondaryStorage is undefined', () => {
    const tables = getAuthTables({})
    expect(tables).toHaveProperty('session')
    expect(tables).toHaveProperty('user')
  })
})

describe('loadUserAuthConfig', () => {
  it('returns null for non-existent file (dev mode)', async () => {
    const result = await loadUserAuthConfig(join(TEST_DIR, 'nonexistent.ts'), false)
    expect(result).toBeNull()
  })

  it('throws for non-existent file when throwOnError=true', async () => {
    await expect(loadUserAuthConfig(join(TEST_DIR, 'nonexistent.ts'), true)).rejects.toThrow('Failed to load auth config')
  })

  it('returns config from valid defineServerAuth export', async () => {
    const configPath = join(TEST_DIR, 'valid-config.ts')
    writeFileSync(configPath, `export default defineServerAuth(() => ({ plugins: [] }))`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toEqual({ plugins: [] })
  })

  it('warns and returns null for non-function export (dev mode)', async () => {
    const configPath = join(TEST_DIR, 'invalid-config.ts')
    writeFileSync(configPath, `export default { notAFunction: true }`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toBeNull()
  })

  it('throws for non-function export when throwOnError=true', async () => {
    const configPath = join(TEST_DIR, 'invalid-config2.ts')
    writeFileSync(configPath, `export default { notAFunction: true }`)
    await expect(loadUserAuthConfig(configPath, true)).rejects.toThrow('must export default defineServerAuth')
  })

  it('returns config from object syntax defineServerAuth', async () => {
    const configPath = join(TEST_DIR, 'object-config.ts')
    writeFileSync(configPath, `export default defineServerAuth({ appName: 'Test', plugins: [] })`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toEqual({ appName: 'Test', plugins: [] })
  })

  it('accepts readonly plugin tuples in object syntax defineServerAuth', async () => {
    const configPath = join(TEST_DIR, 'readonly-object-config.ts')
    writeFileSync(configPath, `const plugin = { id: 'test-plugin', schema: { user: { fields: {} } } } as const\nexport default defineServerAuth({ appName: 'Readonly', plugins: [plugin] as const })`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toEqual({ appName: 'Readonly', plugins: [{ id: 'test-plugin', schema: { user: { fields: {} } } }] })
  })

  it('resolves aliased imports when provided', async () => {
    const helperPath = join(TEST_DIR, 'helper.ts')
    const configPath = join(TEST_DIR, 'aliased-config.ts')

    writeFileSync(helperPath, `export function getPlugins() { return [] }`)
    writeFileSync(configPath, `import { getPlugins } from '#server/helper'\nexport default defineServerAuth(() => ({ plugins: getPlugins() }))`)

    const result = await loadUserAuthConfig(configPath, false, {
      '#server': TEST_DIR,
    })

    expect(result).toEqual({ plugins: [] })
  })

  it('passes runtime config to function syntax during schema generation', async () => {
    const configPath = join(TEST_DIR, 'runtime-config.ts')
    writeFileSync(configPath, `export default defineServerAuth(({ runtimeConfig }) => ({ appName: runtimeConfig.public.app.routes.signUp }))`)

    const result = await loadUserAuthConfig(configPath, false, undefined, {
      public: { app: { routes: { signUp: '/auth/sign-up' } } },
    })

    expect(result).toEqual({ appName: '/auth/sign-up' })
  })

  it('loads .env.local before importing auth config dependencies', async () => {
    const envPath = join(TEST_DIR, '.env.local')
    const helperPath = join(TEST_DIR, 'env-helper.ts')
    const configPath = join(TEST_DIR, 'env-config.ts')
    const originalApiKey = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    try {
      writeFileSync(envPath, 'RESEND_API_KEY=re_test_fixture\n')
      writeFileSync(helperPath, `if (!process.env.RESEND_API_KEY)\n  throw new Error('Missing API key. Pass it to the constructor new Resend("re_123")')\n\nexport function getPlugins() { return [] }\n`)
      writeFileSync(configPath, `import { getPlugins } from './env-helper'\nexport default defineServerAuth({ plugins: getPlugins() })`)

      const result = await loadUserAuthConfig(configPath, true, undefined, {}, TEST_DIR)

      expect(result).toEqual({ plugins: [] })
    }
    finally {
      if (originalApiKey === undefined)
        delete process.env.RESEND_API_KEY
      else
        process.env.RESEND_API_KEY = originalApiKey
    }
  })
})

describe.each([
  ['throws on load', BROKEN_CONFIG],
  ['has no default export', NO_DEFAULT_EXPORT_CONFIG],
])('setupBetterAuthSchema in dev mode when the auth config %s', (_label, config) => {
  it('writes no schema file', async () => {
    const project = createSchemaProject({ dev: true, config })

    await project.run()

    expect(existsSync(project.schemaPath)).toBe(false)
  })

  it('leaves a previously generated schema file untouched', async () => {
    const project = createSchemaProject({ dev: true, config })
    project.writeExistingSchema(PREVIOUS_SCHEMA)

    await project.run()

    expect(readFileSync(project.schemaPath, 'utf8')).toBe(PREVIOUS_SCHEMA)
  })

  it('still points NuxtHub at the previously generated schema file', async () => {
    const project = createSchemaProject({ dev: true, config })
    project.writeExistingSchema(PREVIOUS_SCHEMA)

    await project.run()

    await expect(project.collectHubSchemaPaths()).resolves.toEqual([project.schemaPath])
  })
})

describe('setupBetterAuthSchema when the auth config fails to load', () => {
  it('rejects in production mode instead of writing a schema file', async () => {
    const project = createSchemaProject({ dev: false, config: BROKEN_CONFIG })

    await expect(project.run()).rejects.toThrow('Failed to load auth config')
    expect(existsSync(project.schemaPath)).toBe(false)
  })
})

describe('setupBetterAuthSchema when the auth config loads', () => {
  it('writes a schema carrying the configured additionalFields', async () => {
    const project = createSchemaProject({ dev: true, config: ADDITIONAL_FIELDS_CONFIG })

    await project.run()

    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
  })
})

describe('defineServerAuth', () => {
  it('accepts object syntax and returns config factory', () => {
    const factory = defineServerAuth({ appName: 'Test', emailAndPassword: { enabled: true } })
    expect(typeof factory).toBe('function')
    const config = factory({ runtimeConfig: {} as any, db: undefined })
    expect(config).toEqual({ appName: 'Test', emailAndPassword: { enabled: true } })
  })

  it('accepts function syntax and returns config factory', () => {
    const factory = defineServerAuth(ctx => ({ appName: 'Dynamic', runtimeBased: !!ctx.runtimeConfig }))
    expect(typeof factory).toBe('function')
    const config = factory({ runtimeConfig: { public: {} } as any, db: undefined })
    expect(config).toEqual({ appName: 'Dynamic', runtimeBased: true })
  })

  it('function syntax receives context', () => {
    const factory = defineServerAuth(({ db }) => ({ hasDb: db !== undefined }))
    expect(factory({ runtimeConfig: {} as any, db: {} as any })).toEqual({ hasDb: true })
    expect(factory({ runtimeConfig: {} as any, db: undefined })).toEqual({ hasDb: false })
  })

  it('function syntax receives requestOrigin context', () => {
    const factory = defineServerAuth(({ requestOrigin }) => ({ requestOrigin }))
    expect(factory({
      runtimeConfig: {} as any,
      db: undefined,
      requestOrigin: 'https://example.com',
    })).toEqual({ requestOrigin: 'https://example.com' })
  })
})

describe('defineClientAuth', () => {
  it('accepts object syntax and returns client factory', () => {
    const factory = defineClientAuth({ plugins: [] })
    expect(typeof factory).toBe('function')
    const client = factory('http://localhost:3000')
    expect(typeof client.signIn).toBe('function')
    expect(typeof client.signUp).toBe('function')
    expect(typeof client.signOut).toBe('function')
  })

  it('accepts function syntax and returns client factory', () => {
    const factory = defineClientAuth(ctx => ({ fetchOptions: { headers: { 'x-site': ctx.siteUrl } } }))
    expect(typeof factory).toBe('function')
    const client = factory('http://example.com')
    expect(typeof client.signIn).toBe('function')
  })

  it('function syntax receives context with siteUrl', () => {
    let capturedUrl = ''
    const factory = defineClientAuth((ctx) => {
      capturedUrl = ctx.siteUrl
      return {}
    })
    factory('http://test.local')
    expect(capturedUrl).toBe('http://test.local')
  })
})
