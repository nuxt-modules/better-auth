import type { Nuxt } from '@nuxt/schema'
import type { ModuleCustomTab } from '@nuxt/devtools-kit/types'
import { onDevToolsInitialized } from '@nuxt/devtools-kit'

interface DevtoolsDock {
  id: string
  title: string
  icon: string
  type: 'iframe'
  url: string
  groupId: string
  category: string
}

export function setupDevTools(nuxt: Nuxt) {
  interface DevtoolsHooks {
    'devtools:customTabs': (tabs: ModuleCustomTab[]) => void
    'devtools:ready': (ctx: { docks: { register: (dock: DevtoolsDock) => unknown } }) => void
  }
  type HookableNuxt = Nuxt & { hook: <K extends keyof DevtoolsHooks>(name: K, cb: DevtoolsHooks[K]) => void }

  const hookable = nuxt as HookableNuxt
  let nativeDocks = false
  onDevToolsInitialized(({ version }) => {
    nativeDocks = Number.parseInt(version, 10) >= 4
  }, nuxt)

  hookable.hook('devtools:ready', (ctx) => {
    ctx.docks.register({
      id: 'better-auth',
      title: 'Auth',
      icon: 'simple-icons:betterauth',
      type: 'iframe',
      url: '/__better-auth-devtools',
      groupId: 'nuxt',
      category: 'server',
    })
  })

  hookable.hook('devtools:customTabs', (tabs) => {
    if (nativeDocks)
      return
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
