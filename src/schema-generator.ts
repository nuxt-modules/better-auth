import type { BetterAuthOptions } from 'better-auth'
import { existsSync } from 'node:fs'
import { generateDrizzleSchema as _generateDrizzleSchema } from 'auth/api'
import { consola } from 'consola'
import { join } from 'pathe'
import type { SchemaCasing } from './runtime/config'

export interface SchemaOptions { usePlural?: boolean, useUuid?: boolean, casing?: SchemaCasing, schemaName?: string }

type Dialect = 'sqlite' | 'postgresql' | 'mysql'
type Provider = 'sqlite' | 'pg' | 'mysql'
type DrizzleSchemaInput = Parameters<typeof _generateDrizzleSchema>[0]

// Minimal interface matching what _generateDrizzleSchema actually uses from adapter
interface SchemaGeneratorAdapter {
  id: 'drizzle'
  options: { provider: Provider, camelCase: boolean, schemaName?: string, adapterConfig: { usePlural: boolean } }
}

function dialectToProvider(dialect: Dialect): Provider {
  return dialect === 'postgresql' ? 'pg' : dialect
}

export async function generateDrizzleSchema(authOptions: BetterAuthOptions, dialect: Dialect, schemaOptions?: SchemaOptions): Promise<string> {
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

  const result = await _generateDrizzleSchema({
    adapter: adapter as unknown as DrizzleSchemaInput['adapter'],
    options: options as unknown as DrizzleSchemaInput['options'],
  })
  if (!result.code) {
    throw new Error(`Schema generation returned empty result for ${dialect}`)
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

export async function loadUserAuthConfig(
  configPath: string,
  throwOnError = false,
  alias?: Record<string, string>,
  runtimeConfig: unknown = {},
  rootDir?: string,
): Promise<Partial<BetterAuthOptions>> {
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
    consola.warn('[@nuxtjs/better-auth] auth.config.ts does not export default. Expected: export default defineServerAuth(...)')
    if (throwOnError) {
      throw new Error('auth.config.ts must export default defineServerAuth(...)')
    }
    return {}
  }
  catch (error) {
    if (throwOnError) {
      throw new Error(`Failed to load auth config: ${error instanceof Error ? error.message : error}`)
    }
    consola.error('[@nuxtjs/better-auth] Failed to load auth config for schema generation. Schema may be incomplete:', error)
    return {}
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
