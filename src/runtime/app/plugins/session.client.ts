import { defineNuxtPlugin } from '#imports'
import { useUserSession } from '../composables/useUserSession'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { fetchSession } = useUserSession()

  const safeFetch = async () => {
    try {
      await fetchSession()
    }
    catch (error) {
      // Do not block app startup, but keep the last known session and surface the failure.
      console.error('[nuxt-better-auth] Failed to fetch session during app startup:', error)
    }
  }

  if (!nuxtApp.payload.serverRendered) {
    await safeFetch()
  }
  else if (nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached) {
    nuxtApp.hook('app:mounted', safeFetch)
  }
})
