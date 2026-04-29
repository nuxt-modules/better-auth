import { defineNuxtPlugin } from '#imports'
import { useUserSession } from '../composables/useUserSession'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { fetchSession } = useUserSession()

  const safeFetch = async () => {
    try {
      await fetchSession()
    }
    catch {
      // Session fetch failed - user will be unauthenticated
    }
  }

  if (!nuxtApp.payload.serverRendered) {
    await safeFetch()
  }
  else if (nuxtApp.payload.prerenderedAt || nuxtApp.payload.isCached) {
    nuxtApp.hook('app:mounted', safeFetch)
  }
})
