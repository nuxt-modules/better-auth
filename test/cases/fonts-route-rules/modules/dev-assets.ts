import { addDevServerHandler, defineNuxtModule } from '@nuxt/kit'
import { eventHandler } from 'h3'
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
      const filename = 'auth-route-rules-test.woff2'
      const url = 'data:application/octet-stream;base64,dGVzdCBmb250'
      // @nuxt/fonts v1 indexes this map by the mounted asset path, while
      // older releases used the bare filename.
      const font = { url }
      context.renderedFontURLs.set(`${context.assetsBaseURL.replace(/^\/+/, '').replace(/\/+$/, '')}/${filename}`, font)
      context.renderedFontURLs.set(filename, font)
    })
    // Keep the fixture deterministic across @nuxt/fonts versions while exercising
    // the mounted internal asset path through Nuxt's dev server.
    addDevServerHandler({
      route: joinURL(nuxt.options.app.baseURL, '/_fonts/auth-route-rules-test.woff2'),
      handler: eventHandler(() => 'test font'),
    })
    // Nuxt's dev server also matches mounted handlers after stripping app.baseURL.
    addDevServerHandler({
      route: '/_fonts/auth-route-rules-test.woff2',
      handler: eventHandler(() => 'test font'),
    })
    // Registration alone must not make this API public when the handler falls through.
    addDevServerHandler({
      route: joinURL(nuxt.options.app.baseURL, '/api/auth-required'),
      handler: eventHandler((event) => {
        event.node?.res?.setHeader('x-test-dev-handler', 'fallthrough')
      }),
    })
  },
})
