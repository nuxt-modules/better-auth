<script setup lang="ts">
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'

const route = useRoute()
const { locale, isEnabled } = useDocusI18n()
const collectionName = computed(() => isEnabled.value ? `docs_${locale.value}` : 'docs')
const isDocsPage = computed(() => route.meta.layout === 'docs')

const { data: navigation } = await useAsyncData(() => `navigation_${collectionName.value}`, () => queryCollectionNavigation(collectionName.value as keyof PageCollections), {
  transform: (data: ContentNavigationItem[]) => {
    const rootResult = data.find(item => item.path === '/')?.children || data || []
    return rootResult.find(item => item.path === `/${locale.value}`)?.children || rootResult
  },
  watch: [locale],
})
const { data: files } = useLazyAsyncData(`search_${collectionName.value}`, () => queryCollectionSearchSections(collectionName.value as keyof PageCollections), { server: false })

provide('navigation', navigation)
</script>

<template>
  <div class="app-root">
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <AppHeader />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AppFooter v-if="!isDocsPage" />

    <ClientOnly>
      <LazyUContentSearch :files="files" :navigation="navigation" />
    </ClientOnly>

    <UToaster />
  </div>
</template>
