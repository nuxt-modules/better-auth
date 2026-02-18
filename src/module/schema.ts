import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthPlugin } from 'better-auth'
import type { ConsolaInstance } from 'consola'
import type { BetterAuthModuleOptions } from '../runtime/config'
import type { NuxtHubOptions } from './hub'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { addTemplate } from '@nuxt/kit'
import { join } from 'pathe'
import { generateDrizzleSchema, loadUserAuthConfig } from '../schema-generator'
import { getHubCasing, getHubDialect } from './hub'

interface SchemaContext {
  nuxt: Nuxt
  serverConfigPath: string
}

type HubSecondaryStorageMode = BetterAuthModuleOptions['hubSecondaryStorage']

export function resolveSchemaSecondaryStorageInjection(
  hubSecondaryStorage: HubSecondaryStorageMode,
  userHasSecondaryStorage: boolean,
  isProduction: boolean,
): { inject: boolean, warn?: string, error?: string } {
  if (hubSecondaryStorage === true)
    return { inject: true }

  if (hubSecondaryStorage !== 'custom')
    return { inject: false }

  if (userHasSecondaryStorage)
    return { inject: true }

  const message = '[nuxt-better-auth] hubSecondaryStorage: "custom" requires secondaryStorage in defineServerAuth() to omit the session table from the generated schema.'
  if (isProduction)
    return { inject: false, error: message }

  return { inject: false, warn: message }
}

function isInsideNodeModules(path: string): boolean {
  return path.split(/[\\/]/).includes('node_modules')
}

export function resolveHubSchemaPath(
  buildDir: string,
  rootDir: string,
  dialect: string,
  exists: (path: string) => boolean = existsSync,
): string | null {
  const rootTsPath = join(rootDir, '.nuxt', 'better-auth', `schema.${dialect}.ts`)
  if (isInsideNodeModules(buildDir) && exists(rootTsPath))
    return rootTsPath

  const tsPath = join(buildDir, 'better-auth', `schema.${dialect}.ts`)
  if (exists(tsPath))
    return tsPath

  const mjsPath = join(buildDir, 'better-auth', `schema.${dialect}.mjs`)
  if (exists(mjsPath))
    return mjsPath

  return null
}

async function loadAuthOptions(context: SchemaContext) {
  const isProduction = !context.nuxt.options.dev
  const configFile = `${context.serverConfigPath}.ts`
  const userConfig = await loadUserAuthConfig(configFile, isProduction)

  const extendedConfig: { plugins?: BetterAuthPlugin[] } = {}
  await context.nuxt.callHook('better-auth:config:extend', extendedConfig)

  const plugins = [...(userConfig.plugins || []), ...(extendedConfig.plugins || [])]
  return { userConfig, plugins }
}

export async function setupBetterAuthSchema(
  nuxt: Nuxt,
  serverConfigPath: string,
  options: BetterAuthModuleOptions,
  consola: ConsolaInstance,
  hubSecondaryStorage: HubSecondaryStorageMode,
): Promise<void> {
  const hub = (nuxt.options as { hub?: NuxtHubOptions }).hub
  const dialect = getHubDialect(hub)
  if (!dialect || !['sqlite', 'postgresql', 'mysql'].includes(dialect)) {
    consola.warn(`Unsupported database dialect: ${dialect}`)
    return
  }

  const context: SchemaContext = { nuxt, serverConfigPath }

  try {
    const { userConfig, plugins } = await loadAuthOptions(context)
    const userHasSecondaryStorage = userConfig.secondaryStorage != null
    const secondaryStorageResolution = resolveSchemaSecondaryStorageInjection(hubSecondaryStorage, userHasSecondaryStorage, !nuxt.options.dev)
    if (secondaryStorageResolution.error)
      throw new Error(secondaryStorageResolution.error)
    if (secondaryStorageResolution.warn)
      consola.warn(secondaryStorageResolution.warn)

    const authOptions = {
      ...userConfig,
      plugins,
      secondaryStorage: secondaryStorageResolution.inject
        ? { get: async (_key: string) => null, set: async (_key: string, _value: string, _ttl?: number) => {}, delete: async (_key: string) => {} }
        : undefined,
    }

    const hubCasing = getHubCasing(hub)
    const schemaOptions = { ...options.schema, useUuid: userConfig.advanced?.database?.generateId === 'uuid', casing: options.schema?.casing ?? hubCasing }
    const schemaCode = await generateDrizzleSchema(authOptions, dialect as 'sqlite' | 'postgresql' | 'mysql', schemaOptions)

    const schemaDir = join(nuxt.options.buildDir, 'better-auth')
    const schemaPathTs = join(schemaDir, `schema.${dialect}.ts`)
    const schemaPathMjs = join(schemaDir, `schema.${dialect}.mjs`)

    await mkdir(schemaDir, { recursive: true })
    await writeFile(schemaPathTs, schemaCode)
    await writeFile(schemaPathMjs, schemaCode)

    if (isInsideNodeModules(nuxt.options.buildDir)) {
      const rootSchemaDir = join(nuxt.options.rootDir, '.nuxt', 'better-auth')
      const rootSchemaPathTs = join(rootSchemaDir, `schema.${dialect}.ts`)
      await mkdir(rootSchemaDir, { recursive: true })
      await writeFile(rootSchemaPathTs, schemaCode)
    }

    addTemplate({ filename: `better-auth/schema.${dialect}.ts`, getContents: () => schemaCode, write: true })
    addTemplate({ filename: `better-auth/schema.${dialect}.mjs`, getContents: () => schemaCode, write: true })

    consola.info(`Generated ${dialect} schema (.ts + .mjs)`)

    const nuxtWithHubHooks = nuxt as Nuxt & { hook: (name: string, cb: (arg: { paths: string[], dialect: string }) => void) => void }
    nuxtWithHubHooks.hook('hub:db:schema:extend', ({ paths, dialect: hookDialect }) => {
      const schemaPath = resolveHubSchemaPath(nuxt.options.buildDir, nuxt.options.rootDir, hookDialect)
      if (schemaPath)
        paths.unshift(schemaPath)
    })
  }
  catch (error) {
    const isProduction = !nuxt.options.dev
    if (isProduction)
      throw error

    consola.error('Failed to generate schema:', error)
    // NuxtHub provider now relies on the generated schema file.
    throw error
  }
}
