<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const client = useAuthClient()
const toast = useToast()

const token = computed(() => route.query.token as string | undefined)
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

async function handleResetPassword() {
  if (password.value !== confirmPassword.value) {
    toast.add({ title: 'Error', description: 'Passwords do not match', color: 'error' })
    return
  }

  if (password.value.length < 8) {
    toast.add({ title: 'Error', description: 'Password must be at least 8 characters', color: 'error' })
    return
  }

  if (!token.value) {
    toast.add({ title: 'Error', description: 'Invalid reset link', color: 'error' })
    return
  }

  loading.value = true
  const { error } = await client!.resetPassword({ newPassword: password.value, token: token.value })
  loading.value = false

  if (error) {
    toast.add({ title: 'Error', description: error.message || 'Failed to reset password', color: 'error' })
    return
  }

  toast.add({ title: 'Success', description: 'Password reset successfully', color: 'success' })
  navigateTo('/login')
}
</script>

<template>
  <UCard class="max-w-md">
    <template #header>
      <h3 class="text-lg md:text-xl font-semibold leading-none tracking-tight">
        Reset Password
      </h3>
      <p class="text-xs md:text-sm text-muted-foreground">
        Enter your new password
      </p>
    </template>

    <div v-if="!token" class="grid gap-4 text-center">
      <p class="text-sm text-muted-foreground">
        Invalid or missing reset token.
      </p>
      <NuxtLink to="/forget-password">
        <UButton variant="outline" block>
          Request new reset link
        </UButton>
      </NuxtLink>
    </div>

    <div v-else class="grid gap-4">
      <div class="grid gap-2">
        <label for="password" class="text-sm font-medium leading-none">New Password</label>
        <UInput id="password" v-model="password" type="password" placeholder="Enter new password" />
      </div>

      <div class="grid gap-2">
        <label for="confirm-password" class="text-sm font-medium leading-none">Confirm Password</label>
        <UInput id="confirm-password" v-model="confirmPassword" type="password" placeholder="Confirm new password" />
      </div>

      <UButton block :loading="loading" @click="handleResetPassword">
        Reset Password
      </UButton>

      <NuxtLink to="/login" class="text-sm text-center underline text-muted-foreground">
        Back to login
      </NuxtLink>
    </div>

    <template #footer>
      <div class="flex justify-center w-full border-t pt-4">
        <p class="text-center text-xs text-neutral-500">
          built with
          <a href="https://better-auth.nuxt.dev/" class="underline" target="_blank">
            <span class="dark:text-white/70 cursor-pointer">nuxt-better-auth.</span>
          </a>
        </p>
      </div>
    </template>
  </UCard>
</template>
