<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const client = useAuthClient()
const { t } = useI18n()
const toast = useToast()
const emailWarning = useEmailWarning()

const email = ref('')
const loading = ref(false)
const success = ref(false)

async function handleRequestReset() {
  loading.value = true
  const { error } = await client!.requestPasswordReset({ email: email.value, redirectTo: '/reset-password' })
  loading.value = false

  if (error) {
    toast.add({ title: 'Error', description: error.message || t('forgotPassword.error'), color: 'error' })
    return
  }

  success.value = true
  toast.add({ title: 'Success', description: t('forgotPassword.success'), color: 'success' })
  emailWarning()
}
</script>

<template>
  <UCard class="max-w-md">
    <template #header>
      <h3 class="text-lg md:text-xl font-semibold leading-none tracking-tight">
        {{ t('forgotPassword.title') }}
      </h3>
      <p class="text-xs md:text-sm text-muted-foreground">
        {{ t('forgotPassword.subtitle') }}
      </p>
    </template>

    <div v-if="!success" class="grid gap-4">
      <div class="grid gap-2">
        <label for="email" class="text-sm font-medium leading-none">{{ t('common.email') }}</label>
        <UInput id="email" v-model="email" type="email" placeholder="m@example.com" />
      </div>

      <UButton block :loading="loading" @click="handleRequestReset">
        {{ t('forgotPassword.submit') }}
      </UButton>

      <NuxtLink to="/login" class="text-sm text-center underline text-muted-foreground">
        {{ t('forgotPassword.backToLogin') }}
      </NuxtLink>
    </div>

    <div v-else class="grid gap-4 text-center">
      <p class="text-sm text-muted-foreground">
        {{ t('forgotPassword.successMessage', { email }) }}
      </p>
      <NuxtLink to="/login">
        <UButton variant="outline" block>
          {{ t('forgotPassword.backToLogin') }}
        </UButton>
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
