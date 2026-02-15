import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'Schema Export Test',
  emailAndPassword: { enabled: true },
})
