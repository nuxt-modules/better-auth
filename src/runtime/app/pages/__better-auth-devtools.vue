<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { refDebounced } from '@vueuse/core'

definePageMeta({ layout: false })

const toast = useToast()
const devtoolsClient = useDevtoolsClient()
const runtimeConfig = useRuntimeConfig()
const hasDb = computed(() => (runtimeConfig.public.auth as { useDatabase?: boolean } | undefined)?.useDatabase ?? false)

// Sync color mode with host app
const isDark = computed(() => devtoolsClient.value?.host?.app?.colorMode?.value === 'dark')

// Apply dark class to html element
watchEffect(() => {
  if (import.meta.client) {
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

const sessionsPage = ref(1)
const usersPage = ref(1)
const accountsPage = ref(1)
const deleteConfirm = ref<string | null>(null)

// Search with debounce - use v-model on raw refs, query uses debounced versions
const sessionsSearchRaw = ref('')
const usersSearchRaw = ref('')
const accountsSearchRaw = ref('')
const sessionsSearch = refDebounced(sessionsSearchRaw, 300)
const usersSearch = refDebounced(usersSearchRaw, 300)
const accountsSearch = refDebounced(accountsSearchRaw, 300)

// Reset page when search changes
watch(sessionsSearch, () => sessionsPage.value = 1)
watch(usersSearch, () => usersPage.value = 1)
watch(accountsSearch, () => accountsPage.value = 1)

const sessionsQuery = computed(() => ({ page: sessionsPage.value, limit: 20, search: sessionsSearch.value }))
const usersQuery = computed(() => ({ page: usersPage.value, limit: 20, search: usersSearch.value }))
const accountsQuery = computed(() => ({ page: accountsPage.value, limit: 20, search: accountsSearch.value }))

const { data: sessionsData, refresh: refreshSessions } = await useFetch('/api/_better-auth/sessions', { query: sessionsQuery, immediate: hasDb.value })
const { data: usersData, refresh: refreshUsers } = await useFetch('/api/_better-auth/users', { query: usersQuery, immediate: hasDb.value })
const { data: accountsData, refresh: refreshAccounts } = await useFetch('/api/_better-auth/accounts', { query: accountsQuery, immediate: hasDb.value })
const { data: configData } = await useFetch('/api/_better-auth/config')

const tabs = computed(() => {
  const dbTabs = [
    { label: 'Sessions', value: 'sessions', icon: 'i-lucide-key', slot: 'sessions' },
    { label: 'Users', value: 'users', icon: 'i-lucide-users', slot: 'users' },
    { label: 'Accounts', value: 'accounts', icon: 'i-lucide-link', slot: 'accounts' },
  ]
  const configTab = { label: 'Config', value: 'config', icon: 'i-lucide-settings', slot: 'config' }
  return hasDb.value ? [...dbTabs, configTab] : [configTab]
})

function isExpired(date: string | Date | null | undefined): boolean {
  if (!date)
    return false
  return new Date(date) < new Date()
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date)
    return '-'
  return new Date(date).toLocaleString()
}

function truncate(str: string | null | undefined, len = 12): string {
  if (!str)
    return '-'
  if (str.length <= len)
    return str
  const half = Math.floor((len - 1) / 2)
  return `${str.slice(0, half)}…${str.slice(-half)}`
}

async function copyToClipboard(text: string, label = 'Value') {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: `${label} copied`, icon: 'i-lucide-check', color: 'success' })
  }
  catch {
    toast.add({ title: 'Copy failed', icon: 'i-lucide-x', color: 'error' })
  }
}

function generateConfigMarkdown() {
  const config = configData.value?.config
  if (!config)
    return ''

  const moduleJson = JSON.stringify(config.module, null, 2)
  const serverJson = JSON.stringify(config.server, null, 2)

  return `## Module Config (\`nuxt.config.ts\`)

\`\`\`json
${moduleJson}
\`\`\`

## Server Config (\`server/auth.config.ts\`)

\`\`\`json
${serverJson}
\`\`\`
`
}

