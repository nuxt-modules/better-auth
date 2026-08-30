import type { Nuxt } from '@nuxt/schema'
import type { BetterAuthModuleOptions, ModuleDatabaseProviderId } from '../runtime/config'
import type {
  BetterAuthDatabaseProviderBuildContext,
  BetterAuthDatabaseProviderDefinition,
  BetterAuthDatabaseProviderEnabledContext,
  BetterAuthPluginSources,
} from '../types/hooks'
import type { AuthConfigDescriptor } from './config-paths'
import type { NuxtHubOptions } from './hub'
import { hasNuxtModule } from '@nuxt/kit'
import { dirname } from 'pathe'
import { resolveDatabaseProvider } from '../database-provider'
import { resolveAuthConfigDescriptors, resolveAuthPluginSources } from './config-paths'
import { getHubCasing, getHubDialect } from './hub'
import { setupRuntimeConfig } from './runtime'
import { buildDatabaseCode } from './templates'

export interface ResolvedAuthModuleSetup {
  clientOnly: boolean
  configs: {
    server: AuthConfigDescriptor
    client: AuthConfigDescriptor
  }
  aliases: {
    '#auth/server'?: string
    '#auth/client': string
  }
  pluginSources: {
    server: string[]
    client: string[]
  }
  hub: {
    hasNuxtHub: boolean
    options?: NuxtHubOptions
    hasHubDbAvailable: boolean
  }
  database: {
    providerId: ModuleDatabaseProviderId
    hasHubDb: boolean
    providerDefinition?: BetterAuthDatabaseProviderDefinition
    buildContext?: BetterAuthDatabaseProviderBuildContext
  }
  runtime: {
    useHubKV: boolean
    secondaryStorageEnabled: boolean
  }
  prepareTypes?: {
    serverDir: string
    hasHubDb: boolean
  }
  serverTypes?: {
    serverConfigPath: string
    hasHubDb: boolean
  }
  sharedTypes: {
    runtimeTypesAugmentPath: string
    clientConfigPath: string
  }
  schemaGeneration?: {
    serverConfigPath: string
    hubSecondaryStorage: BetterAuthModuleOptions['hubSecondaryStorage']
    externalizeNuxtHubDatabase: boolean
  }
}

interface ResolveAuthModuleSetupInput {
  nuxt: Nuxt
  options: BetterAuthModuleOptions
  runtimeTypesAugmentPath: string
  consola: Parameters<typeof setupRuntimeConfig>[0]['consola']
  registeredPluginSources?: BetterAuthPluginSources
}

interface ResolveAuthModuleSetupDependencies {
  configExists?: (path: string) => boolean
  hasNuxtModule?: typeof hasNuxtModule
}

function assertConfigPresence(configs: ResolvedAuthModuleSetup['configs'], clientOnly: boolean): void {
  if (!clientOnly && !configs.server.exists)
    throw new Error(`[nuxt-better-auth] Missing ${configs.server.file}.ts - export default defineServerAuth(...)`)

  if (!configs.client.exists)
    throw new Error(`[nuxt-better-auth] Missing ${configs.client.file}.ts - export default defineClientAuth(...)`)
}

function createDefaultDatabaseProviders(
  buildContext: BetterAuthDatabaseProviderBuildContext,
): Record<string, BetterAuthDatabaseProviderDefinition> {
  return {
    nuxthub: {
      priority: 100,
      isEnabled: ({ hasHubDbAvailable: enabled }) => enabled,
      buildDatabaseCode: () => buildDatabaseCode({
        provider: 'nuxthub',
        ...buildContext,
      }),
    },
    none: {
      priority: 0,
      buildDatabaseCode: () => buildDatabaseCode({
        provider: 'none',
        ...buildContext,
      }),
    },
  }
}

export function collectAuthRouteRules(nuxt: Nuxt): Record<string, { auth: unknown }> {
  const runtimeRouteRulesSource = (
    (nuxt.options as { nitro?: { routeRules?: Record<string, unknown> } }).nitro?.routeRules
    || (nuxt.options as { routeRules?: Record<string, unknown> }).routeRules
    || {}
  ) as Record<string, unknown>

  return Object.fromEntries(
    Object.entries(runtimeRouteRulesSource).flatMap(([path, rule]) => {
      if (!rule || typeof rule !== 'object' || !('auth' in rule))
        return []

      return [[path, { auth: (rule as { auth?: unknown }).auth }]]
    }),
  )
}

