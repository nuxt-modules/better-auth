import { defineDiagnostics } from 'nostics'

// Keep construction silent: Nuxt reports thrown errors, and recoverable failures
// are formatted explicitly at the call site through the existing logger.
export const diagnostics = defineDiagnostics({
  codes: {
    NUXT_AUTH_MISSING_CONFIG: {
      why: (p: { file: string }) => `Missing ${p.file}.ts`,
      fix: (p: { file: string, factory: 'defineServerAuth' | 'defineClientAuth' }) => `Create ${p.file}.ts with export default ${p.factory}(...).`,
      docs: 'https://better-auth.nuxt.dev/getting-started/installation',
    },
    NUXT_AUTH_NO_DATABASE_PROVIDER: {
      why: 'No database provider is enabled.',
      fix: 'Register an enabled provider with the better-auth:database:providers hook.',
      docs: 'https://better-auth.nuxt.dev/guides/custom-database',
    },
    NUXT_AUTH_MISSING_HUB_DB: {
      why: 'hub:db not found.',
      fix: 'Load @nuxthub/core before @nuxtjs/better-auth and configure hub.db.',
      docs: 'https://better-auth.nuxt.dev/integrations/nuxthub',
    },
    NUXT_AUTH_INVALID_PLUGIN_SOURCE: {
      why: (p: { source: string }) => `Modules must register absolute plugin source paths. Received: ${p.source}`,
      fix: 'Resolve the plugin source with createResolver(import.meta.url).resolve(...) before registering it.',
      docs: 'https://better-auth.nuxt.dev/guides/diagnostics',
    },
    NUXT_AUTH_STORAGE_CLIENT_ONLY: {
      why: 'hubSecondaryStorage is not available in clientOnly mode.',
      fix: 'Either disable clientOnly or remove auth.hubSecondaryStorage.',
      docs: 'https://better-auth.nuxt.dev/guides/external-auth-backend',
    },
    NUXT_AUTH_SCHEMA_STORAGE_REQUIRED: {
      why: 'hubSecondaryStorage: "custom" requires secondaryStorage in defineServerAuth() to omit the session table from the generated schema.',
      fix: 'Provide an atomic secondaryStorage in defineServerAuth(), or set auth.hubSecondaryStorage to false to keep database-backed sessions.',
      docs: 'https://better-auth.nuxt.dev/getting-started/configuration',
    },
    NUXT_AUTH_UNSUPPORTED_DIALECT: {
      why: (p: { dialect: string | undefined }) => `Unsupported database dialect: ${p.dialect}`,
      fix: 'Configure hub.db with a supported dialect: sqlite, postgresql, or mysql.',
      docs: 'https://better-auth.nuxt.dev/getting-started/schema-generation',
    },
    NUXT_AUTH_INVALID_CONFIG_EXPORT: {
      why: (p: { configPath: string }) => `${p.configPath} must export default defineServerAuth(...).`,
      fix: 'Wrap the server auth options in defineServerAuth(...) and export the result as default.',
      docs: 'https://better-auth.nuxt.dev/core-concepts/server-auth',
    },
    NUXT_AUTH_CONFIG_LOAD_FAILED: {
      why: (p: { configPath: string, cause: unknown }) => `Failed to load auth config at ${p.configPath}: ${p.cause instanceof Error ? p.cause.message : String(p.cause)}`,
      fix: 'Check the config imports and required environment variables, then restart Nuxt to regenerate the schema.',
      docs: 'https://better-auth.nuxt.dev/getting-started/schema-generation',
    },
    NUXT_AUTH_EMPTY_SCHEMA: {
      why: (p: { dialect: string }) => `Schema generation returned empty result for ${p.dialect}`,
      fix: 'Check the Better Auth plugins and database options in defineServerAuth(), then regenerate the schema.',
      docs: 'https://better-auth.nuxt.dev/getting-started/schema-generation',
    },
    NUXT_AUTH_SCHEMA_GENERATION_FAILED: {
      why: (p: { cause: unknown }) => `Failed to generate schema: ${p.cause instanceof Error ? p.cause.message : String(p.cause)}`,
      fix: 'Check the underlying error, auth configuration, and write access to the Nuxt build directory, then regenerate the schema.',
      docs: 'https://better-auth.nuxt.dev/getting-started/schema-generation',
    },
  },
})
