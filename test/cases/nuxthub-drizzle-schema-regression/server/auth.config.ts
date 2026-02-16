import { emailOTP } from 'better-auth/plugins'
import { defineServerAuth } from '../../../../src/runtime/config'

export default defineServerAuth({
  appName: 'NuxtHub OTP Test',
  emailAndPassword: { enabled: true },
  plugins: [
    emailOTP({
      async sendVerificationOTP() {
        // no-op for tests (we only need the endpoint to execute DB writes)
      },
    }),
  ],
})
