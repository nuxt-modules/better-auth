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
    page: {
      slots: {
        root: 'flex flex-col lg:flex-row lg:gap-8 px-4 sm:px-6 lg:px-8 xl:px-12',
        left: 'hidden',
        center: 'flex-1 min-w-0 max-w-[var(--fd-content-width,860px)] mx-auto',
        right: 'hidden xl:block w-[var(--fd-toc-width,268px)] shrink-0',
      },
    },
    pageBody: {
      base: 'mt-8 pb-24 space-y-12',
    },
    pageAside: {
      slots: {
        root: 'sticky top-[var(--ui-header-height)] max-h-[calc(100vh-var(--ui-header-height))] overflow-y-auto py-8',
      },
    },
    contentToc: {
      slots: {
        root: '',
        container: '',
        header: 'text-sm font-semibold mb-3 text-[var(--ui-text-highlighted)]',
        links: 'space-y-1',
        link: 'text-sm block py-1.5 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors',
        linkActive: 'text-[var(--ui-text-highlighted)]',
      },
    },
  },
})
