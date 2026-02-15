import type { Nuxt } from '@nuxt/schema'

export function setupDevTools(nuxt: Nuxt) {
  // Avoid depending on devtools-kit types in the published build output.
  type HookableNuxt = Nuxt & { hook: (name: 'devtools:customTabs', cb: (tabs: unknown[]) => void) => void }

  ;(nuxt as HookableNuxt).hook('devtools:customTabs', (tabs) => {
    ;(tabs as Array<Record<string, unknown>>).push({
      category: 'server',
      name: 'better-auth',
      title: 'Auth',
      icon: 'simple-icons:betterauth',
      view: {
        type: 'iframe',
        src: '/__better-auth-devtools',
      },
    })
  })
}
