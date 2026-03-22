import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: ['consola', '@better-auth/cli', '@better-auth/cli/api', 'drizzle-orm/utils'],
})
