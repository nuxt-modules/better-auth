import type { Nuxt } from '@nuxt/schema'
import type { ModuleCustomTab } from '@nuxt/devtools-kit/types'
import { hasNuxtModuleCompatibility } from '@nuxt/kit'

interface DevtoolsDock {
  id: string
  title: string
  icon: string
  type: 'iframe'
  url: string
  groupId: string
  category: string
}

export async function setupDevTools(nuxt: Nuxt) {
  interface DevtoolsHooks {
    'devtools:customTabs': (tabs: ModuleCustomTab[]) => void
    'devtools:ready': (ctx: { docks: { register: (dock: DevtoolsDock) => unknown } }) => void
  }
  type HookableNuxt = Nuxt & { hook: <K extends keyof DevtoolsHooks>(name: K, cb: DevtoolsHooks[K]) => void }

  const hookable = nuxt as HookableNuxt
  // Auth setup can run after DevTools has already emitted its initialized hook.
  if (await hasNuxtModuleCompatibility('@nuxt/devtools', '>=4.0.0-0', nuxt)) {
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
    return
  }

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
