<script setup lang="ts">
const { user } = useUserSession()
const client = useAuthClient()
const toast = useToast()

// Type assertion for admin plugin methods
type AsyncFn = (...args: unknown[]) => Promise<unknown>
const adminClient = client as typeof client & {
  admin: { listUsers: AsyncFn, createUser: AsyncFn, banUser: AsyncFn, unbanUser: AsyncFn, impersonateUser: AsyncFn, removeUser: AsyncFn }
}

// Authorization
const isAdmin = computed(() => (user.value as any)?.role === 'admin')
const authError = ref<string | null>(null)

// Users
const users = ref<any[]>([])
const loading = ref(true)
const search = ref('')

async function loadUsers() {
  if (!isAdmin.value) {
    authError.value = 'You need admin privileges to access this page'
    loading.value = false
    return
  }
  loading.value = true
  authError.value = null
  try {
    const res = await adminClient?.admin.listUsers({
      query: { limit: 50, sortBy: 'createdAt', sortDirection: 'desc' },
    })
    users.value = res?.data?.users || []
  }
  catch (e: any) {
    if (e.message?.includes('Unauthorized') || e.message?.includes('admin')) {
      authError.value = 'You need admin privileges to access this page'
    }
    users.value = []
  }
  loading.value = false
}

const filteredUsers = computed(() => {
  if (!search.value)
    return users.value
  const s = search.value.toLowerCase()
  return users.value.filter(u => u.email?.toLowerCase().includes(s) || u.name?.toLowerCase().includes(s))
})

const userColumns = [
  { id: 'email', header: 'Email', accessorKey: 'email' },
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'role', header: 'Role', accessorKey: 'role' },
  { id: 'banned', header: 'Status', accessorKey: 'banned' },
  { id: 'actions', header: '', accessorKey: 'actions' },
]

// Create user
const createOpen = ref(false)
const createForm = reactive({ email: '', password: '', name: '', role: 'user' as 'user' | 'admin' })
const createLoading = ref(false)

async function createUser() {
  createLoading.value = true
  try {
    await adminClient?.admin.createUser({
      email: createForm.email,
      password: createForm.password,
      name: createForm.name,
      role: createForm.role,
    })
    toast.add({ title: 'User created', color: 'success' })
    createOpen.value = false
    createForm.email = ''
    createForm.password = ''
    createForm.name = ''
    createForm.role = 'user'
    await loadUsers()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  createLoading.value = false
}

// Ban user
const banOpen = ref(false)
const banForm = reactive({ userId: '', reason: '', expiresIn: '' })
const banLoading = ref(false)

function openBan(userId: string) {
  banForm.userId = userId
  banForm.reason = ''
  banForm.expiresIn = ''
  banOpen.value = true
}

async function banUser() {
  banLoading.value = true
  try {
    const expiresIn = banForm.expiresIn ? Number.parseInt(banForm.expiresIn) * 60 * 60 * 1000 : undefined
    await adminClient?.admin.banUser({
      userId: banForm.userId,
      banReason: banForm.reason || undefined,
      banExpiresIn: expiresIn,
    })
    toast.add({ title: 'User banned', color: 'success' })
    banOpen.value = false
    await loadUsers()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
  banLoading.value = false
}

async function unbanUser(userId: string) {
  try {
    await adminClient?.admin.unbanUser({ userId })
    toast.add({ title: 'User unbanned', color: 'success' })
    await loadUsers()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
}

// Impersonate
async function impersonate(userId: string) {
  try {
    await adminClient?.admin.impersonateUser({ userId })
    toast.add({ title: 'Now impersonating user', color: 'success' })
    navigateTo('/app')
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
}

// Delete user
async function deleteUser(userId: string) {
  // eslint-disable-next-line no-alert
  if (!confirm('Are you sure you want to delete this user?'))
    return
  try {
    await adminClient?.admin.removeUser({ userId })
    toast.add({ title: 'User deleted', color: 'success' })
    await loadUsers()
  }
  catch (e: any) {
    toast.add({ title: 'Error', description: e.message, color: 'error' })
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <!-- Unauthorized Error -->
    <UAlert v-if="authError" color="neutral" variant="outline" icon="i-lucide-circle-x" :title="authError" class="mb-4 border-s-2 border-s-red-500/50 border-dashed rounded-none [&_svg]:fill-red-500 [&_svg]:text-transparent">
      <template #description>
        Please sign in with an admin account to access the admin dashboard.
      </template>
    </UAlert>

    <UCard v-if="!authError">
      <template #header>
        <div class="flex justify-between items-center gap-4">
          <h1 class="text-xl font-semibold">
            Admin Dashboard
          </h1>
          <div class="flex gap-2">
            <UInput v-model="search" placeholder="Search users..." class="w-48" />
            <UButton @click="createOpen = true">
              <UIcon name="i-lucide-plus" />
              Create User
            </UButton>
          </div>
        </div>
      </template>

      <UTable :loading="loading" :data="filteredUsers" :columns="userColumns">
        <template #email-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :src="row.original.image" :alt="row.original.name" size="xs" />
            <span>{{ row.original.email }}</span>
          </div>
        </template>
        <template #role-cell="{ row }">
          <UBadge :color="row.original.role === 'admin' ? 'primary' : 'neutral'" size="xs">
            {{ row.original.role }}
          </UBadge>
        </template>
        <template #banned-cell="{ row }">
          <UBadge :color="row.original.banned ? 'error' : 'success'" size="xs">
            {{ row.original.banned ? 'Banned' : 'Active' }}
          </UBadge>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" @click="impersonate(row.original.id)">
              <UIcon name="i-lucide-user-check" />
            </UButton>
            <UButton v-if="row.original.banned" size="xs" variant="ghost" color="success" @click="unbanUser(row.original.id)">
              Unban
            </UButton>
            <UButton v-else size="xs" variant="ghost" color="warning" @click="openBan(row.original.id)">
              Ban
            </UButton>
            <UButton size="xs" variant="ghost" color="error" @click="deleteUser(row.original.id)">
              <UIcon name="i-lucide-trash-2" />
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Create User Modal -->
    <UModal v-if="!authError" v-model:open="createOpen">
      <template #header>
        Create New User
      </template>
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField label="Email">
            <UInput v-model="createForm.email" type="email" />
          </UFormField>
          <UFormField label="Password">
            <UInput v-model="createForm.password" type="password" />
          </UFormField>
          <UFormField label="Name">
            <UInput v-model="createForm.name" />
          </UFormField>
          <UFormField label="Role">
            <USelect v-model="createForm.role" :options="['user', 'admin']" />
          </UFormField>
          <UButton block :loading="createLoading" @click="createUser">
            Create User
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Ban User Modal -->
    <UModal v-if="!authError" v-model:open="banOpen">
      <template #header>
        Ban User
      </template>
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField label="Reason (optional)">
            <UInput v-model="banForm.reason" placeholder="Reason for ban" />
          </UFormField>
          <UFormField label="Duration (hours, leave empty for permanent)">
            <UInput v-model="banForm.expiresIn" type="number" placeholder="e.g. 24" />
          </UFormField>
          <UButton block color="error" :loading="banLoading" @click="banUser">
            Ban User
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
