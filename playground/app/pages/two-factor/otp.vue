<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useAuthClient()
const toast = useToast()
const emailWarning = useEmailWarning()

// Type assertion for twoFactor plugin
type AsyncFn = (...args: unknown[]) => Promise<unknown>
const authClient = client as typeof client & {
  twoFactor: { sendOtp: AsyncFn, verifyOtp: AsyncFn }
}

const otp = ref('')
const otpSent = ref(false)
const loading = ref(false)

async function sendOTP() {
  loading.value = true
  try {
    await authClient?.twoFactor.sendOtp()
    toast.add({ title: 'OTP Sent', description: 'Check your email for the code', color: 'success' })
    emailWarning()
    otpSent.value = true
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message || 'Failed to send OTP', color: 'error' })
  }
  loading.value = false
}

async function verifyOTP() {
  if (otp.value.length !== 6) {
    toast.add({ title: 'Error', description: 'OTP must be 6 digits', color: 'error' })
    return
  }
  loading.value = true
  try {
    const res = await authClient?.twoFactor.verifyOtp({ code: otp.value })
    if (res?.data) {
      toast.add({ title: 'Success', description: 'OTP verified', color: 'success' })
      navigateTo('/app')
    }
    else {
      toast.add({ title: 'Error', description: 'Invalid OTP', color: 'error' })
    }
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message || 'Verification failed', color: 'error' })
  }
  loading.value = false
}
</script>

<template>
  <UCard class="max-w-sm">
    <template #header>
      <h3 class="text-lg font-semibold">
        Email Verification
      </h3>
      <p class="text-sm text-muted-foreground">
        Verify with a one-time password sent to your email
      </p>
    </template>

    <div class="grid gap-4">
      <div v-if="!otpSent">
        <UButton block :loading="loading" @click="sendOTP">
          <UIcon name="i-lucide-mail" />
          Send OTP to Email
        </UButton>
      </div>

      <template v-else>
        <UFormField label="One-Time Password">
          <UInput v-model="otp" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit OTP" class="text-center tracking-widest" />
        </UFormField>

        <UButton block :loading="loading" :disabled="otp.length !== 6" @click="verifyOTP">
          Verify OTP
        </UButton>

        <UButton variant="ghost" block :loading="loading" @click="sendOTP">
          Resend OTP
        </UButton>
      </template>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <NuxtLink to="/two-factor" class="text-sm underline">
          Use TOTP instead
        </NuxtLink>
        <NuxtLink to="/login" class="text-sm underline">
          Back to login
        </NuxtLink>
      </div>
    </template>
  </UCard>
</template>
