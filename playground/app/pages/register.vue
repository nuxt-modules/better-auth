<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const signUpEmail = useSignUp('email')
const { resolvePostAuthRedirect } = usePostAuthRedirect()
const { t } = useI18n()
const toast = useToast()
const emailWarning = useEmailWarning()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const image = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const loading = computed(() => signUpEmail.status.value === 'pending')

function handleImageChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    image.value = file
    if (imagePreview.value)
      URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = URL.createObjectURL(file)
  }
}

function clearImage() {
  image.value = null
  if (imagePreview.value) {
    URL.revokeObjectURL(imagePreview.value)
    imagePreview.value = null
  }
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleSignUp() {
  if (password.value !== passwordConfirm.value) {
    toast.add({ title: 'Error', description: 'Passwords do not match', color: 'error' })
    return
  }

  await signUpEmail.execute(
    {
      email: email.value,
      password: password.value,
      name: `${firstName.value} ${lastName.value}`,
      image: image.value ? await convertImageToBase64(image.value) : undefined,
    },
    {
      onSuccess: () => {
        toast.add({ title: 'Success', description: t('register.success'), color: 'success' })
        emailWarning()
        navigateTo(resolvePostAuthRedirect('/app'))
      },
      onError: (ctx) => {
        toast.add({ title: 'Error', description: ctx.error.message || t('register.error'), color: 'error' })
      },
    },
  )
}
</script>

<template>
  <UCard class="max-w-md">
    <template #header>
      <h3 class="text-lg md:text-xl font-semibold leading-none tracking-tight">
        {{ t('register.title') }}
      </h3>
      <p class="text-xs md:text-sm text-muted-foreground">
        {{ t('register.subtitle') }}
      </p>
    </template>

    <div class="grid gap-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="grid gap-2">
          <label for="first-name" class="text-sm font-medium leading-none">First name</label>
          <UInput id="first-name" v-model="firstName" placeholder="Max" />
        </div>
        <div class="grid gap-2">
          <label for="last-name" class="text-sm font-medium leading-none">Last name</label>
          <UInput id="last-name" v-model="lastName" placeholder="Robinson" />
        </div>
      </div>

      <div class="grid gap-2">
        <label for="email" class="text-sm font-medium leading-none">Email</label>
        <UInput id="email" v-model="email" type="email" placeholder="m@example.com" />
      </div>

      <div class="grid gap-2">
        <label for="password" class="text-sm font-medium leading-none">Password</label>
        <UInput id="password" v-model="password" type="password" placeholder="Password" autocomplete="new-password" />
      </div>

      <div class="grid gap-2">
        <label for="password-confirm" class="text-sm font-medium leading-none">Confirm Password</label>
        <UInput id="password-confirm" v-model="passwordConfirm" type="password" placeholder="Confirm Password" autocomplete="new-password" />
      </div>

      <div class="grid gap-2">
        <label for="image" class="text-sm font-medium leading-none">Profile Image (optional)</label>
        <div class="flex items-end gap-4">
          <div v-if="imagePreview" class="relative size-16 rounded-sm overflow-hidden">
            <img :src="imagePreview" alt="Profile preview" class="object-cover w-full h-full">
          </div>
          <div class="flex items-center gap-2 w-full">
            <UInput id="image" type="file" accept="image/*" @change="handleImageChange" />
            <svg v-if="imagePreview" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="cursor-pointer" @click="clearImage"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </div>
        </div>
      </div>

      <UButton block :loading="loading" @click="handleSignUp">
        Create an account
      </UButton>
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
