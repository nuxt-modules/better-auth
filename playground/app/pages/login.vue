<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const signInEmail = useSignIn('email')
const signInSocial = useSignIn('social')
const signInPasskey = useSignIn('passkey')
const { resolvePostAuthRedirect } = usePostAuthRedirect()

const { t } = useI18n()
const toast = useToast()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)

async function handleSignIn() {
  await signInEmail.execute(
    { email: email.value, password: password.value, rememberMe: rememberMe.value },
    {
      onSuccess: () => {
        toast.add({ title: 'Success', description: t('login.success'), color: 'success' })
        navigateTo(resolvePostAuthRedirect('/app'))
      },
      onError: (ctx) => {
        toast.add({ title: 'Error', description: ctx.error.message || t('login.error'), color: 'error' })
      },
    },
  )
}

async function handleSocialSignIn() {
  await signInSocial.execute({ provider: 'github' })
}

async function handlePasskeySignIn() {
  await signInPasskey.execute({
    fetchOptions: {
      onSuccess: async () => {
        toast.add({ title: 'Success', description: t('login.success'), color: 'success' })
        await navigateTo(resolvePostAuthRedirect('/app'))
      },
      onError: (ctx) => {
        toast.add({ title: 'Error', description: ctx.error.message || t('login.error'), color: 'error' })
      },
    },
  })
}
</script>

<template>
  <UCard class="max-w-md">
    <template #header>
      <h3 class="text-lg md:text-xl font-semibold leading-none tracking-tight">
        {{ t('login.title') }}
      </h3>
      <p class="text-xs md:text-sm text-muted-foreground">
        {{ t('login.subtitle') }}
      </p>
    </template>

    <div class="grid gap-4">
      <div class="grid gap-2">
        <label for="email" class="text-sm font-medium leading-none">{{ t('login.email') }}</label>
        <UInput id="email" v-model="email" type="email" placeholder="m@example.com" />
      </div>

      <div class="grid gap-2">
        <div class="flex items-center">
          <label for="password" class="text-sm font-medium leading-none">{{ t('login.password') }}</label>
          <NuxtLink to="/forget-password" class="ml-auto inline-block text-sm underline">
            {{ t('login.forgotPassword') }}
          </NuxtLink>
        </div>
        <UInput id="password" v-model="password" type="password" placeholder="password" autocomplete="password" />
      </div>

      <UCheckbox id="remember" v-model="rememberMe" :label="t('login.rememberMe')" />

      <UButton block :loading="signInEmail.status.value === 'pending'" @click="handleSignIn">
        {{ t('common.login') }}
      </UButton>

      <div class="w-full gap-2 flex items-center justify-between flex-col">
        <UButton variant="outline" block :loading="signInSocial.status.value === 'pending'" @click="handleSocialSignIn">
          <UIcon name="i-simple-icons-github" />
          <span>Sign in with GitHub</span>
        </UButton>

        <UButton variant="outline" block :loading="signInPasskey.status.value === 'pending'" @click="handlePasskeySignIn">
          <UIcon name="i-lucide-key-round" />
          <span>Sign in with Passkey</span>
        </UButton>
      </div>
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
