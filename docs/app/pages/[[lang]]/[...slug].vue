<script setup lang="ts">
import type { Collections, ContentNavigationItem, DocsCollectionItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'
import { kebabCase } from 'scule'

definePageMeta({ layout: 'docs' })

const route = useRoute()
const { locale, isEnabled, t } = useDocusI18n()
const appConfig = useAppConfig()
const site = useSiteConfig()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')

const collectionName = computed(() => isEnabled.value ? `docs_${locale.value}` : 'docs')

const [{ data: page }, { data: surround }] = await Promise.all([
  useAsyncData(kebabCase(route.path), () => queryCollection(collectionName.value as keyof Collections).path(route.path).first() as Promise<DocsCollectionItem>),
  useAsyncData(`${kebabCase(route.path)}-surround`, () => queryCollectionItemSurroundings(collectionName.value as keyof Collections, route.path, { fields: ['description'] })),
])

if (!page.value)
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

const ogImageUrl = computed(() => new URL('/og.png', site.url).toString())

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
  ogImage: ogImageUrl,
  twitterImage: ogImageUrl,
})

const headline = ref(findPageHeadline(navigation?.value, page.value?.path))
watch(() => navigation?.value, () => {
  headline.value = findPageHeadline(navigation?.value, page.value?.path) || headline.value
})

const github = computed(() => appConfig.github || null)

const editLink = computed(() => {
  if (!github.value)
    return
  return [github.value.url, 'edit', github.value.branch, github.value.rootDir, 'content', `${page.value?.stem}.${page.value?.extension}`].filter(Boolean).join('/')
})

const tocLinks = computed(() => page.value?.body?.toc?.links ?? [])
</script>

<template>
  <!--
    DOM mirrors better-auth fumadocs DocsPage:
    #nd-page > article#nd-article + aside#nd-toc
    Widths driven by --fd-layout-width / --fd-toc-width / --fd-page-width (globals.css pattern)
  -->
  <div
    v-if="page"
    id="nd-page"
    class="docs-page"
  >
    <article
      id="nd-article"
      class="docs-article"
    >
      <UPageHeader
        :title="page.title"
        :description="page.description"
        :headline="headline"
        :ui="{ wrapper: 'flex-row items-center flex-wrap justify-between' }"
      >
        <template #links>
          <UButton
            v-for="(link, index) in (page as DocsCollectionItem).links"
            :key="index"
            size="sm"
            v-bind="link"
          />
          <DocsPageHeaderLinks />
        </template>
      </UPageHeader>

      <UPageBody>
        <ContentRenderer
          v-if="page"
          :value="page"
        />
        <DocsPageFooter
          :surround="surround"
          :edit-link="editLink"
        />
      </UPageBody>
    </article>

    <aside
      v-if="tocLinks.length"
      id="nd-toc"
      class="docs-toc"
    >
      <UContentToc
        highlight
        :title="appConfig.toc?.title || t('docs.toc')"
        :links="tocLinks"
        :ui="{
          root: 'min-w-0',
          container: 'min-w-0',
          header: 'text-sm font-semibold mb-3 text-[var(--ui-text-highlighted)]',
          links: 'space-y-1 min-w-0',
          link: 'text-sm block py-1.5 pr-1 break-words text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors',
          linkActive: 'text-[var(--ui-text-highlighted)]',
        }"
      >
        <template #bottom>
          <DocsAsideRightBottom />
        </template>
      </UContentToc>
    </aside>
  </div>
</template>
