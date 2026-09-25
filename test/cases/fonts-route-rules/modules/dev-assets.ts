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
    nuxt.hook('fonts:public-asset-context', (context) => {
      context.renderedFontURLs.set('auth-route-rules-test.woff2', 'data:application/octet-stream;base64,dGVzdCBmb250')
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
