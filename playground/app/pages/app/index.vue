<script setup lang="ts">
const { user, session, loggedIn } = useUserSession()
const client = useAuthClient()
const { t, locale } = useI18n()
const toast = useToast()
const emailWarning = useEmailWarning()
const { signOutPending, signOut: handleSignOut } = usePlaygroundSignOut()

const authClient = client as typeof client & {
  getLastUsedLoginMethod: () => string | null
}

const lastLoginMethod = ref<string | null>(null)
const isAuthUiActive = computed(() => loggedIn.value && Boolean(client) && !signOutPending.value)
const sessionsRequestId = ref(0)

// Profile editing
const editOpen = ref(false)
const editForm = reactive({ name: '' })
const editLoading = ref(false)

function openEdit() {
  editForm.name = user.value?.name || ''
  editOpen.value = true
}

async function saveProfile() {
  editLoading.value = true
  try {
    await client?.updateUser({ name: editForm.name })
    toast.add({ title: t('app.profileUpdated'), color: 'success' })
    editOpen.value = false
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  editLoading.value = false
}

// Email verification
const verifyLoading = ref(false)
async function resendVerification() {
  verifyLoading.value = true
  try {
    await client?.sendVerificationEmail({ email: user.value?.email || '' })
    toast.add({ title: t('app.verificationSent'), color: 'success' })
    emailWarning()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  verifyLoading.value = false
}

// Sessions
const sessions = ref<any[]>([])
const sessionsLoading = ref(false)

async function loadSessions() {
  if (!isAuthUiActive.value) {
    sessions.value = []
    sessionsLoading.value = false
    return
  }

  const requestId = ++sessionsRequestId.value
  sessionsLoading.value = true
  try {
    const res = await client?.listSessions()
    if (requestId === sessionsRequestId.value && isAuthUiActive.value)
      sessions.value = res?.data || []
  }
  catch {
    if (requestId === sessionsRequestId.value)
      sessions.value = []
  }
  finally {
    if (requestId === sessionsRequestId.value)
      sessionsLoading.value = false
  }
}

async function terminateSession(token: string) {
  if (!isAuthUiActive.value)
    return
  await client?.revokeSession({ token })
  sessions.value = sessions.value.filter(s => s.token !== token)
  toast.add({ title: t('app.sessionTerminated'), color: 'success' })
}

const sessionColumns = computed(() => [
  { id: 'userAgent', header: t('app.device'), accessorKey: 'userAgent' },
  { id: 'createdAt', header: t('app.created'), accessorKey: 'createdAt' },
  { id: 'actions', header: '', accessorKey: 'actions' },
])

// Password change
const passwordOpen = ref(false)
const passwordForm = reactive({ current: '', new: '', confirm: '', revokeOthers: false })
const passwordLoading = ref(false)

async function changePassword() {
  if (passwordForm.new !== passwordForm.confirm) {
    toast.add({ title: t('app.passwordsNoMatch'), color: 'error' })
    return
  }
  passwordLoading.value = true
  try {
    await client?.changePassword({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new,
      revokeOtherSessions: passwordForm.revokeOthers,
    })
    toast.add({ title: t('app.passwordChanged'), color: 'success' })
    passwordOpen.value = false
    passwordForm.current = ''
    passwordForm.new = ''
    passwordForm.confirm = ''
    passwordForm.revokeOthers = false
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  passwordLoading.value = false
}

function resetDashboardState() {
  sessionsRequestId.value += 1
  sessions.value = []
  sessionsLoading.value = false
  lastLoginMethod.value = null
  editOpen.value = false
  passwordOpen.value = false
}

watch(isAuthUiActive, (active) => {
  if (!active) {
    resetDashboardState()
    return
  }

  lastLoginMethod.value = authClient?.getLastUsedLoginMethod?.() || null
  void loadSessions()
}, { immediate: true })

watch(signOutPending, (pending) => {
  if (pending)
    resetDashboardState()
})

async function handlePageSignOut() {
  resetDashboardState()
  await handleSignOut()
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4 space-y-6">
    <!-- Profile Card -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">
            {{ t('app.profile') }}
          </h2>
          <UButton size="sm" variant="soft" @click="openEdit">
            <UIcon name="i-lucide-pencil" />
            {{ t('common.edit') }}
          </UButton>
        </div>
      </template>

      <div class="flex items-center gap-4">
        <UAvatar :src="user?.image ?? undefined" :alt="user?.name ?? undefined" size="lg" />
        <div>
          <p class="font-medium">
            {{ user?.name || t('app.noName') }}
          </p>
          <div class="flex items-center gap-2">
            <p class="text-sm text-muted-foreground">
              {{ user?.email }}
            </p>
            <UBadge v-if="lastLoginMethod" size="xs" variant="subtle" color="neutral">
              via {{ lastLoginMethod }}
            </UBadge>
          </div>
        </div>
      </div>

      <UAlert v-if="!user?.emailVerified" :title="t('app.emailNotVerified')" icon="i-lucide-triangle-alert" color="neutral" variant="outline" class="mt-4 border-s-2 border-s-orange-500/50 border-dashed rounded-none [&_svg]:fill-orange-500 [&_svg]:text-transparent">
        <template #description>
          <UButton size="xs" variant="soft" :loading="verifyLoading" @click="resendVerification">
            {{ t('app.resendVerification') }}
          </UButton>
        </template>
      </UAlert>
    </UCard>

    <!-- Active Sessions -->
    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">
            {{ t('app.activeSessions') }}
          </h2>
          <UButton size="sm" variant="ghost" @click="loadSessions">
            <UIcon name="i-lucide-refresh-cw" />
          </UButton>
        </div>
      </template>

      <UTable :loading="sessionsLoading" :data="sessions" :columns="sessionColumns">
        <template #userAgent-cell="{ row }">
          <div class="flex items-center gap-2 max-w-xs">
            <UIcon :name="row.original.userAgent?.includes('Mobile') ? 'i-lucide-smartphone' : 'i-lucide-monitor'" />
            <span class="text-sm truncate">{{ row.original.userAgent?.substring(0, 40) }}...</span>
            <UBadge v-if="row.original.id === session?.id" size="xs" color="primary">
              {{ t('app.current') }}
            </UBadge>
          </div>
        </template>
        <template #createdAt-cell="{ row }">
          <NuxtTime
            :datetime="row.original.createdAt"
            :locale="locale"
            year="numeric"
            month="short"
            day="numeric"
            class="text-sm text-muted-foreground"
          />
        </template>
        <template #actions-cell="{ row }">
          <UButton size="xs" :color="row.original.id === session?.id ? 'error' : 'neutral'" variant="soft" @click="terminateSession(row.original.token)">
            {{ row.original.id === session?.id ? t('common.signOut') : t('app.revoke') }}
          </UButton>
        </template>
      </UTable>
    </UCard>

    <AppSecurityCard v-if="isAuthUiActive" />

    <!-- Actions -->
    <div class="flex justify-between">
      <UButton variant="outline" @click="passwordOpen = true">
        <UIcon name="i-lucide-lock" />
        {{ t('app.changePassword') }}
      </UButton>
      <UButton color="error" variant="soft" :loading="signOutPending" @click="handlePageSignOut">
        <UIcon name="i-lucide-log-out" />
        {{ t('common.signOut') }}
      </UButton>
    </div>

    <!-- Edit Profile Modal -->
    <UModal v-model:open="editOpen">
      <template #header>
        {{ t('app.editProfile') }}
      </template>
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField :label="t('app.name')">
            <UInput v-model="editForm.name" />
          </UFormField>
          <UButton block :loading="editLoading" @click="saveProfile">
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Change Password Modal -->
    <UModal v-model:open="passwordOpen">
      <template #header>
        {{ t('app.changePassword') }}
      </template>
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField :label="t('app.currentPassword')">
            <UInput v-model="passwordForm.current" type="password" />
          </UFormField>
          <UFormField :label="t('app.newPassword')">
            <UInput v-model="passwordForm.new" type="password" />
          </UFormField>
          <UFormField :label="t('app.confirmNewPassword')">
            <UInput v-model="passwordForm.confirm" type="password" />
          </UFormField>
          <UCheckbox v-model="passwordForm.revokeOthers" :label="t('app.signOutOthers')" />
          <UButton block :loading="passwordLoading" @click="changePassword">
            {{ t('app.changePassword') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