export async function resolveAuthModuleSetup(
  input: ResolveAuthModuleSetupInput,
  dependencies: ResolveAuthModuleSetupDependencies = {},
): Promise<ResolvedAuthModuleSetup> {
  const { nuxt, options, runtimeTypesAugmentPath, consola } = input
  const hasNuxtModuleFn = dependencies.hasNuxtModule ?? hasNuxtModule
  const clientOnly = options.clientOnly ?? false

  const configs = resolveAuthConfigDescriptors(nuxt, {
    server: options.serverConfig,
    client: options.clientConfig,
  }, {
    configExists: dependencies.configExists,
  })

  assertConfigPresence(configs, clientOnly)

  const pluginSources = resolveAuthPluginSources(nuxt)
  pluginSources.server.push(...(input.registeredPluginSources?.server || []))
  pluginSources.client.push(...(input.registeredPluginSources?.client || []))

  const aliases: ResolvedAuthModuleSetup['aliases'] = {
    '#auth/server': clientOnly ? undefined : configs.server.path,
    '#auth/client': configs.client.path,
  }

  if (aliases['#auth/server'])
    nuxt.options.alias['#auth/server'] = aliases['#auth/server']
  nuxt.options.alias['#auth/client'] = aliases['#auth/client']

  const hasNuxtHub = hasNuxtModuleFn('@nuxthub/core', nuxt)
  const hub = hasNuxtHub ? (nuxt.options as { hub?: NuxtHubOptions }).hub : undefined
  const hasHubDbAvailable = !clientOnly && hasNuxtHub && !!hub?.db
  const hubDialect = getHubDialect(hub) ?? 'sqlite'
  const usePlural = options.schema?.usePlural ?? false
  const camelCase = (options.schema?.casing ?? getHubCasing(hub)) !== 'snake_case'

  let providerId: ModuleDatabaseProviderId = 'none'
  let providerDefinition: BetterAuthDatabaseProviderDefinition | undefined

  if (!clientOnly) {
    const buildContext: BetterAuthDatabaseProviderBuildContext = { hubDialect, usePlural, camelCase }
    const providers = createDefaultDatabaseProviders(buildContext)
    const enabledContext: BetterAuthDatabaseProviderEnabledContext = {
      nuxt,
      options,
      clientOnly,
      hasHubDbAvailable,
    }

    await nuxt.callHook('better-auth:database:providers', providers)

    const resolvedProvider = resolveDatabaseProvider({
      providers,
      context: enabledContext,
    })

    providerId = resolvedProvider.id
    providerDefinition = resolvedProvider.definition
  }

  const runtime = setupRuntimeConfig({
    nuxt,
    options,
    clientOnly,
    databaseProvider: providerId,
    hasNuxtHub,
    hub,
    consola,
  })

  if (runtime.useHubKV && !nuxt.options.alias['hub:kv']) {
    throw new Error('[nuxt-better-auth] hub:kv not found. Ensure @nuxthub/core is loaded before this module and hub.kv is enabled.')
  }

  const hasHubDb = providerId === 'nuxthub'
  if (hasHubDb && !nuxt.options.alias['hub:db']) {
    throw new Error('[nuxt-better-auth] hub:db not found. Ensure @nuxthub/core is loaded before this module and hub.db is configured.')
  }

  return {
    clientOnly,
    configs,
    aliases,
    pluginSources,
    hub: {
      hasNuxtHub,
      options: hub,
      hasHubDbAvailable,
    },
    database: {
      providerId,
      hasHubDb,
      providerDefinition,
      buildContext: clientOnly ? undefined : { hubDialect, usePlural, camelCase },
    },
    runtime,
    prepareTypes: clientOnly
      ? undefined
      : {
          serverDir: dirname(configs.server.path),
          hasHubDb,
        },
    serverTypes: clientOnly
      ? undefined
      : {
          serverConfigPath: configs.server.path,
          hasHubDb,
        },
    sharedTypes: {
      runtimeTypesAugmentPath,
      clientConfigPath: configs.client.path,
    },
    schemaGeneration: hasHubDb
      ? {
          serverConfigPath: configs.server.path,
          hubSecondaryStorage: options.hubSecondaryStorage ?? false,
          externalizeNuxtHubDatabase: true,
        }
      : undefined,
  }
}
