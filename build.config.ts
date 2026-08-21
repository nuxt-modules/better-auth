import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  externals: ['consola', 'auth', 'auth/api'],
})
