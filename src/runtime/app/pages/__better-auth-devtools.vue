<script setup lang="ts">
import { useFetch, useRuntimeConfig } from '#imports'
import { useDevtoolsClient } from '@nuxt/devtools-kit/iframe-client'
import { computed, ref, watch, watchEffect } from 'vue'

const pageSize = 20

const tabLabels = {
  sessions: 'Sessions',
  users: 'Users',
  accounts: 'Accounts',
  config: 'Config',
} as const

type Tab = keyof typeof tabLabels

interface SessionRow { id: string, userId: string, ipAddress: string | null, userAgent: string | null, expiresAt: string | null, createdAt: string }
interface UserRow { id: string, name: string | null, email: string, emailVerified: boolean, createdAt: string }
interface AccountRow { id: string, providerId: string, accountId: string, userId: string, createdAt: string }
interface PagedResponse<T> { total?: number, error?: string, [key: string]: T[] | number | string | undefined }
interface ConfigResponse { error?: string, config?: { module?: Record<string, unknown>, server?: Record<string, unknown> } }

const devtoolsClient = useDevtoolsClient()
const runtimeConfig = useRuntimeConfig()
const hasDb = computed(() => (runtimeConfig.public.auth as { useDatabase?: boolean } | undefined)?.useDatabase ?? false)
const isDark = computed(() => devtoolsClient.value?.host?.app?.colorMode?.value === 'dark')

watchEffect(() => {
  if (import.meta.client)
    document.documentElement.classList.toggle('dark', isDark.value)
})

const activeTab = ref<Tab>(hasDb.value ? 'sessions' : 'config')
const tabs = computed<Tab[]>(() => hasDb.value ? ['sessions', 'users', 'accounts', 'config'] : ['config'])

watch(hasDb, (enabled) => {
  if (!enabled)
    activeTab.value = 'config'
})

const sessionsPage = ref(1)
const usersPage = ref(1)
const accountsPage = ref(1)
const deleteConfirm = ref<string | null>(null)
const notice = ref('')

const sessionsSearch = ref('')
const usersSearch = ref('')
const accountsSearch = ref('')

watch(sessionsSearch, () => sessionsPage.value = 1)
watch(usersSearch, () => usersPage.value = 1)
watch(accountsSearch, () => accountsPage.value = 1)

const sessionsQuery = computed(() => ({ page: sessionsPage.value, limit: pageSize, search: sessionsSearch.value }))
const usersQuery = computed(() => ({ page: usersPage.value, limit: pageSize, search: usersSearch.value }))
const accountsQuery = computed(() => ({ page: accountsPage.value, limit: pageSize, search: accountsSearch.value }))

const { data: sessionsData, refresh: refreshSessions } = await useFetch<PagedResponse<SessionRow>>('/api/_better-auth/sessions', { query: sessionsQuery, immediate: hasDb.value })
const { data: usersData, refresh: refreshUsers } = await useFetch<PagedResponse<UserRow>>('/api/_better-auth/users', { query: usersQuery, immediate: hasDb.value })
const { data: accountsData, refresh: refreshAccounts } = await useFetch<PagedResponse<AccountRow>>('/api/_better-auth/accounts', { query: accountsQuery, immediate: hasDb.value })
const { data: configData } = await useFetch<ConfigResponse>('/api/_better-auth/config')

const sessions = computed(() => (sessionsData.value?.sessions as SessionRow[] | undefined) ?? [])
const users = computed(() => (usersData.value?.users as UserRow[] | undefined) ?? [])
const accounts = computed(() => (accountsData.value?.accounts as AccountRow[] | undefined) ?? [])

let noticeTimer: ReturnType<typeof setTimeout> | undefined

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer)
    clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => notice.value = '', 2200)
}

function isExpired(date: string | Date | null | undefined): boolean {
  return date ? new Date(date) < new Date() : false
}

function formatDate(date: string | Date | null | undefined): string {
  return date ? new Date(date).toLocaleString() : '-'
}

