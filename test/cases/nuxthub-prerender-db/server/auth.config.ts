import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'NuxtHub Prerender DB Test',
  emailAndPassword: { enabled: true },
})
