import { addDevServerHandler, defineNuxtModule } from '@nuxt/kit'
import { eventHandler, setResponseHeader } from 'h3'
import { joinURL } from 'ufo'

export default defineNuxtModule({
  setup(_options, nuxt) {
    // Exercise the real fonts handler without initializing remote providers.
    nuxt.hook('fonts:providers', (providers) => {
      for (const name of Object.keys(providers)) {
        if (name !== 'local')
          delete providers[name]
      }
    })
    // Keep the fixture deterministic across @nuxt/fonts versions while exercising
    // the mounted internal asset path through Nuxt's dev server.
    addDevServerHandler({
      route: joinURL(nuxt.options.app.baseURL, '/_fonts/auth-route-rules-test.woff2'),
      handler: eventHandler(() => 'test font'),
    })
    // Nuxt's dev server matches mounted handlers after stripping app.baseURL.
    addDevServerHandler({
      route: '/_fonts/auth-route-rules-test.woff2',
      handler: eventHandler(() => 'test font'),
    })
    // Registration alone must not make this API public when the handler falls through.
    addDevServerHandler({
      route: joinURL(nuxt.options.app.baseURL, '/api/auth-required'),
      handler: eventHandler((event) => {
        setResponseHeader(event, 'x-test-dev-handler', 'fallthrough')
      }),
    })
  },
})