function truncate(str: string | null | undefined, len = 14): string {
  if (!str)
    return '-'
  if (str.length <= len)
    return str
  const half = Math.floor((len - 3) / 2)
  return `${str.slice(0, half)}...${str.slice(-half)}`
}

function totalPages(total: number | undefined): number {
  return Math.max(1, Math.ceil((total ?? 0) / pageSize))
}

function pageBack(page: typeof sessionsPage) {
  page.value = Math.max(1, page.value - 1)
}

function pageNext(page: typeof sessionsPage, total: number | undefined) {
  page.value = Math.min(totalPages(total), page.value + 1)
}

async function copyToClipboard(text: string, label = 'Value') {
  try {
    await navigator.clipboard.writeText(text)
    showNotice(`${label} copied`)
  }
  catch {
    showNotice('Copy failed')
  }
}

function generateConfigMarkdown() {
  const config = configData.value?.config
  if (!config)
    return ''

  return `## Module Config (\`nuxt.config.ts\`)

\`\`\`json
${JSON.stringify(config.module ?? {}, null, 2)}
\`\`\`

## Server Config (\`server/auth.config.ts\`)

\`\`\`json
${JSON.stringify(config.server ?? {}, null, 2)}
\`\`\`
`
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}

async function deleteSession(id: string) {
  try {
    const response = await fetch('/api/_better-auth/sessions', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!response.ok)
      throw new Error('Delete failed')
    deleteConfirm.value = null
    showNotice('Session deleted')
    await refreshSessions()
  }
  catch {
    showNotice('Failed to delete session')
  }
}

async function deleteConfirmedSession() {
  if (deleteConfirm.value)
    await deleteSession(deleteConfirm.value)
}
</script>

