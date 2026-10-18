import type { ModuleDatabaseProviderId } from './runtime/config'
import type { BetterAuthDatabaseProviderDefinition, BetterAuthDatabaseProviderEnabledContext } from './types/hooks'
import { diagnostics } from './module/diagnostics'

export interface ResolveDatabaseProviderInput {
  providers: Record<string, BetterAuthDatabaseProviderDefinition>
  context: BetterAuthDatabaseProviderEnabledContext
}

export interface ResolvedDatabaseProvider {
  id: ModuleDatabaseProviderId
  definition: BetterAuthDatabaseProviderDefinition
}

/**
 * Resolves the database provider by filtering enabled providers and selecting
 * the highest priority (default 0). Ties preserve registration order.
 */
export function resolveDatabaseProvider(input: ResolveDatabaseProviderInput): ResolvedDatabaseProvider {
  const enabledProviders = Object.entries(input.providers)
    .filter(([_id, provider]) => provider.isEnabled?.(input.context) ?? true)

  if (!enabledProviders.length) {
    throw diagnostics.NUXT_AUTH_NO_DATABASE_PROVIDER()
  }

  enabledProviders.sort((a, b) => (b[1].priority ?? 0) - (a[1].priority ?? 0))
  const [id, definition] = enabledProviders[0]
  return { id: id as ModuleDatabaseProviderId, definition }
}
