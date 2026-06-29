<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const DIGITS_ONLY_RE = /^\d+$/

const { client } = useUserSession()
const toast = useToast()

// Type assertion for twoFactor plugin
type AsyncFn = (...args: unknown[]) => Promise<unknown>
const authClient = client as typeof client & {
  twoFactor: { verifyTotp: AsyncFn }
}

const code = ref('')
const loading = ref(false)

async function handleVerify() {
  if (code.value.length !== 6 || !DIGITS_ONLY_RE.test(code.value)) {
    toast.add({ title: 'Error', description: 'TOTP code must be 6 digits', color: 'error' })
    return
  }
  loading.value = true
  try {
    const res = await authClient?.twoFactor.verifyTotp({ code: code.value })
    if (res?.data?.token) {
      toast.add({ title: 'Success', description: 'Two-factor verified', color: 'success' })
      navigateTo('/app')
    }
    else {
      toast.add({ title: 'Error', description: 'Invalid TOTP code', color: 'error' })
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
        TOTP Verification
      </h3>
      <p class="text-sm text-muted-foreground">
        Enter your 6-digit authenticator code
      </p>
    </template>

    <div class="grid gap-4">
      <UFormField label="TOTP Code">
        <UInput v-model="code" inputmode="numeric" pattern="\d{6}" maxlength="6" placeholder="000000" class="text-center tracking-widest" />
      </UFormField>

      <UButton block :loading="loading" @click="handleVerify">
        Verify
      </UButton>
    </div>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <NuxtLink to="/two-factor/otp" class="text-sm underline">
          Use Email OTP instead
        </NuxtLink>
        <NuxtLink to="/login" class="text-sm underline">
          Back to login
        </NuxtLink>
      </div>
    </template>
  </UCard>
</template>
