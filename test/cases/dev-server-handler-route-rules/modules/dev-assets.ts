import { addDevServerHandler, defineNuxtModule } from '@nuxt/kit'
import { eventHandler } from 'h3'

// Mirrors @nuxt/fonts, which serves /_fonts from a dev server handler and adds a dev-only cache rule.
export default defineNuxtModule({
  setup(_options, nuxt) {
    if (!nuxt.options.dev)
      return

    addDevServerHandler({ route: '/_assets', handler: eventHandler(() => 'asset') })
    nuxt.options.routeRules ||= {}
    nuxt.options.routeRules['/_assets/**'] = { cache: { maxAge: 60 } }
  },
})
