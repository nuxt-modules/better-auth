<script setup lang="ts">
const route = useRoute()
const { sections, standaloneLinks } = useSidebarConfig()

function isActive(href: string) {
  if (href.startsWith('http'))
    return false
  return route.path === href
}

function isSectionActive(sectionIndex: number) {
  return sections[sectionIndex]?.items.some(item => isActive(item.href)) ?? false
}

const openSection = ref<string>('')

// Update open section when route changes (immediate: fires on mount + navigation)
watch(() => route.path, () => {
  const activeIndex = sections.findIndex((_, index) => isSectionActive(index))
  if (activeIndex !== -1) {
    openSection.value = String(activeIndex)
  }
}, { immediate: true })

// Build accordion items from sections
const accordionItems = computed(() =>
  sections.map((section, index) => ({
    label: section.title,
    icon: section.icon,
    value: String(index),
    isNew: section.isNew,
    defaultOpen: isSectionActive(index),
    slot: `item-${index}` as const,
  })),
)
</script>

<template>
  <nav class="docs-sidebar-nav">
    <UAccordion
      v-model="openSection"
      type="single"
      collapsible
      :items="accordionItems"
      :ui="{
        item: 'border-b border-[var(--ui-border)]',
        trigger: 'px-5 py-2.5 text-sm font-normal hover:underline data-[state=open]:font-normal',
        trailingIcon: 'size-4 text-[var(--ui-text-muted)]',
        content: 'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
        body: 'p-0',
      }"
    >
      <template #leading="{ item }">
        <UIcon :name="item.icon" class="size-5" />
      </template>

      <template #default="{ item }">
        <span class="flex-1">{{ item.label }}</span>
        <UBadge v-if="item.isNew" size="xs" variant="outline" class="mr-2">
          New
        </UBadge>
      </template>

      <template v-for="(section, index) in sections" :key="section.title" #[`item-${index}`]>
        <div class="section-items">
          <NuxtLink
            v-for="sectionItem in section.items"
            :key="sectionItem.href"
            :to="sectionItem.href"
            :target="sectionItem.href.startsWith('http') ? '_blank' : undefined"
            class="sidebar-item"
            :class="{ active: isActive(sectionItem.href) }"
          >
            <UIcon v-if="sectionItem.icon" :name="sectionItem.icon" class="item-icon" />
            <span>{{ sectionItem.title }}</span>
            <UBadge v-if="sectionItem.isNew" size="xs" variant="outline" class="ml-auto">
              New
            </UBadge>
            <UIcon v-if="sectionItem.href.startsWith('http')" name="i-lucide-external-link" class="external-icon" />
          </NuxtLink>
        </div>
      </template>
    </UAccordion>

    <!-- Standalone links (no accordion) -->
    <div v-if="standaloneLinks.length" class="standalone-links">
      <NuxtLink
        v-for="item in standaloneLinks"
        :key="item.href"
        :to="item.href"
        class="standalone-item"
        :class="{ active: isActive(item.href) }"
      >
        <UIcon v-if="item.icon" :name="item.icon" class="size-5" />
        <span>{{ item.title }}</span>
      </NuxtLink>
    </div>

    <!-- Better Auth docs link -->
    <div class="better-auth-link">
      <UButton
        to="https://www.better-auth.com/docs"
        target="_blank"
        variant="soft"
        block
        trailing-icon="i-lucide-external-link"
        :ui="{ trailingIcon: 'size-3' }"
      >
        <svg width="60" height="45" viewBox="0 0 60 45" fill="none" class="size-3.5" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z" fill="currentColor" />
        </svg>
        Better Auth Docs
      </UButton>
      <p class="better-auth-hint">
        Full Better Auth documentation
      </p>
    </div>
  </nav>
</template>

<style scoped>
.docs-sidebar-nav {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* Add top border to first accordion item */
.docs-sidebar-nav :deep([data-accordion-item]:first-child) {
  border-top: 1px solid var(--ui-border);
}

/* Inset focus ring to prevent clipping by borders/overflow */
.docs-sidebar-nav :deep([data-accordion-item] button:focus-visible) {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

/* Sidebar item - matches Better Auth: px-5 py-1 gap-x-2.5 */
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 1.25rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  transition: all 0.15s;
}

.sidebar-item:hover {
  color: var(--ui-text);
  background-color: color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

.sidebar-item.active {
  color: var(--ui-text);
  background-color: color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

/* Item icon container - min-w-4 */
.item-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.external-icon {
  width: 0.75rem;
  height: 0.75rem;
  margin-left: auto;
  opacity: 0.5;
}

/* Standalone links section */
.standalone-links {
  border-top: 1px solid var(--ui-border);
  border-bottom: 1px solid var(--ui-border);
}

.standalone-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  color: var(--ui-text);
  transition: all 0.15s;
}

.standalone-item:hover {
  text-decoration: underline;
}

.standalone-item.active {
  background-color: color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

/* Better Auth link section */
.better-auth-link {
  margin-top: auto;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--ui-border);
}

.better-auth-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  text-align: center;
}
</style>
