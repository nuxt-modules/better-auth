import type { DBAdapter } from '@better-auth/cli/api'
import type { BetterAuthOptions } from 'better-auth'
import { generateDrizzleSchema as _generateDrizzleSchema } from '@better-auth/cli/api'
import { consola } from 'consola'

export type CasingOption = 'camelCase' | 'snake_case'
export interface SchemaOptions { usePlural?: boolean, useUuid?: boolean, casing?: CasingOption }

type Dialect = 'sqlite' | 'postgresql' | 'mysql'
type Provider = 'sqlite' | 'pg' | 'mysql'

// Minimal interface matching what _generateDrizzleSchema actually uses from adapter
interface SchemaGeneratorAdapter {
  id: 'drizzle'
  options: { provider: Provider, camelCase: boolean, adapterConfig: { usePlural: boolean } }
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
      adapterConfig: { usePlural: schemaOptions?.usePlural ?? false },
    },
  }

  const result = await _generateDrizzleSchema({ adapter: adapter as unknown as DBAdapter, options })
  if (!result.code) {
    throw new Error(`Schema generation returned empty result for ${dialect}`)
  }
  return result.code
}

// Type for cached runtime helper with reference counting
interface RuntimeDefineServerAuthFn { (...args: unknown[]): unknown, _count: number }

declare global {
  // eslint-disable-next-line vars-on-top
  var __nuxtBetterAuthDefineServerAuth: RuntimeDefineServerAuthFn | undefined
  // eslint-disable-next-line vars-on-top
  var defineServerAuth: RuntimeDefineServerAuthFn | undefined
}

export async function loadUserAuthConfig(configPath: string, throwOnError = false): Promise<Partial<BetterAuthOptions>> {
  const { createJiti } = await import('jiti')
  const { defineServerAuth: runtimeDefineServerAuth } = await import('./runtime/config')
  const jiti = createJiti(import.meta.url, { interopDefault: true, moduleCache: false })

  if (!globalThis.__nuxtBetterAuthDefineServerAuth) {
    (runtimeDefineServerAuth as unknown as RuntimeDefineServerAuthFn)._count = 0
    globalThis.__nuxtBetterAuthDefineServerAuth = runtimeDefineServerAuth as unknown as RuntimeDefineServerAuthFn
  }
  if (!globalThis.defineServerAuth) {
    globalThis.defineServerAuth = globalThis.__nuxtBetterAuthDefineServerAuth
  }
  globalThis.__nuxtBetterAuthDefineServerAuth!._count++

  try {
    const mod = await jiti.import(configPath) as { default?: unknown }
    const configFn = mod.default
    if (typeof configFn === 'function') {
      return configFn({ runtimeConfig: {}, db: null })
    }
    consola.warn('[@onmax/nuxt-better-auth] auth.config.ts does not export default. Expected: export default defineServerAuth(...)')
    if (throwOnError) {
      throw new Error('auth.config.ts must export default defineServerAuth(...)')
    }
    return {}
  }
  catch (error) {
    if (throwOnError) {
      throw new Error(`Failed to load auth config: ${error instanceof Error ? error.message : error}`)
    }
    consola.error('[@onmax/nuxt-better-auth] Failed to load auth config for schema generation. Schema may be incomplete:', error)
    return {}
  }
  finally {
    const sharedDefineServerAuth = globalThis.__nuxtBetterAuthDefineServerAuth
    if (sharedDefineServerAuth) {
      sharedDefineServerAuth._count--
      if (!sharedDefineServerAuth._count) {
        globalThis.__nuxtBetterAuthDefineServerAuth = undefined
        if (globalThis.defineServerAuth === sharedDefineServerAuth) {
          globalThis.defineServerAuth = undefined
        }
      }
    }
  }
}
