import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
