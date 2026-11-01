import type { Buffer } from 'node:buffer'
import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import type { BetterAuthModuleOptions } from '../src/runtime/config'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import * as fsPromises from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runWithNuxtContext } from '@nuxt/kit'
import * as authApi from 'auth/api'
import { consola } from 'consola'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerNuxtHubSchemaHook, setupBetterAuthSchema } from '../src/module/schema'
import { buildSchemaExportCode } from '../src/module/templates'
import { defineServerAuth } from '../src/runtime/config'
import type { PackageJson } from '../src/schema-generator'
import { checkBetterAuthCli, generateDrizzleSchema, loadUserAuthConfig } from '../src/schema-generator'

vi.mock('auth/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('auth/api')>()
  return { ...api, generateDrizzleSchema: vi.fn(api.generateDrizzleSchema) }
})
// Pass-through spies, so tests can change installed package files and fail cache I/O.
vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>()
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) }
})
vi.mock('node:fs/promises', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs/promises')>()
  return { ...fs, readFile: vi.fn(fs.readFile), writeFile: vi.fn(fs.writeFile) }
})

const TEST_DIR = join(import.meta.dirname, '.test-configs')
const projectDirs: string[] = []

beforeAll(() => {
  if (!existsSync(TEST_DIR))
    mkdirSync(TEST_DIR, { recursive: true })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
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
function createSchemaProject(options: { dev: boolean, config: string, configExtension?: '.js' | '.ts', moduleOptions?: Partial<BetterAuthModuleOptions>, dialect?: 'sqlite' | 'postgresql' }) {
  const dialect = options.dialect ?? 'sqlite'
  const rootDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-project-'))
  projectDirs.push(rootDir)

  const buildDir = join(rootDir, '.nuxt')
  const serverDir = join(rootDir, 'server')
  mkdirSync(buildDir, { recursive: true })
  mkdirSync(serverDir, { recursive: true })

  const serverConfigPath = join(serverDir, 'auth.config')
  const writeConfig = (config: string) => writeFileSync(`${serverConfigPath}${options.configExtension ?? '.ts'}`, config)
  writeConfig(options.config)

  const hooks = new Map<string, (payload: { paths: string[], dialect: string }) => void | Promise<void>>()

  const nuxt = {
    options: {
      dev: options.dev,
      alias: {},
      runtimeConfig: {},
      rootDir,
      buildDir,
      build: { templates: [] },
      hub: { db: dialect },
    },
    callHook: async () => {},
    hook: (name: string, cb: (payload: { paths: string[], dialect: string }) => void | Promise<void>) => {
      hooks.set(name, cb)
    },
  } as unknown as Nuxt

  const schemaPath = join(buildDir, 'better-auth', `schema.${dialect}.ts`)
  const cacheFile = join(buildDir, 'cache', 'better-auth', `schema.${dialect}.json`)
  const logger = { ...silentConsola, warn: vi.fn(), error: vi.fn() }

  let setupPromise: Promise<boolean> | undefined
  let schemaModelNames: Awaited<ReturnType<typeof setupBetterAuthSchema>>
  const finishSetup = () => {
    setupPromise ||= runWithNuxtContext(nuxt, () => setupBetterAuthSchema(
      nuxt,
      serverConfigPath,
      (options.moduleOptions ?? {}) as BetterAuthModuleOptions,
      logger,
      undefined,
    )).then((result) => {
      schemaModelNames = result
      return true
    })
    return setupPromise
  }
  const run = async () => {
    await finishSetup()
  }
  /** Runs schema setup again, as the next `nuxi build` or dev restart of this project does. */
  const rerun = (moduleOptions = options.moduleOptions, hubSecondaryStorage?: BetterAuthModuleOptions['hubSecondaryStorage']) => runWithNuxtContext(nuxt, () => setupBetterAuthSchema(
    nuxt,
    serverConfigPath,
    (moduleOptions ?? {}) as BetterAuthModuleOptions,
    logger,
    hubSecondaryStorage,
  ))
  registerNuxtHubSchemaHook(nuxt, finishSetup)

  const writeExistingSchema = (contents: string) => {
    mkdirSync(join(buildDir, 'better-auth'), { recursive: true })
    writeFileSync(schemaPath, contents)
  }

  /** Fires NuxtHub's `hub:db:schema:extend` hook and returns the paths it collected. */
  const collectHubSchemaPaths = async () => {
    const paths: string[] = []
    await hooks.get('hub:db:schema:extend')?.({ paths, dialect })
    return paths
  }

  return { run, rerun, writeConfig, schemaPath, cacheFile, writeExistingSchema, collectHubSchemaPaths, nuxt, logger, getSchemaModelNames: () => schemaModelNames }
}

type SchemaProject = ReturnType<typeof createSchemaProject>

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

describe('checkBetterAuthCli', () => {
  function packages(installed: Partial<Record<'auth' | 'better-auth', PackageJson>>) {
    return (name: 'auth' | 'better-auth') => installed[name]
  }

  function projectWith(lockfile?: string) {
    const rootDir = mkdtempSync(join(tmpdir(), 'nuxt-better-auth-cli-'))
    projectDirs.push(rootDir)
    if (lockfile)
      writeFileSync(join(rootDir, lockfile), '')
    return rootDir
  }

  it('accepts the installed auth package', () => {
    expect(checkBetterAuthCli(projectWith())).toEqual({})
  })

  it('fails with an install command pinned to the app better-auth version', () => {
    const result = checkBetterAuthCli(projectWith('pnpm-lock.yaml'), packages({ 'better-auth': { name: 'better-auth', version: '1.7.3' } }))

    expect(result.error?.code).toBe('NUXT_AUTH_CLI_MISSING')
    expect(result.error?.fix).toBe('Run pnpm add -D auth@1.7.3. Keep auth on the same version as better-auth.')
  })

  it('uses the package manager that owns the project lockfile', () => {
    vi.stubEnv('npm_config_user_agent', 'pnpm/11.21.0 node/v24.21.0')
    const missing = packages({ 'better-auth': { name: 'better-auth', version: '1.7.3' } })

    expect(checkBetterAuthCli(projectWith('yarn.lock'), missing).error?.fix).toContain('yarn add -D auth@1.7.3')
    expect(checkBetterAuthCli(projectWith('package-lock.json'), missing).error?.fix).toContain('npm install -D auth@1.7.3')
    expect(checkBetterAuthCli(projectWith(), missing).error?.fix).toContain('pnpm add -D auth@1.7.3')
  })

  it('warns when auth would install a second better-auth', () => {
    const result = checkBetterAuthCli(projectWith('pnpm-lock.yaml'), packages({
      'better-auth': { name: 'better-auth', version: '1.7.3' },
      'auth': { name: 'auth', version: '1.7.11', dependencies: { 'better-auth': '1.7.11' } },
    }))

    expect(result.error).toBeUndefined()
    expect(result.warn?.code).toBe('NUXT_AUTH_CLI_VERSION_MISMATCH')
    expect(result.warn?.message).toContain('auth@1.7.11 installs better-auth@1.7.11, but this app uses better-auth@1.7.3')
    expect(result.warn?.fix).toBe('Run pnpm add -D auth@1.7.3 so auth and better-auth use the same version.')
  })

  it('does not warn when auth accepts a better-auth range', () => {
    const result = checkBetterAuthCli(projectWith(), packages({
      'better-auth': { name: 'better-auth', version: '1.7.3' },
      'auth': { name: 'auth', version: '1.8.0', dependencies: { 'better-auth': '^1.7.3' } },
    }))

    expect(result).toEqual({})
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

describe('loadUserAuthConfig', () => {
  it('reports the original import error once and returns null in dev mode', async () => {
    const errorLog = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const result = await loadUserAuthConfig(join(TEST_DIR, 'nonexistent.ts'), false)
    expect(result).toBeNull()
    expect(errorLog).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('[NUXT_AUTH_CONFIG_LOAD_FAILED]'),
      expect.objectContaining({ code: 'MODULE_NOT_FOUND' }),
    )
  })

  it('throws a config diagnostic with its original cause without logging', async () => {
    const errorLog = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const warningLog = vi.spyOn(consola, 'warn').mockImplementation(() => {})

    await expect(loadUserAuthConfig(join(TEST_DIR, 'nonexistent.ts'), true)).rejects.toMatchObject({
      code: 'NUXT_AUTH_CONFIG_LOAD_FAILED',
      message: expect.stringContaining('Failed to load auth config'),
      cause: expect.objectContaining({ code: 'MODULE_NOT_FOUND' }),
      fix: expect.stringContaining('environment variables'),
    })
    expect(errorLog).not.toHaveBeenCalled()
    expect(warningLog).not.toHaveBeenCalled()
  })

  it('returns config from valid defineServerAuth export', async () => {
    const configPath = join(TEST_DIR, 'valid-config.ts')
    writeFileSync(configPath, `export default defineServerAuth(() => ({ plugins: [] }))`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toEqual({ plugins: [] })
  })

  it('reports an invalid export once with a fix and returns null in dev mode', async () => {
    const errorLog = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const warningLog = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const configPath = join(TEST_DIR, 'invalid-config.ts')
    writeFileSync(configPath, `export default { notAFunction: true }`)
    const result = await loadUserAuthConfig(configPath, false)
    expect(result).toBeNull()
    expect(errorLog).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\[NUXT_AUTH_INVALID_CONFIG_EXPORT\][\s\S]*fix:.*defineServerAuth[\s\S]*schema file was left unchanged/))
    expect(warningLog).not.toHaveBeenCalled()
  })

  it('throws for non-function export when throwOnError=true', async () => {
    const errorLog = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const warningLog = vi.spyOn(consola, 'warn').mockImplementation(() => {})
    const configPath = join(TEST_DIR, 'invalid-config2.ts')
    writeFileSync(configPath, `export default { notAFunction: true }`)
    await expect(loadUserAuthConfig(configPath, true)).rejects.toMatchObject({
      code: 'NUXT_AUTH_INVALID_CONFIG_EXPORT',
      message: expect.stringContaining('must export default defineServerAuth'),
    })
    expect(errorLog).not.toHaveBeenCalled()
    expect(warningLog).not.toHaveBeenCalled()
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

    await expect(project.run()).rejects.toMatchObject({
      code: 'NUXT_AUTH_CONFIG_LOAD_FAILED',
      cause: expect.objectContaining({ code: 'MODULE_NOT_FOUND' }),
    })
    expect(project.logger.error).not.toHaveBeenCalled()
    expect(existsSync(project.schemaPath)).toBe(false)
  })
})

describe('setupBetterAuthSchema when the auth config loads', () => {
  it.each([true, false])('preserves the cause of unexpected schema failures without logging, dev=%s', async (dev) => {
    const project = createSchemaProject({ dev, config: ADDITIONAL_FIELDS_CONFIG })
    const cause = new Error('Plugin schema setup failed')
    vi.spyOn(project.nuxt, 'callHook').mockRejectedValueOnce(cause)
    project.writeExistingSchema(PREVIOUS_SCHEMA)

    await expect(project.run()).rejects.toMatchObject({
      code: 'NUXT_AUTH_SCHEMA_GENERATION_FAILED',
      cause,
    })
    expect(project.logger.error).not.toHaveBeenCalled()
    expect(readFileSync(project.schemaPath, 'utf8')).toBe(PREVIOUS_SCHEMA)
  })

  it('writes a schema carrying the configured additionalFields', async () => {
    const project = createSchemaProject({ dev: true, config: ADDITIONAL_FIELDS_CONFIG })

    await project.run()

    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
  })

  it('loads an extensionless server config path from a JavaScript file', async () => {
    const project = createSchemaProject({ dev: true, config: ADDITIONAL_FIELDS_CONFIG, configExtension: '.js' })

    await project.run()

    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
  })

  it('returns the exact generated model names when plural schema exports collide', async () => {
    const project = createSchemaProject({
      dev: true,
      config: `export default defineServerAuth({
        user: { modelName: 'member' },
        account: { modelName: 'members' },
      })`,
      moduleOptions: { schema: { usePlural: true } },
    })

    await project.run()

    expect(project.getSchemaModelNames()).toMatchObject({
      user: 'members',
      session: 'sessions',
      account: 'memberss',
      verification: 'verifications',
    })
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

const AUTH_API_PATH = createRequire(import.meta.url).resolve('auth/api')
const GENERATOR_HELPERS = ['better-auth/adapters', '@better-auth/core/db/internal']
  .map(name => ({ name, path: createRequire(AUTH_API_PATH).resolve(name) }))

/** Makes `readFileSync` return `transform(contents)` for the file `match` selects. */
function changeInstalledFile(match: (path: string) => boolean, transform: (contents: string) => string) {
  const readFileSyncSpy = vi.mocked(readFileSync)
  const read = readFileSyncSpy.getMockImplementation()!
  readFileSyncSpy.mockImplementation(((path: unknown, ...rest: unknown[]) => {
    const contents = (read as (...args: unknown[]) => string | Buffer)(path, ...rest)
    return typeof path === 'string' && match(path) ? transform(contents.toString()) : contents
  }) as typeof readFileSync)
}

function failCacheIO(method: 'readFile' | 'writeFile') {
  const spy = vi.mocked(fsPromises[method])
  const original = spy.getMockImplementation()!
  spy.mockImplementation(((path: unknown, ...rest: unknown[]) => {
    if (String(path).includes(join('cache', 'better-auth')))
      return Promise.reject(Object.assign(new Error(`EACCES: permission denied, open '${String(path)}'`), { code: 'EACCES' }))
    return (original as (...args: unknown[]) => Promise<unknown>)(path, ...rest)
  }) as never)
}

const USER_FIELD = (attributes: string) => `export default defineServerAuth({ user: { additionalFields: { customField: { type: 'string', required: false${attributes} } } } })`
const SESSION_OWNER = (onDelete: string) => `export default defineServerAuth({ session: { additionalFields: { ownerId: { type: 'string', required: false, references: { model: 'user', field: 'id', onDelete: '${onDelete}' } } } } })`
const SEEN_AT = (onUpdate: string) => `export default defineServerAuth({ user: { additionalFields: { seenAt: { type: 'date', required: false, onUpdate: ${onUpdate} } } } })`
const SECONDARY_STORAGE_CONFIG = `export default defineServerAuth({ secondaryStorage: { get: async () => null, set: async () => {}, delete: async () => {} } })`

interface InvalidationCase {
  label: string
  dialect?: 'sqlite' | 'postgresql'
  config?: string
  change: (project: SchemaProject) => Promise<unknown>
  check: (schema: string) => void
}

function changeConfig(config: string) {
  return (project: SchemaProject) => {
    project.writeConfig(config)
    return project.rerun()
  }
}

describe('setupBetterAuthSchema on a later run of the same project', () => {
  const generate = vi.mocked(authApi.generateDrizzleSchema)
  beforeEach(() => {
    generate.mockClear()
  })
  afterEach(() => {
    vi.mocked(readFileSync).mockReset()
    vi.mocked(fsPromises.readFile).mockReset()
    vi.mocked(fsPromises.writeFile).mockReset()
  })

  /** `nuxi build` removes the generated schema, keeping only the build dir's `cache` folder. */
  function clearGeneratedSchema(project: SchemaProject) {
    rmSync(join(project.schemaPath, '..'), { recursive: true, force: true })
  }

  it('reuses the previous schema without running the generator when nothing changed', async () => {
    const project = createSchemaProject({ dev: false, config: ADDITIONAL_FIELDS_CONFIG })
    await project.rerun()
    const firstSchema = readFileSync(project.schemaPath, 'utf8')
    clearGeneratedSchema(project)

    await project.rerun()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(readFileSync(project.schemaPath, 'utf8')).toBe(firstSchema)
  })

  it.each<InvalidationCase>([
    { label: 'a config column', change: changeConfig(USER_FIELD('').replace('customField', 'otherField')), check: schema => expect(schema).toContain('otherField') },
    { label: 'a model name', change: changeConfig(`export default defineServerAuth({ user: { modelName: 'member' } })`), check: schema => expect(schema).toContain('"member"') },
    { label: 'a field name', change: changeConfig(`export default defineServerAuth({ user: { fields: { email: 'emailAddress' } } })`), check: schema => expect(schema).toContain('emailAddress') },
    { label: 'an index', change: changeConfig(USER_FIELD(', index: true')), check: schema => expect(schema).toContain('user_customField_idx') },
    { label: 'a reference onDelete', config: SESSION_OWNER('cascade'), change: changeConfig(SESSION_OWNER('set null')), check: schema => expect(schema).toContain('onDelete: "set null"') },
    { label: 'an onUpdate callback', config: SEEN_AT('() => new Date()'), change: changeConfig(SEEN_AT('() => new Date(Date.now())')), check: schema => expect(schema).toContain('new Date(Date.now())') },
    { label: 'the id strategy', change: changeConfig(`export default defineServerAuth({
        advanced: { database: { generateId: 'serial' } },
        user: { additionalFields: { customField: { type: 'string', required: false } } },
      })`), check: schema => expect(schema).toContain('autoIncrement: true') },
    { label: 'a plugin added by better-auth:config:extend', change: (project) => {
      vi.spyOn(project.nuxt, 'callHook').mockImplementation((async (_name: string, config: { plugins?: unknown[] }) => {
        config.plugins = [{ id: 'audit', schema: { auditLog: { fields: { action: { type: 'string' } } } } }]
      }) as never)
      return project.rerun()
    }, check: schema => expect(schema).toContain('"auditLog"') },
    { label: 'the secondary storage injection', config: SECONDARY_STORAGE_CONFIG, change: project => project.rerun(undefined, 'custom'), check: schema => expect(schema).not.toContain('export const session ') },
    { label: 'schema.usePlural', change: project => project.rerun({ schema: { usePlural: true } }), check: schema => expect(schema).toContain('"users"') },
    { label: 'schema.casing', change: project => project.rerun({ schema: { casing: 'snake_case' } }), check: schema => expect(schema).toContain('email_verified') },
    { label: 'schema.schemaName', dialect: 'postgresql', change: project => project.rerun({ schema: { schemaName: 'auth' } }), check: schema => expect(schema).toContain('pgSchema("auth")') },
    { label: 'the generator code at the same version', change: (project) => {
      changeInstalledFile(path => path === AUTH_API_PATH, code => `${code}\n// patched`)
      return project.rerun()
    }, check: schema => expect(schema).toContain('customField') },
    ...GENERATOR_HELPERS.map(({ name, path }) => ({
      label: `a generator helper at the same version and path (${name})`,
      change: (project: SchemaProject) => {
        changeInstalledFile(file => file === path, code => `${code}\n// patched in place`)
        return project.rerun()
      },
      check: (schema: string) => expect(schema).toContain('customField'),
    })),
    { label: 'a generator package version', change: (project) => {
      changeInstalledFile(path => /[\\/]prettier[\\/]package\.json$/.test(path), json => JSON.stringify({ ...JSON.parse(json), version: '99.0.0' }))
      return project.rerun()
    }, check: schema => expect(schema).toContain('customField') },
  ])('regenerates the schema when $label changes', async ({ dialect, config, change, check }) => {
    const project = createSchemaProject({ dev: false, dialect, config: config ?? ADDITIONAL_FIELDS_CONFIG })
    await project.rerun()
    clearGeneratedSchema(project)

    await change(project)

    expect(generate).toHaveBeenCalledTimes(2)
    check(readFileSync(project.schemaPath, 'utf8'))
  })

  it.each(GENERATOR_HELPERS)('regenerates without caching when $name cannot be fingerprinted', async ({ path }) => {
    const project = createSchemaProject({ dev: false, config: ADDITIONAL_FIELDS_CONFIG })
    changeInstalledFile(file => file === path, () => {
      throw Object.assign(new Error('EACCES: cannot read generator helper'), { code: 'EACCES' })
    })

    await project.rerun()
    await project.rerun()

    expect(generate).toHaveBeenCalledTimes(2)
    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
    expect(existsSync(project.cacheFile)).toBe(false)
  })

  it.each([
    ['belongs to other inputs', JSON.stringify({ key: 'other-inputs', code: PREVIOUS_SCHEMA })],
    ['is not JSON', '{"key": "trunc'],
  ])('regenerates the schema when the cache entry %s', async (_label, entry) => {
    const project = createSchemaProject({ dev: false, config: ADDITIONAL_FIELDS_CONFIG })
    mkdirSync(join(project.cacheFile, '..'), { recursive: true })
    writeFileSync(project.cacheFile, entry)

    await project.rerun()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
  })

  it('regenerates the schema when the cache cannot be read', async () => {
    const project = createSchemaProject({ dev: false, config: ADDITIONAL_FIELDS_CONFIG })
    await project.rerun()
    failCacheIO('readFile')

    await project.rerun()

    expect(generate).toHaveBeenCalledTimes(2)
    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
  })

  it('writes the schema and leaves no cache file when the cache cannot be written', async () => {
    const project = createSchemaProject({ dev: false, config: ADDITIONAL_FIELDS_CONFIG })
    failCacheIO('writeFile')

    await project.rerun()

    expect(readFileSync(project.schemaPath, 'utf8')).toContain('customField')
    expect(readdirSync(join(project.cacheFile, '..'))).toEqual([])
  })
})
