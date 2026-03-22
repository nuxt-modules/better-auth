import { definePlugin } from 'nitro'
import { enforceRouteAccess } from './server/internal/route-access'

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    await enforceRouteAccess(event)
  })
})
