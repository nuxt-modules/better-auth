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

const NODE_MODULES_SEGMENT_RE = /[\\/]/
const CONFIG_EXTENSION_RE = /\.[cm]?[jt]s$/

export function resolveSchemaSecondaryStorageInjection(
  hubSecondaryStorage: HubSecondaryStorageMode,
  userHasSecondaryStorage: boolean,
  isProduction: boolean,
): { inject: boolean, warn?: string, error?: string } {
  if (hubSecondaryStorage === true)
    return { inject: false }

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
  return path.split(NODE_MODULES_SEGMENT_RE).includes('node_modules')
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

export function registerNuxtHubSchemaHook(
  nuxt: Nuxt,
  finishSetup: () => Promise<boolean>,
): void {
  const nuxtWithHubHooks = nuxt as Nuxt & { hook: (name: string, cb: (arg: { paths: string[], dialect: string }) => Promise<void>) => void }
  nuxtWithHubHooks.hook('hub:db:schema:extend', async ({ paths, dialect }) => {
    const hasHubSchema = await finishSetup()
    if (!hasHubSchema)
      return

    const schemaPath = resolveHubSchemaPath(nuxt.options.buildDir, nuxt.options.rootDir, dialect)
    if (schemaPath && !paths.includes(schemaPath))
      paths.unshift(schemaPath)
  })
}

async function loadAuthOptions(context: SchemaContext) {
  const isProduction = !context.nuxt.options.dev
  const configFile = CONFIG_EXTENSION_RE.test(context.serverConfigPath) ? context.serverConfigPath : `${context.serverConfigPath}.ts`
  const alias = Object.fromEntries(
    Object.entries(context.nuxt.options.alias)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, value as string]),
  )
  const userConfig = await loadUserAuthConfig(configFile, isProduction, alias, context.nuxt.options.runtimeConfig, context.nuxt.options.rootDir)
  if (!userConfig)
    return null

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
    const authConfig = await loadAuthOptions(context)
    // A config that failed to load carries none of the user's additionalFields or
    // plugin columns. Regenerating from it would overwrite a correct schema file
    // with a core-tables-only one, so leave whatever is already on disk alone.
    if (!authConfig)
      return

    const { userConfig, plugins } = authConfig
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
        ? {
            delete: async (_key: string) => {},
            get: async (_key: string) => null,
            getAndDelete: async (_key: string) => null,
            increment: async (_key: string, _ttl: number) => 1,
            set: async (_key: string, _value: string, _ttl?: number) => {},
          }
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
