import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'Test App',
  emailAndPassword: { enabled: true },
})
