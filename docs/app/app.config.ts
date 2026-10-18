export default defineAppConfig({
  github: {
    url: 'https://github.com/nuxt-modules/better-auth',
    branch: 'main',
    rootDir: 'docs',
  },
  ui: {
    colors: {
      primary: 'stone',
      neutral: 'stone',
    },
    prose: {
      a: {
        base: 'font-medium underline underline-offset-4 text-default hover:text-primary transition-colors',
      },
      callout: {
        slots: {
          base: 'border-0 border-s-2 border-dashed rounded-none bg-muted',
        },
        variants: {
          color: {
            info: { base: 'border-s-blue-500/50', icon: 'text-blue-500' },
            warning: { base: 'border-s-orange-500/50', icon: 'text-orange-500' },
            error: { base: 'border-s-red-500/50', icon: 'text-red-500' },
            success: { base: 'border-s-green-500/50', icon: 'text-green-500' },
            neutral: { base: 'border-s-stone-500/50' },
          },
        },
      },
    },
    pageBody: {
      base: 'mt-8 pb-24 space-y-12',
    },
  },
})
