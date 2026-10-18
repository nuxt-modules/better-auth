export default defineNuxtConfig({
  auth: {
    serverPluginSources: ['./server/layer-plugin'],
    clientPluginSources: ['./app/layer-plugin'],
  },
})
