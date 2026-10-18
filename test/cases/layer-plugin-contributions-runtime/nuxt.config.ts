export default defineNuxtConfig({
  extends: ['../core-auth', '../layer-plugin-contributions-base'],
  modules: ['@nuxthub/core', '../../../src/module', './late-module'],
})
