import type { BetterAuthOptions } from 'better-auth'
import type { generateDrizzleSchema as GenerateDrizzleSchema } from 'auth/api'
import { existsSync, readFileSync } from 'node:fs'
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

function readInstalledPackage(name: string): PackageJson | undefined {
  let entry: string
  try {
    entry = createRequire(import.meta.url).resolve(name === 'auth' ? 'auth/api' : name)
  }
  catch {
    return undefined
  }
  // Neither package exports its package.json, so walk up from the resolved entry.
  for (let dir = dirname(entry); dir !== dirname(dir); dir = dirname(dir)) {
    const file = join(dir, 'package.json')
    if (!existsSync(file))
      continue
    const pkg = JSON.parse(readFileSync(file, 'utf8')) as PackageJson
    if (pkg.name === name)
      return pkg
  }
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

export async function generateDrizzleSchema(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions?: SchemaOptions): Promise<string> {
  const { generateDrizzleSchema } = await import('auth/api')
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

  const result = await generateDrizzleSchema({
    adapter: adapter as unknown as DrizzleSchemaInput['adapter'],
    options: options as unknown as DrizzleSchemaInput['options'],
  })
  if (!result.code) {
    throw diagnostics.NUXT_AUTH_EMPTY_SCHEMA({ dialect })
  }
  return result.code
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