async function deleteSession(id: string) {
  try {
    await $fetch('/api/_better-auth/sessions', { method: 'DELETE', body: { id } })
    toast.add({ title: 'Session deleted', icon: 'i-lucide-trash-2', color: 'success' })
    deleteConfirm.value = null
    refreshSessions()
  }
  catch {
    toast.add({ title: 'Failed to delete session', icon: 'i-lucide-x', color: 'error' })
  }
}

interface SessionRow { id: string, userId: string, ipAddress: string | null, userAgent: string | null, expiresAt: string | null, createdAt: string }
interface UserRow { id: string, name: string | null, email: string, emailVerified: boolean, createdAt: string }
interface AccountRow { id: string, providerId: string, accountId: string, userId: string, createdAt: string }

const sessionColumns: TableColumn<SessionRow>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, truncate(row.original.id)) },
  {
    accessorKey: 'userId',
    header: 'User',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('p', { class: 'font-mono text-sm truncate' }, truncate(row.original.userId)),
      h('p', { class: 'text-sm text-muted-foreground font-mono' }, row.original.ipAddress || 'No IP'),
    ]),
  },
  { accessorKey: 'userAgent', header: 'User Agent', cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground max-w-48 truncate block' }, truncate(row.original.userAgent, 30)) },
  {
    accessorKey: 'expiresAt',
    header: 'Status',
    cell: ({ row }) => {
      const expired = isExpired(row.original.expiresAt)
      return h(resolveComponent('UBadge'), { color: expired ? 'error' : 'success', variant: 'subtle', size: 'sm' }, () => expired ? 'Expired' : 'Active')
    },
  },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, formatDate(row.original.createdAt)) },
]

const userColumns: TableColumn<UserRow>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, truncate(row.original.id)) },
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => h('div', { class: 'min-w-0' }, [
      h('p', { class: 'font-medium truncate' }, row.original.name || 'Unnamed'),
      h('p', { class: 'text-sm text-muted-foreground font-mono truncate' }, row.original.email),
    ]),
  },
  {
    accessorKey: 'emailVerified',
    header: 'Verified',
    cell: ({ row }) => h(resolveComponent('UBadge'), { color: row.original.emailVerified ? 'success' : 'neutral', variant: 'subtle', size: 'sm' }, () => row.original.emailVerified ? 'Yes' : 'No'),
  },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, formatDate(row.original.createdAt)) },
]

const accountColumns: TableColumn<AccountRow>[] = [
  { accessorKey: 'id', header: 'ID', cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, truncate(row.original.id)) },
  {
    accessorKey: 'providerId',
    header: 'Provider',
    cell: ({ row }) => {
      const provider = row.original.providerId
      const iconMap: Record<string, string> = { github: 'i-simple-icons-github', google: 'i-simple-icons-google', discord: 'i-simple-icons-discord', twitter: 'i-simple-icons-x', facebook: 'i-simple-icons-facebook' }
      return h('div', { class: 'flex items-center gap-2' }, [
        h(resolveComponent('UIcon'), { name: iconMap[provider] || 'i-lucide-key', class: 'size-4' }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'capitalize font-medium' }, provider),
          h('p', { class: 'text-sm text-muted-foreground font-mono truncate' }, truncate(row.original.accountId, 16)),
        ]),
      ])
    },
  },
  { accessorKey: 'userId', header: 'User ID', cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, truncate(row.original.userId)) },
  { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => h('span', { class: 'text-sm text-muted-foreground' }, formatDate(row.original.createdAt)) },
]

function getSessionActions(row: SessionRow) {
  return [
    [{ label: 'Copy ID', icon: 'i-lucide-copy', click: () => copyToClipboard(row.id, 'Session ID') }],
    [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, click: () => { deleteConfirm.value = row.id } }],
  ]
}