<template>
  <div class="devtools-shell">
    <header class="devtools-header">
      <div class="brand">
        <svg width="60" height="45" viewBox="0 0 60 45" fill="none" class="brand-mark" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z" fill="currentColor" />
        </svg>
        <span>Better Auth DevTools</span>
      </div>
      <nav class="links">
        <a href="https://www.better-auth.com/docs" target="_blank" rel="noreferrer">Docs</a>
        <a href="https://github.com/onmax/nuxt-better-auth" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </header>

    <nav class="tabs" aria-label="Devtools sections">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tabLabels[tab] }}
      </button>
    </nav>

    <p v-if="notice" class="notice">
      {{ notice }}
    </p>

    <main class="panel">
      <section v-if="activeTab === 'sessions'" class="section">
        <div class="toolbar">
          <input v-model="sessionsSearch" type="search" placeholder="Search by user ID or IP...">
          <div class="toolbar-meta">
            <span>{{ sessionsData?.total ?? 0 }} sessions</span>
            <button type="button" @click="() => refreshSessions()">
              Refresh
            </button>
          </div>
        </div>

        <div v-if="deleteConfirm" class="confirm">
          <span>Delete this session?</span>
          <button type="button" @click="deleteConfirm = null">
            Cancel
          </button>
          <button type="button" class="danger" @click="deleteConfirmedSession">
            Delete
          </button>
        </div>

        <p v-if="sessionsData?.error" class="error">
          {{ sessionsData.error }}
        </p>
        <table v-else-if="sessions.length">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>User Agent</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.id">
              <td><code>{{ truncate(session.id) }}</code></td>
              <td>
                <code>{{ truncate(session.userId) }}</code>
                <small>{{ session.ipAddress || 'No IP' }}</small>
              </td>
              <td>{{ truncate(session.userAgent, 32) }}</td>
              <td>
                <span class="badge" :class="isExpired(session.expiresAt) ? 'bad' : 'good'">
                  {{ isExpired(session.expiresAt) ? 'Expired' : 'Active' }}
                </span>
              </td>
              <td>{{ formatDate(session.createdAt) }}</td>
              <td class="actions">
                <button type="button" @click="copyToClipboard(session.id, 'Session ID')">
                  Copy
                </button>
                <button type="button" class="danger" @click="deleteConfirm = session.id">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">
          No sessions found
        </p>

        <div v-if="(sessionsData?.total ?? 0) > pageSize" class="pagination">
          <button type="button" :disabled="sessionsPage === 1" @click="pageBack(sessionsPage)">
            Previous
          </button>
          <span>Page {{ sessionsPage }} of {{ totalPages(sessionsData?.total) }}</span>
          <button type="button" :disabled="sessionsPage >= totalPages(sessionsData?.total)" @click="pageNext(sessionsPage, sessionsData?.total)">
            Next
          </button>
        </div>
      </section>

      <section v-else-if="activeTab === 'users'" class="section">
        <div class="toolbar">
          <input v-model="usersSearch" type="search" placeholder="Search by name or email...">
          <div class="toolbar-meta">
            <span>{{ usersData?.total ?? 0 }} users</span>
            <button type="button" @click="() => refreshUsers()">
              Refresh
            </button>
          </div>
        </div>

        <p v-if="usersData?.error" class="error">
          {{ usersData.error }}
        </p>
        <table v-else-if="users.length">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Verified</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td><code>{{ truncate(user.id) }}</code></td>
              <td>
                <strong>{{ user.name || 'Unnamed' }}</strong>
                <small>{{ user.email }}</small>
              </td>
              <td>
                <span class="badge" :class="user.emailVerified ? 'good' : ''">
                  {{ user.emailVerified ? 'Yes' : 'No' }}
                </span>
              </td>
              <td>{{ formatDate(user.createdAt) }}</td>
              <td class="actions">
                <button type="button" @click="copyToClipboard(user.id, 'User ID')">
                  Copy ID
                </button>
                <button type="button" @click="copyToClipboard(user.email, 'Email')">
                  Copy Email
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">
          No users found
        </p>

        <div v-if="(usersData?.total ?? 0) > pageSize" class="pagination">
          <button type="button" :disabled="usersPage === 1" @click="pageBack(usersPage)">
            Previous
          </button>
          <span>Page {{ usersPage }} of {{ totalPages(usersData?.total) }}</span>
          <button type="button" :disabled="usersPage >= totalPages(usersData?.total)" @click="pageNext(usersPage, usersData?.total)">
            Next
          </button>
        </div>
      </section>

      <section v-else-if="activeTab === 'accounts'" class="section">
        <div class="toolbar">
          <input v-model="accountsSearch" type="search" placeholder="Search by provider...">
          <div class="toolbar-meta">
            <span>{{ accountsData?.total ?? 0 }} accounts</span>
            <button type="button" @click="() => refreshAccounts()">
              Refresh
            </button>
          </div>
        </div>

        <p v-if="accountsData?.error" class="error">
          {{ accountsData.error }}
        </p>
        <table v-else-if="accounts.length">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Account</th>
              <th>User ID</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.id">
              <td class="capitalize">
                {{ account.providerId }}
              </td>
              <td><code>{{ truncate(account.accountId, 18) }}</code></td>
              <td><code>{{ truncate(account.userId) }}</code></td>
              <td>{{ formatDate(account.createdAt) }}</td>
              <td class="actions">
                <button type="button" @click="copyToClipboard(account.id, 'Account ID')">
                  Copy
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">
          No accounts found
        </p>

        <div v-if="(accountsData?.total ?? 0) > pageSize" class="pagination">
          <button type="button" :disabled="accountsPage === 1" @click="pageBack(accountsPage)">
            Previous
          </button>
          <span>Page {{ accountsPage }} of {{ totalPages(accountsData?.total) }}</span>
          <button type="button" :disabled="accountsPage >= totalPages(accountsData?.total)" @click="pageNext(accountsPage, accountsData?.total)">
            Next
          </button>
        </div>
      </section>

      <section v-else class="section config-grid">
        <div class="toolbar">
          <span />
          <button type="button" @click="copyToClipboard(generateConfigMarkdown(), 'Config')">
            Copy config
          </button>
        </div>

        <p v-if="configData?.error" class="error">
          {{ configData.error }}
        </p>
        <template v-else>
          <article>
            <h2>Module Config</h2>
            <pre>{{ json(configData?.config?.module) }}</pre>
          </article>
          <article>
            <h2>Server Config</h2>
            <pre>{{ json(configData?.config?.server) }}</pre>
          </article>
        </template>
      </section>
    </main>
  </div>
