// `nuxt-module-build prepare` loads the module into a Nuxt app rooted here.
// Point it at committed configs so it doesn't need the files `onInstall` scaffolds.
export default defineNuxtConfig({
  auth: {
    serverConfig: 'test/cases/_base-module/server/auth.config',
    clientConfig: 'test/cases/_base-module/app/auth.config',
  },
})