function getUserActions(row: UserRow) {
  return [
    [{ label: 'Copy ID', icon: 'i-lucide-copy', click: () => copyToClipboard(row.id, 'User ID') }],
    [{ label: 'Copy Email', icon: 'i-lucide-mail', click: () => copyToClipboard(row.email, 'Email') }],
  ]
}

function getAccountActions(row: AccountRow) {
  return [[{ label: 'Copy ID', icon: 'i-lucide-copy', click: () => copyToClipboard(row.id, 'Account ID') }]]
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- Header -->
    <header class="flex items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-3">
        <svg width="60" height="45" viewBox="0 0 60 45" fill="none" class="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z" class="fill-current" />
        </svg>
        <span class="font-medium text-sm">Better Auth DevTools</span>
      </div>
      <div class="flex items-center">
        <a href="https://www.better-auth.com/docs" target="_blank" class="header-link border-r border-border">Docs</a>
        <a href="https://github.com/onmax/nuxt-better-auth" target="_blank" class="header-link">
          <UIcon name="i-simple-icons-github" class="size-4" />
        </a>
      </div>
    </header>

    <!-- Tabs -->
    <UTabs :items="tabs" class="w-full" :ui="{ list: 'border-b border-border rounded-none bg-transparent justify-start', trigger: 'rounded-none data-[state=active]:shadow-none data-[state=active]:bg-[var(--tab-active-bg)] data-[state=active]:text-foreground flex-none text-muted-foreground' }">
      <!-- Sessions Tab -->
      <template #sessions>
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <UInput v-model="sessionsSearchRaw" placeholder="Search by user ID or IP..." icon="i-lucide-search" class="max-w-xs" />
            <div class="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>{{ sessionsData?.total ?? 0 }} sessions</span>
              <UButton variant="ghost" size="xs" icon="i-lucide-refresh-cw" @click="() => refreshSessions()" />
            </div>
          </div>

          <UAlert v-if="deleteConfirm" title="Delete session?" description="This will invalidate the session immediately." color="error" variant="soft" icon="i-lucide-alert-triangle" :actions="[{ label: 'Cancel', color: 'neutral', variant: 'outline', onClick: () => { deleteConfirm = null } }, { label: 'Delete', color: 'error', onClick: () => deleteSession(deleteConfirm!) }]" />

          <p v-if="sessionsData?.error" class="text-destructive text-sm">
            {{ sessionsData.error }}
          </p>

          <UTable v-else-if="sessionsData?.sessions?.length" :data="(sessionsData.sessions as SessionRow[])" :columns="sessionColumns" class="rounded-none border border-border">
            <template #actions="{ row }">
              <UDropdownMenu :items="getSessionActions(row.original)">
                <UButton variant="ghost" size="xs" icon="i-lucide-more-horizontal" />
              </UDropdownMenu>
            </template>
          </UTable>

          <p v-else class="text-muted-foreground text-sm py-8 text-center">
            No sessions found
          </p>

          <UPagination v-if="(sessionsData?.total ?? 0) > 20" v-model:page="sessionsPage" :total="sessionsData?.total ?? 0" :items-per-page="20" />
        </div>
      </template>

      <!-- Users Tab -->
      <template #users>
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <UInput v-model="usersSearchRaw" placeholder="Search by name or email..." icon="i-lucide-search" class="max-w-xs" />
            <div class="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>{{ usersData?.total ?? 0 }} users</span>
              <UButton variant="ghost" size="xs" icon="i-lucide-refresh-cw" @click="() => refreshUsers()" />
            </div>
          </div>

          <p v-if="usersData?.error" class="text-destructive text-sm">
            {{ usersData.error }}
          </p>

          <UTable v-else-if="usersData?.users?.length" :data="(usersData.users as UserRow[])" :columns="userColumns" class="rounded-none border border-border">
            <template #actions="{ row }">
              <UDropdownMenu :items="getUserActions(row.original)">
                <UButton variant="ghost" size="xs" icon="i-lucide-more-horizontal" />
              </UDropdownMenu>
            </template>
          </UTable>

          <p v-else class="text-muted-foreground text-sm py-8 text-center">
            No users found
          </p>

          <UPagination v-if="(usersData?.total ?? 0) > 20" v-model:page="usersPage" :total="usersData?.total ?? 0" :items-per-page="20" />
        </div>
      </template>

      <!-- Accounts Tab -->
      <template #accounts>
        <div class="p-4 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <UInput v-model="accountsSearchRaw" placeholder="Search by provider..." icon="i-lucide-search" class="max-w-xs" />
            <div class="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <span>{{ accountsData?.total ?? 0 }} accounts</span>
              <UButton variant="ghost" size="xs" icon="i-lucide-refresh-cw" @click="() => refreshAccounts()" />
            </div>
          </div>

          <p v-if="accountsData?.error" class="text-destructive text-sm">
            {{ accountsData.error }}
          </p>

          <UTable v-else-if="accountsData?.accounts?.length" :data="(accountsData.accounts as AccountRow[])" :columns="accountColumns" class="rounded-none border border-border">
            <template #actions="{ row }">
              <UDropdownMenu :items="getAccountActions(row.original)">
                <UButton variant="ghost" size="xs" icon="i-lucide-more-horizontal" />
              </UDropdownMenu>
            </template>
          </UTable>

          <p v-else class="text-muted-foreground text-sm py-8 text-center">
            No accounts found
          </p>

          <UPagination v-if="(accountsData?.total ?? 0) > 20" v-model:page="accountsPage" :total="accountsData?.total ?? 0" :items-per-page="20" />
        </div>
      </template>

      <!-- Config Tab -->
      <template #config>
        <div class="p-3 space-y-3">
          <div class="flex items-center justify-end">
            <UButton variant="ghost" size="xs" icon="i-lucide-copy" @click="copyToClipboard(generateConfigMarkdown(), 'Config')">
              Copy
            </UButton>
          </div>

          <p v-if="configData?.error" class="text-destructive text-sm">
            {{ configData.error }}
          </p>

          <template v-else-if="configData?.config?.server">
            <!-- Row 1: Endpoints + Session + Auth Methods -->
            <div class="grid gap-3 md:grid-cols-3">
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-globe" class="size-4" /><span>Endpoints</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Base URL</span><span class="font-mono">{{ configData.config.server.baseURL || 'auto' }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Path</span><span class="font-mono">{{ configData.config.server.basePath }}</span>
                </div>
              </div>
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-clock" class="size-4" /><span>Session</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Expires</span><span class="font-mono">{{ configData.config.server.session?.expiresIn }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Update</span><span class="font-mono">{{ configData.config.server.session?.updateAge }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Cache</span><UBadge :color="configData.config.server.session?.cookieCache ? 'success' : 'neutral'" variant="subtle" size="sm">
                    {{ configData.config.server.session?.cookieCache ? 'On' : 'Off' }}
                  </UBadge>
                </div>
              </div>
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-key-round" class="size-4" /><span>Auth</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  <UBadge v-if="configData.config.server.emailAndPassword" variant="subtle" color="success" size="sm">
                    Email
                  </UBadge>
                  <UBadge v-for="provider in configData.config.server.socialProviders" :key="provider" variant="subtle" color="neutral" size="sm" class="capitalize">
                    {{ provider }}
                  </UBadge>
                  <span v-if="!configData.config.server.emailAndPassword && !configData.config.server.socialProviders?.length" class="text-muted-foreground text-sm">None</span>
                </div>
              </div>
            </div>

            <!-- Row 2: Security + Module + Plugins -->
            <div class="grid gap-3 md:grid-cols-3">
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-shield" class="size-4" /><span>Security</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Cookies</span><span class="font-mono">{{ configData.config.server.advanced?.useSecureCookies }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">CSRF</span><UBadge :color="configData.config.server.advanced?.disableCSRFCheck ? 'error' : 'success'" variant="subtle" size="sm">
                    {{ configData.config.server.advanced?.disableCSRFCheck ? 'Off' : 'On' }}
                  </UBadge>
                </div>
                <div class="config-row">
                  <span class="config-label">Rate Limit</span><UBadge :color="configData.config.server.rateLimit ? 'success' : 'neutral'" variant="subtle" size="sm">
                    {{ configData.config.server.rateLimit ? 'On' : 'Off' }}
                  </UBadge>
                </div>
              </div>
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-settings-2" class="size-4" /><span>Module</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Login</span><span class="font-mono">{{ configData.config.module?.redirects?.login }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">Guest</span><span class="font-mono">{{ configData.config.module?.redirects?.guest }}</span>
                </div>
                <div class="config-row">
                  <span class="config-label">DB</span><UBadge :color="configData.config.module?.databaseProvider === 'none' ? 'neutral' : 'success'" variant="subtle" size="sm">
                    {{ configData.config.module?.databaseProvider === 'nuxthub' ? 'Hub' : 'Off' }}
                  </UBadge>
                </div>
                <div class="config-row">
                  <span class="config-label">KV</span><UBadge :color="configData.config.module?.secondaryStorage ? 'success' : 'neutral'" variant="subtle" size="sm">
                    {{ configData.config.module?.secondaryStorage ? 'On' : 'Off' }}
                  </UBadge>
                </div>
              </div>
              <div class="config-section">
                <div class="config-header">
                  <UIcon name="i-lucide-puzzle" class="size-4" /><span>Plugins</span>
                </div>
                <div class="flex flex-wrap gap-1">
                  <UBadge v-for="plugin in configData.config.server.plugins" :key="plugin" variant="subtle" color="neutral" size="sm">
                    {{ plugin }}
                  </UBadge>
                  <span v-if="!configData.config.server.plugins?.length" class="text-muted-foreground text-sm">None</span>
                </div>
              </div>
            </div>

            <!-- Trusted Origins (if any) -->
            <div v-if="configData.config.server.trustedOrigins?.length" class="config-section">
              <div class="config-header">
                <UIcon name="i-lucide-shield-check" class="size-4" /><span>Trusted Origins</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <UBadge v-for="origin in configData.config.server.trustedOrigins" :key="origin" variant="subtle" color="neutral" size="sm" class="font-mono">
                  {{ origin }}
                </UBadge>
              </div>
            </div>
          </template>
        </div>
      </template>
    </UTabs>
  </div>
</template>

<style>
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(20 14.3% 4.1%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(20 14.3% 4.1%);
  --muted-foreground: hsl(25 5.3% 44.7%);
  --border: hsl(20 5.9% 90%);
  --destructive: hsl(0 84.2% 60.2%);
  --tab-active-bg: hsl(20 5.9% 93%);
}

.dark {
  --background: hsl(20 14.3% 4.1%);
  --foreground: hsl(60 9.1% 97.8%);
  --card: hsl(20 14.3% 4.1%);
  --card-foreground: hsl(60 9.1% 97.8%);
  --muted-foreground: hsl(24 5.4% 63.9%);
  --border: hsl(12 6.5% 15.1%);
  --destructive: hsl(0 62.8% 30.6%);
  --tab-active-bg: hsl(12 6.5% 15.1%);
}

.bg-background { background-color: var(--background); }
.text-foreground { color: var(--foreground); }
.text-muted-foreground { color: var(--muted-foreground); }
.text-destructive { color: var(--destructive); }
.border-border { border-color: var(--border); }

.header-link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  transition: color 0.2s;
}

.header-link:hover {
  color: var(--foreground);
}

.header-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0.75rem;
  right: 0.75rem;
  height: 1px;
  background: var(--foreground);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease-out;
}

.header-link:hover::after {
  transform: scaleX(1);
}

.config-section {
  border: 1px solid var(--border);
  padding: 0.5rem;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--muted-foreground);
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  padding: 0.125rem 0;
}

.config-label {
  color: var(--muted-foreground);
}
</style>
