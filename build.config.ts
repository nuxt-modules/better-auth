import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/nitro',
    'src/nitro/config',
    {
      builder: 'mkdist',
      input: 'src/nitro/runtime/',
      outDir: 'dist/nitro/runtime',
      addRelativeDeclarationExtensions: true,
      ext: 'js',
      pattern: [
        '**',
        '!**/*.stories.{js,cts,mts,ts,jsx,tsx}',
        '!**/*.{spec,test}.{js,cts,mts,ts,jsx,tsx}',
      ],
      esbuild: {
        jsxImportSource: 'vue',
        jsx: 'automatic',
        jsxFactory: 'h',
      },
    },
  ],
  externals: ['consola', '@better-auth/cli', '@better-auth/cli/api', 'drizzle-orm/utils'],
  failOnWarn: false,
})
