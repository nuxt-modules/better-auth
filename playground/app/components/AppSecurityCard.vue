<script setup lang="ts">
import type { Ref } from 'vue'

type AsyncFn = (...args: unknown[]) => Promise<unknown>
interface PasskeyRecord { id: string, name?: string | null }

const { user, client } = useUserSession()
const { t } = useI18n()
const toast = useToast()

const authClient = client as typeof client & {
  twoFactor: { enable: AsyncFn, disable: AsyncFn, verifyTotp: AsyncFn }
  passkey: { addPasskey: AsyncFn, deletePasskey: AsyncFn }
  useListPasskeys: () => Ref<{ data?: PasskeyRecord[] } | undefined>
}

const twoFaOpen = ref(false)
const twoFaPassword = ref('')
const twoFaUri = ref('')
const twoFaCode = ref('')
const twoFaLoading = ref(false)

const passkeysRef = authClient?.useListPasskeys()
const passkeys = computed(() => passkeysRef?.value?.data || [])
const passkeyOpen = ref(false)
const passkeyName = ref('')
const passkeyLoading = ref(false)

async function enable2FA() {
  twoFaLoading.value = true
  try {
    if (twoFaUri.value) {
      const res = await authClient?.twoFactor.verifyTotp({ code: twoFaCode.value })
      if (res?.data) {
        toast.add({ title: t('app.twoFactorEnabledSuccess'), color: 'success' })
        twoFaOpen.value = false
        twoFaUri.value = ''
        twoFaCode.value = ''
      }
      else {
        toast.add({ title: t('app.invalidCode'), color: 'error' })
      }
    }
    else {
      const res = await authClient?.twoFactor.enable({ password: twoFaPassword.value })
      if (res?.data?.totpURI) {
        twoFaUri.value = res.data.totpURI
      }
      else {
        toast.add({ title: 'Error', description: 'Failed to enable 2FA', color: 'error' })
      }
    }
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  twoFaLoading.value = false
}

async function disable2FA() {
  twoFaLoading.value = true
  try {
    await authClient?.twoFactor.disable({ password: twoFaPassword.value })
    toast.add({ title: t('app.twoFactorDisabledSuccess'), color: 'success' })
    twoFaOpen.value = false
    twoFaPassword.value = ''
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  twoFaLoading.value = false
}

async function addPasskey() {
  passkeyLoading.value = true
  try {
    await authClient?.passkey.addPasskey({ name: passkeyName.value || 'My Passkey' })
    toast.add({ title: t('app.passkeyAdded'), color: 'success' })
    passkeyOpen.value = false
    passkeyName.value = ''
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  passkeyLoading.value = false
}

async function deletePasskey(id: string) {
  await authClient?.passkey.deletePasskey({ id })
  toast.add({ title: t('app.passkeyDeleted'), color: 'success' })
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">
        {{ t('app.security') }}
      </h2>
    </template>

    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <p class="font-medium">
            {{ t('app.twoFactor') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ user?.twoFactorEnabled ? t('app.twoFactorEnabled') : t('app.twoFactorDisabled') }}
          </p>
        </div>
        <UButton :color="user?.twoFactorEnabled ? 'error' : 'primary'" variant="soft" @click="twoFaOpen = true">
          {{ user?.twoFactorEnabled ? t('app.disable2fa') : t('app.enable2fa') }}
        </UButton>
      </div>

      <UDivider />

      <div class="flex justify-between items-center">
        <div>
          <p class="font-medium">
            {{ t('app.passkeys') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ passkeys.length }} {{ t('app.registered') }}
          </p>
        </div>
        <UButton variant="soft" @click="passkeyOpen = true">
          {{ t('app.addPasskey') }}
        </UButton>
      </div>

      <div v-if="passkeys.length" class="space-y-2">
        <div v-for="pk in passkeys" :key="pk.id" class="flex justify-between items-center p-2 bg-muted rounded">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-key-round" />
            <span class="text-sm">{{ pk.name || 'Passkey' }}</span>
          </div>
          <UButton size="xs" color="error" variant="ghost" @click="deletePasskey(pk.id)">
            <UIcon name="i-lucide-trash-2" />
          </UButton>
        </div>
      </div>
    </div>
  </UCard>

  <UModal v-model:open="twoFaOpen">
    <template #header>
      {{ user?.twoFactorEnabled ? t('app.disable2fa') : t('app.enable2fa') }}
    </template>
    <template #body>
      <div class="space-y-4 p-4">
        <template v-if="twoFaUri">
          <div class="flex justify-center">
            <QRCode :value="twoFaUri" :size="200" />
          </div>
          <p class="text-sm text-center text-muted-foreground">
            {{ t('app.scanQr') }}
          </p>
          <UFormField :label="t('app.verificationCode')">
            <UInput v-model="twoFaCode" inputmode="numeric" maxlength="6" :placeholder="t('app.enterCode')" />
          </UFormField>
          <UButton block :loading="twoFaLoading" @click="enable2FA">
            {{ t('app.verifyEnable') }}
          </UButton>
        </template>
        <template v-else>
          <UFormField :label="t('common.password')">
            <UInput v-model="twoFaPassword" type="password" :placeholder="t('common.password')" />
          </UFormField>
          <UButton block :loading="twoFaLoading" @click="user?.twoFactorEnabled ? disable2FA() : enable2FA()">
            {{ user?.twoFactorEnabled ? t('app.disable2fa') : t('app.continue') }}
          </UButton>
        </template>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="passkeyOpen">
    <template #header>
      {{ t('app.addPasskey') }}
    </template>
    <template #body>
      <div class="space-y-4 p-4">
        <UFormField :label="t('app.passkeyName')">
          <UInput v-model="passkeyName" placeholder="My Passkey" />
        </UFormField>
        <UButton block :loading="passkeyLoading" @click="addPasskey">
          {{ t('app.createPasskey') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
