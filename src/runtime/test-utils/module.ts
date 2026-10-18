import { addServerHandler, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule<{ token: string }>({
  meta: { name: '@nuxtjs/better-auth/test-utils' },
  setup(options, nuxt) {
    if (!nuxt.options.test || !options.token)
      throw new Error('[nuxt-better-auth] Auth test helpers must be installed through createAuthTestContext() in a test build.')
    nuxt.hook('ready', () => {
      if (!nuxt.options.alias['#auth/server'])
        throw new Error('[nuxt-better-auth] Auth E2E helpers require a local Better Auth server.')
    })

    const resolver = createResolver(import.meta.url)
    nuxt.hook('better-auth:plugins:extend', (sources) => {
      sources.server = [...(sources.server || []), resolver.resolve('./server/plugin')]
    })
    nuxt.options.runtimeConfig.betterAuthTestToken = options.token
    addServerHandler({ route: '/api/auth/__test__', method: 'post', handler: resolver.resolve('./server/handler') })
  },
})
