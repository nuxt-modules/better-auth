export default defineNuxtConfig({
  modules: ['@nuxthub/core', '../../../src/module'],

  hub: { db: 'sqlite' },

  runtimeConfig: {
    betterAuthSecret: 'test-secret-for-testing-only-32chars!',
    public: { siteUrl: 'http://localhost:3000' },
  },

  hooks: {
    'better-auth:database:providers': (providers: any) => {
      const provider = providers?.nuxthub
      if (!provider) return

      provider.buildDatabaseCode = ({ hubDialect, usePlural, camelCase }: any) => `import { db } from '@nuxthub/db'
import * as schema from './schema.${hubDialect}.mjs'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
const rawDialect = '${hubDialect}'
const dialect = rawDialect === 'postgresql' ? 'pg' : rawDialect
export function createDatabase() { return drizzleAdapter(db, { provider: dialect, schema, usePlural: ${usePlural}, camelCase: ${camelCase} }) }
export { db }`
    },
  },
})

