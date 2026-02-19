<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

const route = useRoute()

const tabs: TabsItem[] = [
  { label: 'Sign In', value: 'sign-in' },
  { label: 'Sign Up', value: 'sign-up' },
]

const activeTab = computed({
  get: () => route.path === '/register' ? 'sign-up' : 'sign-in',
  set: value => navigateTo({
    path: value === 'sign-up' ? '/register' : '/login',
    query: route.query,
  }),
})

const showTabs = computed(() => ['/login', '/register'].includes(route.path))
</script>

<template>
  <div class="min-h-screen w-full dark:bg-black bg-white relative flex justify-center">
    <!-- Grid background -->
    <div class="absolute inset-0 bg-grid-small text-black/5 dark:text-white/5 pointer-events-none" />
    <div class="absolute pointer-events-none inset-0 items-center justify-center bg-white dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_40%,white)] dark:[mask-image:radial-gradient(ellipse_at_center,transparent_40%,black)]" />

    <!-- Header -->
    <div class="bg-white dark:bg-black border-b py-2 flex justify-between items-center border-border absolute z-50 w-full px-4">
      <NuxtLink to="/">
        <div class="flex items-center gap-3">
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
      </NuxtLink>
      <div class="z-50 flex items-center">
        <UColorModeButton />
      </div>
    </div>

    <!-- Content -->
    <div class="mt-20 lg:w-7/12 w-full relative z-10">
      <div class="w-full">
        <div class="flex items-center flex-col justify-center w-full md:py-10">
          <div class="md:w-[400px]">
            <UTabs
              v-if="showTabs"
              v-model="activeTab"
              :items="tabs"
              :content="false"
              :ui="{
                root: 'flex flex-col gap-0 items-start',
                list: 'p-0 rounded-none bg-transparent border-x border-t max-w-max',
                trigger: 'justify-start rounded-none px-4 py-2 text-black dark:text-white data-[state=inactive]:opacity-60 dark:data-[state=inactive]:opacity-40 data-[state=active]:opacity-100',
                indicator: 'rounded-none inset-y-0 bg-neutral-300 dark:bg-zinc-900/90 shadow-none',
              }"
            />
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
