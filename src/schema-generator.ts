import type { BetterAuthOptions } from 'better-auth'
import type { generateDrizzleSchema as GenerateDrizzleSchema } from 'auth/api'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { consola } from 'consola'
import { Diagnostic, formatDiagnostic } from 'nostics'
import { dirname, join } from 'pathe'
import { diagnostics } from './module/diagnostics'
import type { SchemaCasing } from './runtime/config'

export interface SchemaOptions { usePlural?: boolean, useUuid?: boolean, casing?: SchemaCasing, schemaName?: string }

type Dialect = 'sqlite' | 'postgresql' | 'mysql'
type Provider = 'sqlite' | 'pg' | 'mysql'
type DrizzleSchemaInput = Parameters<typeof GenerateDrizzleSchema>[0]

// Minimal interface matching what generateDrizzleSchema actually uses from adapter
interface SchemaGeneratorAdapter {
  id: 'drizzle'
  options: { provider: Provider, camelCase: boolean, schemaName?: string, adapterConfig: { usePlural: boolean } }
}

function dialectToProvider(dialect: Dialect): Provider {
  return dialect === 'postgresql' ? 'pg' : dialect
}

export interface PackageJson { name?: string, version?: string, dependencies?: Record<string, string> }

const EXACT_VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/
const LOCKFILES = [['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn'], ['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['package-lock.json', 'npm']] as const

function findInstalledPackage(name: string, parent: string): { dir: string, pkg: PackageJson } | undefined {
  let entry: string
  try {
    entry = createRequire(parent).resolve(name === 'auth' ? 'auth/api' : name)
  }
  catch {
    return undefined
  }
  // These packages don't export their package.json, so walk up from the resolved entry.
  for (let dir = dirname(entry); dir !== dirname(dir); dir = dirname(dir)) {
    const file = join(dir, 'package.json')
    if (!existsSync(file))
      continue
    const pkg = JSON.parse(readFileSync(file, 'utf8')) as PackageJson
    if (pkg.name === name)
      return { dir, pkg }
  }
}

function readInstalledPackage(name: string): PackageJson | undefined {
  return findInstalledPackage(name, import.meta.url)?.pkg
}

function devInstallCommand(spec: string, rootDir: string): string {
  const agent = process.env.npm_config_user_agent?.split('/')[0]
  const manager = LOCKFILES.find(([file]) => existsSync(join(rootDir, file)))?.[1]
    ?? LOCKFILES.find(([, name]) => name === agent)?.[1]
    ?? 'npm'
  return manager === 'npm' ? `npm install -D ${spec}` : `${manager} add -D ${spec}`
}

/**
 * `auth` is the Better Auth CLI. It pins an exact `better-auth`, so a mismatched
 * version installs a second copy of better-auth and @better-auth/core next to the
 * app's, which surfaces as incompatible Better Auth types.
 */
export function checkBetterAuthCli(
  rootDir: string,
  readPackage: (name: 'auth' | 'better-auth') => PackageJson | undefined = readInstalledPackage,
): { error?: Diagnostic, warn?: Diagnostic } {
  const betterAuthVersion = readPackage('better-auth')?.version
  const spec = betterAuthVersion ? `auth@${betterAuthVersion}` : 'auth'
  const cli = readPackage('auth')
  if (!cli)
    return { error: diagnostics.NUXT_AUTH_CLI_MISSING({ command: devInstallCommand(spec, rootDir) }) }

  const cliBetterAuthVersion = cli.dependencies?.['better-auth']
  if (betterAuthVersion && cliBetterAuthVersion && EXACT_VERSION_RE.test(cliBetterAuthVersion) && cliBetterAuthVersion !== betterAuthVersion)
    return { warn: diagnostics.NUXT_AUTH_CLI_VERSION_MISMATCH({ cliVersion: cli.version ?? cliBetterAuthVersion, cliBetterAuthVersion, betterAuthVersion, command: devInstallCommand(spec, rootDir) }) }

  return {}
}

function resolveDrizzleSchemaInput(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions?: SchemaOptions) {
  const provider = dialectToProvider(dialect)

  const options: BetterAuthOptions = {
    ...authOptions,
    advanced: {
      ...authOptions.advanced,
      database: {
        ...authOptions.advanced?.database,
        ...(schemaOptions?.useUuid && { generateId: 'uuid' }),
      },
    },
  }

  const adapter: SchemaGeneratorAdapter = {
    id: 'drizzle',
    options: {
      provider,
      camelCase: schemaOptions?.casing !== 'snake_case',
      schemaName: schemaOptions?.schemaName,
      adapterConfig: { usePlural: schemaOptions?.usePlural ?? false },
    },
  }

  return { options, adapter }
}

export async function generateDrizzleSchema(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions?: SchemaOptions): Promise<string> {
  const { generateDrizzleSchema } = await import('auth/api')
  const { options, adapter } = resolveDrizzleSchemaInput(authOptions, dialect, schemaOptions)
  const result = await generateDrizzleSchema({
    adapter: adapter as unknown as DrizzleSchemaInput['adapter'],
    options: options as unknown as DrizzleSchemaInput['options'],
  })
  if (!result.code) {
    throw diagnostics.NUXT_AUTH_EMPTY_SCHEMA({ dialect })
  }
  return result.code
}

// Bump when this module changes how it builds the generator input or uses its output.
const SCHEMA_CACHE_REVISION = 1

// Packages whose code produces or formats the generated schema.
const SCHEMA_GENERATOR_PACKAGES = ['auth', 'better-auth', '@better-auth/core', 'prettier']

function hashPackageContents(dir: string): string {
  const hash = createHash('sha256')
  function visit(relativeDir: string) {
    const entries = readdirSync(join(dir, relativeDir), { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git')
        continue
      const relativePath = join(relativeDir, entry.name)
      if (entry.isDirectory()) {
        visit(relativePath)
      }
      else {
        hash.update(relativePath).update('\0')
        hash.update(createHash('sha256').update(readFileSync(join(dir, relativePath))).digest())
      }
    }
  }
  visit('')
  return hash.digest('hex')
}

/**
 * Identifies the code that turns auth tables into the schema. The `auth/api` bundle holds
 * the whole Drizzle generator, so its contents are hashed and an in-place patch counts.
 * Hash the Better Auth helper package contents too: linked/workspace edits can change
 * table, model and index generation without changing the package version or directory.
 */
function getSchemaGeneratorIdentity(): string[] {
  const authApi = createRequire(import.meta.url).resolve('auth/api')
  const generatorHash = createHash('sha256').update(readFileSync(authApi)).digest('hex')
  const packages = SCHEMA_GENERATOR_PACKAGES.map((name) => {
    const installed = findInstalledPackage(name, authApi)
    const contentHash = installed && (name === 'better-auth' || name === '@better-auth/core')
      ? hashPackageContents(installed.dir)
      : ''
    return `${name}@${installed?.pkg.version} ${installed?.dir} ${contentHash}`
  })
  return [`revision ${SCHEMA_CACHE_REVISION}`, generatorHash, ...packages]
}

// Prefixes every primitive with its type so values that JSON would merge (NaN and
// null, a function and its source string, undefined and null in arrays) stay distinct.
function tagSchemaValue(_key: string, value: unknown): unknown {
  switch (typeof value) {
    case 'string': return `s:${value}`
    case 'number': return Number.isFinite(value) ? value : `n:${value}`
    case 'bigint': return `b:${value}`
    case 'function': return `f:${String(value)}`
    case 'symbol': return `y:${String(value)}`
    case 'undefined': return 'u:'
    default: return value
  }
}

/**
 * Hashes everything the `auth/api` Drizzle generator reads: the resolved auth tables
 * (plugin and additionalFields columns included), the id strategy, the adapter options,
 * and the generator code. Returns undefined when that can't be computed, for example
 * when the tables contain a circular reference.
 */
async function getDrizzleSchemaKey(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions?: SchemaOptions): Promise<string | undefined> {
  const { getAuthTables } = await import('better-auth/db')
  const { options, adapter } = resolveDrizzleSchemaInput(authOptions, dialect, schemaOptions)
  try {
    const input = JSON.stringify([getAuthTables(options), options.advanced?.database?.generateId, adapter.options, getSchemaGeneratorIdentity()], tagSchemaValue)
    return createHash('sha256').update(input).digest('hex')
  }
  catch {
    return undefined
  }
}

async function readCachedSchema(cacheFile: string, key: string): Promise<string | undefined> {
  try {
    const entry = JSON.parse(await readFile(cacheFile, 'utf8')) as { key?: unknown, code?: unknown }
    return entry.key === key && typeof entry.code === 'string' ? entry.code : undefined
  }
  catch {
    return undefined
  }
}

// The cache only saves time, so a read-only or unwritable build dir must not fail the
// build. Writing a temp file and renaming it keeps concurrent builds from mixing one
// run's key with another's code.
async function writeCachedSchema(cacheFile: string, key: string, code: string): Promise<void> {
  const tempFile = `${cacheFile}.${randomUUID()}.tmp`
  try {
    await mkdir(dirname(cacheFile), { recursive: true })
    await writeFile(tempFile, JSON.stringify({ key, code }))
    await rename(tempFile, cacheFile)
  }
  catch {
    await rm(tempFile, { force: true }).catch(() => {})
  }
}

/**
 * `generateDrizzleSchema` imports `auth/api`, which loads prettier and the Prisma
 * parser, then formats the whole schema. Reuse the code stored in `cacheFile` when the
 * generator inputs match the previous run, and regenerate otherwise.
 */
export async function generateCachedDrizzleSchema(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions: SchemaOptions | undefined, cacheFile: string): Promise<string> {
  const key = await getDrizzleSchemaKey(authOptions, dialect, schemaOptions)
  const cached = key && await readCachedSchema(cacheFile, key)
  if (cached)
    return cached

  const code = await generateDrizzleSchema(authOptions, dialect, schemaOptions)
  if (key)
    await writeCachedSchema(cacheFile, key, code)
  return code
}

// Type for cached runtime helper with reference counting
interface RuntimeDefineServerAuthFn { (...args: unknown[]): unknown, _count: number }
interface SchemaGeneratorGlobals {
  __nuxtBetterAuthDefineServerAuth?: RuntimeDefineServerAuthFn
  defineServerAuth?: RuntimeDefineServerAuthFn
}

function loadLocalEnv(rootDir?: string): void {
  if (!rootDir)
    return

  const envPath = join(rootDir, '.env.local')
  if (!existsSync(envPath))
    return

  process.loadEnvFile(envPath)
}

declare global {
  // eslint-disable-next-line vars-on-top
  var __nuxtBetterAuthDefineServerAuth: RuntimeDefineServerAuthFn | undefined
}

const SCHEMA_NOT_REGENERATED_MESSAGE = 'The schema was not regenerated and any existing generated schema file was left unchanged.'

/**
 * Loads the user's `auth.config.ts`.
 *
 * Returns `null` when the config could not be loaded and `throwOnError` is
 * false. `null` is distinct from an empty-but-valid config (`{}`): callers must
 * treat it as "no config available" and leave anything derived from a previous
 * successful load alone, rather than regenerating it from nothing.
 */
export async function loadUserAuthConfig(
  configPath: string,
  throwOnError = false,
  alias?: Record<string, string>,
  runtimeConfig: unknown = {},
  rootDir?: string,
): Promise<Partial<BetterAuthOptions> | null> {
  const { createJiti } = await import('jiti')
  const { defineServerAuth: runtimeDefineServerAuth } = await import('./runtime/config')
  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false, alias })
  const schemaGlobals = globalThis as typeof globalThis & SchemaGeneratorGlobals

  if (!schemaGlobals.__nuxtBetterAuthDefineServerAuth) {
    (runtimeDefineServerAuth as unknown as RuntimeDefineServerAuthFn)._count = 0
    schemaGlobals.__nuxtBetterAuthDefineServerAuth = runtimeDefineServerAuth as unknown as RuntimeDefineServerAuthFn
  }
  if (!schemaGlobals.defineServerAuth) {
    schemaGlobals.defineServerAuth = schemaGlobals.__nuxtBetterAuthDefineServerAuth
  }
  schemaGlobals.__nuxtBetterAuthDefineServerAuth!._count++

  try {
    loadLocalEnv(rootDir)
    const mod = await jiti.import(configPath) as { default?: unknown }
    const configFn = mod.default
    if (typeof configFn === 'function') {
      return configFn({ runtimeConfig, db: null })
    }
    throw diagnostics.NUXT_AUTH_INVALID_CONFIG_EXPORT({ configPath })
  }
  catch (error) {
    const diagnostic = error instanceof Diagnostic
      ? error
      : diagnostics.NUXT_AUTH_CONFIG_LOAD_FAILED({ configPath, cause: error })
    if (throwOnError)
      throw diagnostic

    const message = `${formatDiagnostic(diagnostic)}\n${SCHEMA_NOT_REGENERATED_MESSAGE}`
    if (diagnostic.cause === undefined)
      consola.error(message)
    else
      consola.error(message, diagnostic.cause)
    return null
  }
  finally {
    const sharedDefineServerAuth = schemaGlobals.__nuxtBetterAuthDefineServerAuth
    if (sharedDefineServerAuth) {
      sharedDefineServerAuth._count--
      if (!sharedDefineServerAuth._count) {
        schemaGlobals.__nuxtBetterAuthDefineServerAuth = undefined
        if (schemaGlobals.defineServerAuth === sharedDefineServerAuth) {
          schemaGlobals.defineServerAuth = undefined
        }
      }
    }
  }
}
