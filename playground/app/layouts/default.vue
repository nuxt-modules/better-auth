<script setup lang="ts">
const { user, loggedIn, ready, signOut } = useUserSession()
const { locale, locales, setLocale } = useI18n()
const { t } = useI18n()

const availableLocales = computed(() =>
  (locales.value as Array<{ code: string, name: string }>).map(l => ({ label: l.name, value: l.code })),
)
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center gap-3">
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
          </NuxtLink>
          <div class="flex items-center gap-4">
            <nav class="flex items-center gap-4">
              <NuxtLink to="/" class="text-sm text-muted-foreground hover:text-foreground">
                {{ t('nav.home') }}
              </NuxtLink>
              <NuxtLink to="/app" class="text-sm text-muted-foreground hover:text-foreground">
                {{ t('nav.app') }}
              </NuxtLink>
              <NuxtLink to="/admin" class="text-sm text-muted-foreground hover:text-foreground">
                {{ t('nav.admin') }}
              </NuxtLink>
            </nav>
            <USelect :model-value="locale" :items="availableLocales" class="w-28" @update:model-value="setLocale($event as 'en' | 'es')" />
            <UColorModeButton />
            <template v-if="ready">
              <template v-if="loggedIn">
                <span class="text-sm text-muted-foreground">{{ user?.name || user?.email }}</span>
                <button
                  class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  @click="signOut()"
                >
                  {{ t('common.signOut') }}
                </button>
              </template>
              <template v-else>
                <NuxtLink to="/login">
                  <button class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                    {{ t('common.signIn') }}
                  </button>
                </NuxtLink>
              </template>
            </template>
          </div>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>
