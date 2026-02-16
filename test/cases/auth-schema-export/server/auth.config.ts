import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'Auth Schema Export Test',
  emailAndPassword: { enabled: true },
})
