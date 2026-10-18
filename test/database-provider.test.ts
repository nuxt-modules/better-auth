import type { BetterAuthDatabaseProviderDefinition, BetterAuthDatabaseProviderEnabledContext } from '../src/types/hooks'
import { describe, expect, it } from 'vitest'
import { resolveDatabaseProvider } from '../src/database-provider'

function createContext(input: Partial<BetterAuthDatabaseProviderEnabledContext> = {}): BetterAuthDatabaseProviderEnabledContext {
  return {
    nuxt: {} as BetterAuthDatabaseProviderEnabledContext['nuxt'],
    options: {},
    clientOnly: false,
    hasHubDbAvailable: false,
    ...input,
  }
}

function createProvider(partial: Partial<BetterAuthDatabaseProviderDefinition> = {}): BetterAuthDatabaseProviderDefinition {
  return {
    buildDatabaseCode: () => 'export function createDatabase() { return undefined }',
    ...partial,
  }
}

describe('resolveDatabaseProvider', () => {
  it('selects nuxthub when hub db is available', () => {
    const providers = {
      none: createProvider({ priority: 0 }),
      nuxthub: createProvider({
        priority: 100,
        isEnabled: ({ hasHubDbAvailable }) => hasHubDbAvailable,
      }),
    }

    const resolved = resolveDatabaseProvider({
      providers,
      context: createContext({ hasHubDbAvailable: true }),
    })

    expect(resolved.id).toBe('nuxthub')
  })

  it('falls back to none when hub db is unavailable', () => {
    const providers = {
      none: createProvider({ priority: 0 }),
      nuxthub: createProvider({
        priority: 100,
        isEnabled: ({ hasHubDbAvailable }) => hasHubDbAvailable,
      }),
    }

    const resolved = resolveDatabaseProvider({
      providers,
      context: createContext({ hasHubDbAvailable: false }),
    })

    expect(resolved.id).toBe('none')
  })

  it('prefers a higher-priority external provider when enabled', () => {
    const providers = {
      none: createProvider({ priority: 0 }),
      nuxthub: createProvider({
        priority: 100,
        isEnabled: ({ hasHubDbAvailable }) => hasHubDbAvailable,
      }),
      external: createProvider({
        priority: 200,
        isEnabled: () => true,
      }),
    }

    const resolved = resolveDatabaseProvider({
      providers,
      context: createContext({ hasHubDbAvailable: true }),
    })

    expect(resolved.id).toBe('external')
  })

  it('throws when no provider is enabled', () => {
    const providers = {
      nuxthub: createProvider({ isEnabled: () => false }),
      external: createProvider({ isEnabled: () => false }),
    }

    expect(() => resolveDatabaseProvider({
      providers,
      context: createContext(),
    })).toThrow(expect.objectContaining({
      code: 'NUXT_AUTH_NO_DATABASE_PROVIDER',
      fix: expect.stringContaining('better-auth:database:providers'),
    }))
  })
})
