import type { Nuxt } from '@nuxt/schema'

interface DevtoolsCustomTab {
  category: string
  name: string
  title: string
  icon: string
  view: { type: 'iframe', src: string }
}

export function setupDevTools(nuxt: Nuxt) {
  type HookableNuxt = Nuxt & { hook: (name: 'devtools:customTabs', cb: (tabs: DevtoolsCustomTab[]) => void) => void }

  const hookable = nuxt as HookableNuxt
  hookable.hook('devtools:customTabs', (tabs) => {
    tabs.push({
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
