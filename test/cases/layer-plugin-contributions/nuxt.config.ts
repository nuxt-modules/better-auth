export default defineNuxtConfig({
  extends: ['../_base-module', '../layer-plugin-contributions-base'],
  auth: {
    serverPluginSources: ['./server/app-plugin'],
    clientPluginSources: ['./app/app-plugin'],
  },
})
