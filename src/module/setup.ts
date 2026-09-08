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
import type { RouteTable } from 'radix3'
import { hasNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'
import { dirname } from 'pathe'
import { createRouter, toRouteMatcher } from 'radix3'
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
  database: {
    hasHubDb: boolean
    providerDefinition?: BetterAuthDatabaseProviderDefinition
    buildContext?: BetterAuthDatabaseProviderBuildContext
  }
  prepareTypes?: {
    serverDir: string
    hasHubDb: boolean
  }
  serverTypes?: {
    hasHubDb: boolean
  }
  sharedTypes: {
    runtimeTypesAugmentPath: string
  }
  schemaGeneration?: {
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
  const runtimeRouteRulesSource = getRuntimeRouteRules(nuxt)

  return Object.fromEntries(
    Object.entries(runtimeRouteRulesSource).flatMap(([path, rule]) => {
      if (!rule || typeof rule !== 'object' || !('auth' in rule))
        return []

      return [[path, { auth: (rule as { auth?: unknown }).auth }]]
    }),
  )
}

const authIncompatibleRouteRuleKeys = ['cache', 'swr', 'isr', 'static', 'prerender', 'proxy'] as const

function getRuntimeRouteRules(nuxt: Nuxt): Record<string, unknown> {
  return (
    (nuxt.options as { nitro?: { routeRules?: Record<string, unknown> } }).nitro?.routeRules
    || (nuxt.options as { routeRules?: Record<string, unknown> }).routeRules
    || {}
  ) as Record<string, unknown>
}

export function registerAuthRouteRulesValidation(nuxt: Nuxt): void {
  // Nitro initialization follows all modules:done and nitro:config callbacks.
  // @ts-expect-error Nitro augments NuxtHooks at runtime.
  nuxt.hook('nitro:init', (nitro: { options: { routeRules: Record<string, unknown> } }) => {
    assertSafeAuthRouteRules(nitro.options.routeRules)
  })
}

export function assertSafeAuthRouteRules(routeRules: Record<string, unknown>): void {
  if (!Object.keys(routeRules).length)
    return

  const matcher = toRouteMatcher(createRouter({ routes: routeRules }))
  const paths = new Set(Object.keys(routeRules))
  const patterns = [...collectRouteRulePatterns(matcher.ctx.table)]
  for (const path of collectRouteRulePaths(patterns, ''))
    paths.add(path)
  const conflicts = [...paths].flatMap((path) => {
    const matches = matcher.matchAll(path) as Record<string, unknown>[]
    const effectiveRule = defu({}, ...matches.reverse()) as Record<string, unknown>
    if (effectiveRule.auth === undefined || effectiveRule.auth === false)
      return []

    const incompatibleKeys = authIncompatibleRouteRuleKeys.filter((key) => {
      const value = effectiveRule[key]
      return value !== undefined && value !== false && value !== 0
    })

    return incompatibleKeys.length ? [{ path, incompatibleKeys }] : []
  })

  if (!conflicts.length)
    return

  const details = conflicts
    .map(({ path, incompatibleKeys }) => `${path} (${incompatibleKeys.join(', ')})`)
    .join(', ')

  throw new Error(
    `[nuxt-better-auth] Auth route rules cannot be combined with cache, swr, isr, static, prerender, or proxy rules. `
    + `These rules can run before authentication or share user-specific responses. Conflicts: ${details}`,
  )
}

type RouteRulePattern = (string | null)[]

function* collectRouteRulePatterns(table: RouteTable, prefix: RouteRulePattern = []): Generator<RouteRulePattern> {
  const segments = (path: string) => path && path !== '/' ? path.slice(1).split('/') : []
  // Read the matcher's resolved keys, rather than interpreting route syntax a
  // second time. null represents the single segment consumed by a dynamic edge.
  for (const path of [...table.static.keys(), ...table.wildcard.keys()])
    yield [...prefix, ...segments(path)]

  for (const [path, child] of table.dynamic)
    yield* collectRouteRulePatterns(child, [...prefix, ...segments(path), null])
}

function* collectRouteRulePaths(patterns: RouteRulePattern[], prefix: string): Generator<string> {
  yield prefix || '/'

  // Literal branches partition the possible next segments. One fresh segment
  // represents everything else, including paths beyond exact-rule exclusions.
  const literals = new Set(patterns.flatMap(pattern => typeof pattern[0] === 'string' ? [pattern[0]] : []))
  let other = '_'
  while (literals.has(other))
    other += '_'

  for (const segment of [...literals, other]) {
    const path = `${prefix}/${segment}`
    const next = patterns
      .filter(pattern => pattern[0] === null || pattern[0] === segment)
      .map(pattern => pattern.slice(1))
    // A terminal ** accepts every continuation. Once no finite branches remain,
    // one continuation has the same effective rules as every deeper path.
    if (next.length)
      yield* collectRouteRulePaths(next, path)
    else
      yield path
  }
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

  setupRuntimeConfig({
    nuxt,
    options,
    clientOnly,
    databaseProvider: providerId,
    hasNuxtHub,
    hub,
    consola,
  })

  const hasHubDb = providerId === 'nuxthub'
  if (hasHubDb && !nuxt.options.alias['hub:db']) {
    throw new Error('[nuxt-better-auth] hub:db not found. Ensure @nuxthub/core is loaded before this module and hub.db is configured.')
  }

  return {
    clientOnly,
    configs,
    aliases,
    pluginSources,
    database: {
      hasHubDb,
      providerDefinition,
      buildContext: clientOnly ? undefined : { hubDialect, usePlural, camelCase },
    },
    prepareTypes: clientOnly
      ? undefined
      : {
          serverDir: dirname(configs.server.path),
          hasHubDb,
        },
    serverTypes: clientOnly
      ? undefined
      : {
          hasHubDb,
        },
    sharedTypes: {
      runtimeTypesAugmentPath,
    },
    schemaGeneration: hasHubDb
      ? {
          hubSecondaryStorage: options.hubSecondaryStorage ?? false,
          externalizeNuxtHubDatabase: true,
        }
      : undefined,
  }
}
