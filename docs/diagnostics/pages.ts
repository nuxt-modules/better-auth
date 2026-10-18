import type { Diagnostic } from 'nostics'
import { diagnostics } from '../../src/module/diagnostics'

export type DiagnosticCode = keyof typeof diagnostics

export interface DiagnosticPage {
  title: string
  description: string
  example: Diagnostic
  cause: string
  solution: string
  verify: string
  guide: { label: string, path: string }
}

// Examples call the real catalog so messages and fixes stay aligned with errors.
export const diagnosticPages = {
  NUXT_AUTH_MISSING_CONFIG: {
    title: 'Missing auth configuration',
    description: 'Create the server or client auth config file that Nuxt Better Auth could not find.',
    example: diagnostics.NUXT_AUTH_MISSING_CONFIG({ file: 'server/auth.config', factory: 'defineServerAuth' }),
    cause: 'The module could not find the configured server or client auth file. This can happen after renaming a file, changing auth.serverConfig or auth.clientConfig, or moving configuration into a Nuxt layer. In clientOnly mode, only the client config is required.',
    solution: `For the server configuration in this example, create:

\`\`\`ts [server/auth.config.ts]
import { defineServerAuth } from '@nuxtjs/better-auth/config'

export default defineServerAuth({})
\`\`\`

If the error names a client file, use \`defineClientAuth({})\` from the same package export instead. Check any custom \`auth.serverConfig\` and \`auth.clientConfig\` paths against the file's actual location.`,
    verify: 'Run pnpm exec nuxt prepare. The named config should resolve without NUXT_AUTH_MISSING_CONFIG.',
    guide: { label: 'Install and configure the module', path: '/getting-started/installation' },
  },
  NUXT_AUTH_NO_DATABASE_PROVIDER: {
    title: 'No database provider is enabled',
    description: 'Restore an enabled module database provider after changing the provider registry.',
    example: diagnostics.NUXT_AUTH_NO_DATABASE_PROVIDER(),
    cause: 'The better-auth:database:providers hook left no enabled provider in the registry. The module normally registers a fallback provider named none, so this error usually follows a custom module that removes or disables the defaults. It does not mean every app must use NuxtHub.',
    solution: `If you only want to use your own Better Auth adapter, keep the default provider registry and configure \`database\` in \`defineServerAuth()\`.

If your module intentionally replaces the registry, it must leave an enabled provider. A minimal provider that delegates database configuration to the user's auth config is:

\`\`\`ts [modules/auth-database.ts]
import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.hook('better-auth:database:providers', (providers) => {
      providers.none = {
        priority: 0,
        buildDatabaseCode: () => 'export function createDatabase() { return undefined }',
      }
    })
  },
})
\`\`\``,
    verify: 'Run pnpm exec nuxt prepare, then confirm that your auth config still uses the intended database adapter.',
    guide: { label: 'Use a custom database', path: '/guides/custom-database' },
  },
  NUXT_AUTH_MISSING_HUB_DB: {
    title: 'NuxtHub database alias is missing',
    description: 'Configure NuxtHub before Nuxt Better Auth so the hub:db alias is available.',
    example: diagnostics.NUXT_AUTH_MISSING_HUB_DB(),
    cause: 'The module selected the NuxtHub database provider, but NuxtHub had not registered the hub:db alias. Check module order, hub.db, and any custom provider hooks that force the nuxthub provider.',
    solution: `Configure NuxtHub before the auth module:

\`\`\`ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@nuxthub/core', '@nuxtjs/better-auth'],
  hub: { db: 'sqlite' },
})
\`\`\`

Install \`@nuxthub/core\` if it is missing. If you use a separate database adapter, remove any hook that forces selection of the NuxtHub provider.`,
    verify: 'Run pnpm exec nuxt prepare. NuxtHub should register hub:db and the auth module should generate its schema.',
    guide: { label: 'Set up NuxtHub', path: '/integrations/nuxthub' },
  },
  NUXT_AUTH_INVALID_PLUGIN_SOURCE: {
    title: 'Auth plugin path must be absolute',
    description: 'Resolve plugin file paths before registering them with better-auth:plugins:extend.',
    example: diagnostics.NUXT_AUTH_INVALID_PLUGIN_SOURCE({ source: './runtime/auth-plugin.ts' }),
    cause: 'A Nuxt module contributed a relative path through better-auth:plugins:extend. Relative paths depend on the consuming app directory, so the auth module requires each contributor to resolve its own plugin files.',
    solution: `Resolve the path relative to the module that owns the plugin:

\`\`\`ts [modules/auth-extension.ts]
import { createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    nuxt.hook('better-auth:plugins:extend', (plugins) => {
      plugins.server ||= []
      plugins.server.push(resolver.resolve('./runtime/auth-plugin.ts'))
    })
  },
})
\`\`\`

Use \`plugins.client\` for a client auth plugin. The referenced file must exist and export the plugin expected by the auth configuration.`,
    verify: 'Run pnpm exec nuxt prepare. The registered path should be absolute and the contributed plugin should appear in the generated auth configuration.',
    guide: { label: 'Configure server auth', path: '/core-concepts/server-auth' },
  },
  NUXT_AUTH_STORAGE_CLIENT_ONLY: {
    title: 'Secondary storage in client-only mode',
    description: 'Remove server secondary-storage configuration from an app that only connects to an external auth server.',
    example: diagnostics.NUXT_AUTH_STORAGE_CLIENT_ONLY(),
    cause: 'The app enables clientOnly and requests custom hubSecondaryStorage. This app does not run the auth server, so it cannot configure that server\'s session storage.',
    solution: `Keep the frontend in client-only mode and remove its secondary-storage option:

\`\`\`ts [nuxt.config.ts]
export default defineNuxtConfig({
  auth: {
    clientOnly: true,
    hubSecondaryStorage: false,
  },
})
\`\`\`

Configure secondary storage on the external auth server. If this Nuxt app should run the auth server itself, disable \`clientOnly\` and provide a server auth config.`,
    verify: 'Run pnpm exec nuxt prepare, then check that sign-in requests still use the intended external auth server.',
    guide: { label: 'Connect to an external auth backend', path: '/guides/external-auth-backend' },
  },
  NUXT_AUTH_SCHEMA_STORAGE_REQUIRED: {
    title: 'Custom session storage is missing',
    description: 'Provide secondaryStorage or retain the session table when generating the auth schema.',
    example: diagnostics.NUXT_AUTH_SCHEMA_STORAGE_REQUIRED(),
    cause: 'The schema generator was asked to omit the session table with hubSecondaryStorage: "custom", but defineServerAuth() did not provide secondaryStorage. Development warns and retains the session table; production setup fails.',
    solution: `If you want database-backed sessions, keep the session table:

\`\`\`ts [nuxt.config.ts]
export default defineNuxtConfig({
  auth: { hubSecondaryStorage: false },
})
\`\`\`

If you intend to use custom session storage, keep \`'custom'\` and supply a Better Auth secondary store with atomic \`getAndDelete\` and \`increment\` operations in \`defineServerAuth()\`. Review the generated schema before applying a migration that changes session storage.`,
    verify: 'Regenerate the schema. With hubSecondaryStorage: false, confirm the session table is present before creating a database migration.',
    guide: { label: 'Configure secondary storage', path: '/getting-started/configuration' },
  },
  NUXT_AUTH_UNSUPPORTED_DIALECT: {
    title: 'Unsupported database dialect',
    description: 'Select sqlite, postgresql, or mysql for NuxtHub auth schema generation.',
    example: diagnostics.NUXT_AUTH_UNSUPPORTED_DIALECT({ dialect: 'postgres' }),
    cause: 'NuxtHub schema generation received a missing or unsupported dialect. For example, the NuxtHub dialect is postgresql, even though some database adapters use the shorter name pg.',
    solution: `Use the NuxtHub dialect name in \`hub.db\`:

\`\`\`ts [nuxt.config.ts]
export default defineNuxtConfig({
  hub: { db: { dialect: 'postgresql' } },
})
\`\`\`

The other supported values are \`sqlite\` and \`mysql\`. This option describes the schema dialect; it does not replace the connection configuration required by your database.`,
    verify: 'Run pnpm exec nuxt prepare and check for a generated schema matching the configured dialect.',
    guide: { label: 'Generate a database schema', path: '/getting-started/schema-generation' },
  },
  NUXT_AUTH_INVALID_CONFIG_EXPORT: {
    title: 'Invalid server auth config export',
    description: 'Export defineServerAuth(...) as the default export of your server auth config.',
    example: diagnostics.NUXT_AUTH_INVALID_CONFIG_EXPORT({ configPath: 'server/auth.config.ts' }),
    cause: 'The config file loaded, but its default export was not a config factory. A named export or a plain options object does not satisfy the server auth config contract. Development skips schema regeneration and preserves the existing schema; production fails.',
    solution: `Wrap the options in \`defineServerAuth()\` and export the result as default:

\`\`\`ts [server/auth.config.ts]
import { defineServerAuth } from '@nuxtjs/better-auth/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
\`\`\`

When using a custom \`auth.serverConfig\` path, make this change in the file named by the error.`,
    verify: 'Run pnpm exec nuxt prepare. If NuxtHub schema generation is enabled, check that the generated schema includes your configured plugin fields.',
    guide: { label: 'Define server auth configuration', path: '/core-concepts/server-auth' },
  },
  NUXT_AUTH_CONFIG_LOAD_FAILED: {
    title: 'Auth configuration failed to load',
    description: 'Resolve missing imports or environment variables that prevent the server auth config from loading.',
    example: diagnostics.NUXT_AUTH_CONFIG_LOAD_FAILED({ configPath: 'server/auth.config.ts', cause: new Error('Missing RESEND_API_KEY') }),
    cause: 'An import or config factory threw while the module loaded the server auth config for schema generation. The original error follows the config path in the diagnostic. Development preserves the previous schema; production setup fails.',
    solution: `For the example above, provide the key required by the email client before Nuxt loads the config:

\`\`\`dotenv [.env]
RESEND_API_KEY=your-development-api-key
\`\`\`

Set the corresponding environment variable in your build environment for production. If the underlying error says \`Cannot find module\`, check the import path and whether the dependency is installed. Fix the underlying error before generating migrations from the schema.`,
    verify: 'Restart Nuxt. Confirm the config loads and the regenerated schema contains your additional fields and plugin tables.',
    guide: { label: 'Understand schema generation', path: '/getting-started/schema-generation' },
  },
  NUXT_AUTH_EMPTY_SCHEMA: {
    title: 'Schema generator returned no code',
    description: 'Check Better Auth database options and plugins when schema generation returns an empty result.',
    example: diagnostics.NUXT_AUTH_EMPTY_SCHEMA({ dialect: 'sqlite' }),
    cause: 'Better Auth\'s Drizzle schema generator returned an empty result for the selected dialect. There is no schema code for the module to write, so setup stops.',
    solution: `Check recent changes to \`defineServerAuth()\`, especially plugin schema definitions and database options. In a development branch, isolate plugin configuration changes and rerun preparation after each change:

\`\`\`bash
pnpm exec nuxt prepare
\`\`\`

If a minimal config still returns no code, report the diagnostic code, dialect, Better Auth version, and a minimal reproduction. Preserve the last working schema while investigating.`,
    verify: 'Preparation should produce a non-empty schema with the auth tables expected for your configuration. Review the generated code before applying migrations.',
    guide: { label: 'Inspect generated schemas', path: '/getting-started/schema-generation' },
  },
  NUXT_AUTH_SCHEMA_GENERATION_FAILED: {
    title: 'Auth schema generation failed',
    description: 'Resolve an underlying plugin, filesystem, or schema-generation error during Nuxt setup.',
    example: diagnostics.NUXT_AUTH_SCHEMA_GENERATION_FAILED({ cause: new Error('EACCES: permission denied, mkdir .nuxt/better-auth') }),
    cause: 'Schema setup threw an error outside the more specific config diagnostics. The original cause is retained. This can come from a plugin hook, the schema generator, or writing generated files; setup fails in both development and production.',
    solution: `For the permission error above, check that the user running Nuxt can write to the configured build directory. Avoid alternating between privileged and unprivileged builds of the same checkout. After correcting directory ownership or permissions, rerun:

\`\`\`bash
pnpm exec nuxt prepare
\`\`\`

For a plugin error, inspect the original cause and the most recent plugin or \`better-auth:config:extend\` change. A filesystem fix will not resolve a plugin exception.`,
    verify: 'Preparation should finish successfully. Check the generated schema for all expected fields and tables before creating a migration.',
    guide: { label: 'Generate and review the schema', path: '/getting-started/schema-generation' },
  },
} satisfies Record<DiagnosticCode, DiagnosticPage>
