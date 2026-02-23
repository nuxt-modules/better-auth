import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'Auth Schema Export Hub Secondary Storage Test',
  emailAndPassword: { enabled: true },
})
