<script setup lang="ts">
const appConfig = useAppConfig()
const site = useSiteConfig()
const route = useRoute()
const { sidebarOpen, toggle: toggleSidebar } = useDocusSidebar()

const isDocsPage = computed(() => route.path.startsWith('/getting-started')
  || route.path.startsWith('/core-concepts')
  || route.path.startsWith('/guides')
  || route.path.startsWith('/integrations')
  || route.path.startsWith('/api')
  || route.path.startsWith('/examples')
  || route.path.startsWith('/better-auth'))

const navLinks = [
  { name: 'docs', path: '/getting-started' },
  { name: 'demo', path: 'https://demo-nuxt-better-auth.onmax.me', external: true },
  { name: 'better-auth', path: 'https://www.better-auth.com', external: true },
]
</script>

<template>
  <UHeader :ui="{ container: 'max-w-full !px-0 h-14', root: 'border-b border-[var(--ui-border)] h-14', left: 'gap-0 h-full', right: 'gap-0 h-full', title: 'h-full items-center' }" to="/" :title="appConfig.header?.title || site.name">
    <template #title>
      <div class="header-logo">
        <!-- Nuxt -->
        <div class="flex items-center gap-1.5">
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none" class="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
            <path d="M26.88 32H44.64C45.2068 32.0001 45.7492 31.8009 46.24 31.52C46.7308 31.2391 47.2367 30.8865 47.52 30.4C47.8033 29.9135 48.0002 29.3615 48 28.7998C47.9998 28.2381 47.8037 27.6864 47.52 27.2001L35.52 6.56C35.2368 6.0736 34.8907 5.72084 34.4 5.44C33.9093 5.15916 33.2066 4.96 32.64 4.96C32.0734 4.96 31.5307 5.15916 31.04 5.44C30.5493 5.72084 30.2032 6.0736 29.92 6.56L26.88 11.84L20.8 1.59962C20.5165 1.11326 20.1708 0.600786 19.68 0.32C19.1892 0.0392139 18.6467 0 18.08 0C17.5133 0 16.9708 0.0392139 16.48 0.32C15.9892 0.600786 15.4835 1.11326 15.2 1.59962L0.32 27.2001C0.0363166 27.6864 0.000246899 28.2381 3.05588e-07 28.7998C-0.000246288 29.3615 0.0367437 29.9134 0.32 30.3999C0.603256 30.8864 1.10919 31.2391 1.6 31.52C2.09081 31.8009 2.63324 32.0001 3.2 32H14.4C18.8379 32 22.068 30.0092 24.32 26.24L29.76 16.8L32.64 11.84L41.44 26.88H29.76L26.88 32ZM14.24 26.88H6.4L18.08 6.72L24 16.8L20.0786 23.636C18.5831 26.0816 16.878 26.88 14.24 26.88Z" class="fill-black dark:fill-white" />
          </svg>
          <span class="font-semibold text-sm select-none">Nuxt</span>
        </div>
        <!-- X separator -->
        <span class="text-black/40 dark:text-white/40 text-sm select-none">×</span>
        <!-- Better Auth -->
        <div class="flex items-center gap-1.5">
          <svg width="60" height="45" viewBox="0 0 60 45" fill="none" class="h-4 w-auto" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z" class="fill-black dark:fill-white" />
          </svg>
          <span class="font-semibold text-sm select-none">Better Auth</span>
        </div>
      </div>
    </template>

    <template #right>
      <!-- Nav Links (desktop) -->
      <nav class="hidden md:flex items-center h-full">
        <li class="relative group list-none h-full">
          <NuxtLink to="/" class="flex items-center h-full px-5 text-sm text-muted transition-colors group-hover:text-[var(--ui-text)]">
            _hello
          </NuxtLink>
          <div class="absolute bottom-0 left-0 h-0.5 w-0 bg-[var(--ui-text-muted)] opacity-0 transition-all duration-500 group-hover:w-full group-hover:opacity-100" />
        </li>
        <template v-for="link in navLinks" :key="link.name">
          <li class="relative group list-none h-full">
            <NuxtLink
              :to="link.path"
              :target="link.external ? '_blank' : undefined"
              class="flex items-center h-full px-5 text-sm text-muted transition-colors group-hover:text-[var(--ui-text)] border-l border-[var(--ui-border)]"
            >
              {{ link.name }}
            </NuxtLink>
            <div class="absolute bottom-0 left-0 h-0.5 w-0 bg-[var(--ui-text-muted)] opacity-0 transition-all duration-500 group-hover:w-full group-hover:opacity-100" />
          </li>
        </template>
        <li class="relative group list-none h-full">
          <NuxtLink
            to="https://github.com/onmax/nuxt-better-auth"
            target="_blank"
            class="flex items-center h-full px-5 border-l border-[var(--ui-border)] text-muted transition-colors group-hover:text-[var(--ui-text)]"
            aria-label="GitHub"
          >
            <UIcon name="i-simple-icons-github" class="size-4" />
          </NuxtLink>
          <div class="absolute bottom-0 left-0 h-0.5 w-0 bg-[var(--ui-text-muted)] opacity-0 transition-all duration-500 group-hover:w-full group-hover:opacity-100" />
        </li>
      </nav>

      <!-- Docs sidebar toggle (mobile) -->
      <UButton v-if="isDocsPage" color="neutral" variant="ghost" :icon="sidebarOpen ? 'i-lucide-x' : 'i-lucide-panel-left'" class="lg:hidden border-l border-[var(--ui-border)] h-full aspect-square rounded-none" @click="toggleSidebar" />

      <UContentSearchButton class="lg:hidden" />

      <ClientOnly>
        <UColorModeButton class="flex items-center justify-center border-l border-[var(--ui-border)] h-full aspect-square rounded-none text-muted hover:text-[var(--ui-text)] transition-colors" :ui="{ leadingIcon: 'size-4' }" />
        <template #fallback>
          <div class="h-full aspect-square animate-pulse bg-[var(--ui-bg-elevated)] border-l border-[var(--ui-border)]" />
        </template>
      </ClientOnly>
    </template>

    <template #toggle="{ open, toggle }">
      <UButton
        color="neutral"
        variant="ghost"
        :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
        class="lg:hidden"
        @click="toggle"
      />
    </template>

    <template #body>
      <UNavigationMenu :items="[]" orientation="vertical" class="w-full" />
      <nav class="flex flex-col border-t border-[var(--ui-border)] mt-4 pt-4">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.name"
          :to="link.path"
          :target="link.external ? '_blank' : undefined"
          class="px-4 py-2 text-sm text-muted hover:text-[var(--ui-text)]"
        >
          {{ link.name }}
        </NuxtLink>
      </nav>
    </template>
  </UHeader>
</template>

<style scoped>
.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: var(--fd-sidebar-width, 268px);
  height: 100%;
  padding-inline: 1.25rem;
  border-right: 1px solid var(--ui-border);
  box-sizing: border-box;
}

@media (min-width: 1280px) {
  .header-logo {
    width: 286px;
  }
}
</style>
