import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'NuxtHub Hyperdrive Prepare Test',
  emailAndPassword: { enabled: true },
})
