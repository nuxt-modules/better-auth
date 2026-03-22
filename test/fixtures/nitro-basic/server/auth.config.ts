import { defineServerAuth } from '../../../../dist/nitro/config.mjs'

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
  },
})
