import { fileURLToPath } from 'node:url'
import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.hook('better-auth:plugins:extend', (sources) => {
      sources.server ||= []
      sources.server.push(fileURLToPath(new URL('./server/module-plugin', import.meta.url)))
    })
  },
})