</template>

<style>
:root {
  --ba-bg: #ffffff;
  --ba-fg: #1f1f1f;
  --ba-muted: #707070;
  --ba-border: #e5e5e5;
  --ba-soft: #f7f7f7;
  --ba-hover: #efefef;
  --ba-good: #047857;
  --ba-bad: #b91c1c;
}

.dark {
  --ba-bg: #111111;
  --ba-fg: #f4f4f5;
  --ba-muted: #a1a1aa;
  --ba-border: #2d2d2d;
  --ba-soft: #191919;
  --ba-hover: #242424;
  --ba-good: #34d399;
  --ba-bad: #f87171;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.devtools-shell {
  min-height: 100vh;
  background: var(--ba-bg);
  color: var(--ba-fg);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

.devtools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--ba-border);
}

.brand,
.links,
.toolbar,
.toolbar-meta,
.actions,
.pagination,
.confirm {
  display: flex;
  align-items: center;
}

.brand {
  gap: 10px;
  font-weight: 600;
}

.brand-mark {
  width: 24px;
  height: auto;
}

.links a {
  color: var(--ba-muted);
  text-decoration: none;
  padding: 8px 10px;
}

.links a:hover {
  color: var(--ba-fg);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--ba-border);
}

.tabs button,
.toolbar button,
.actions button,
.pagination button,
.confirm button {
  min-height: 30px;
  border: 1px solid var(--ba-border);
  background: transparent;
  color: var(--ba-fg);
  padding: 5px 10px;
  cursor: pointer;
}

.tabs button {
  border-bottom: 0;
}

.tabs button.active,
button:hover:not(:disabled) {
  background: var(--ba-hover);
}

button:disabled {
  color: var(--ba-muted);
  cursor: default;
}

button.danger {
  color: var(--ba-bad);
}

.panel {
  padding: 16px;
}

.section {
  display: grid;
  gap: 14px;
}

.toolbar {
  justify-content: space-between;
  gap: 12px;
}

.toolbar-meta,
.actions,
.pagination,
.confirm {
  gap: 8px;
}

input {
  width: min(340px, 100%);
  border: 1px solid var(--ba-border);
  background: var(--ba-bg);
  color: var(--ba-fg);
  padding: 7px 10px;
}

table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--ba-border);
}

th,
td {
  border-bottom: 1px solid var(--ba-border);
  padding: 9px 10px;
  text-align: left;
  vertical-align: top;
}

th {
  color: var(--ba-muted);
  font-weight: 500;
  background: var(--ba-soft);
}

td small {
  display: block;
  color: var(--ba-muted);
  margin-top: 3px;
}

code,
pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

.badge {
  display: inline-flex;
  border: 1px solid var(--ba-border);
  padding: 2px 8px;
  color: var(--ba-muted);
  background: var(--ba-soft);
}

.badge.good {
  color: var(--ba-good);
}

.badge.bad,
.error {
  color: var(--ba-bad);
}

.empty,
.notice,
.confirm {
  border: 1px solid var(--ba-border);
  background: var(--ba-soft);
  padding: 10px 12px;
}

.empty,
.notice {
  color: var(--ba-muted);
}

.config-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.config-grid .toolbar,
.config-grid .error {
  grid-column: 1 / -1;
}

article {
  border: 1px solid var(--ba-border);
  background: var(--ba-soft);
}

h2 {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--ba-border);
}

pre {
  margin: 0;
  padding: 12px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
}

.capitalize {
  text-transform: capitalize;
}

@media (max-width: 720px) {
  .devtools-header,
  .toolbar,
  .toolbar-meta {
    align-items: stretch;
    flex-direction: column;
  }

  .tabs,
  .actions {
    flex-wrap: wrap;
  }

  table {
    display: block;
    overflow-x: auto;
  }
}
</style>
