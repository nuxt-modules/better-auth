<script setup lang="ts">
const route = useRoute()
const { sidebarOpen, close } = useDocusSidebar()

watch(() => route.path, () => close())
</script>

<template>
  <UMain class="docs-layout">
    <div class="docs-grid">
      <!-- Left Sidebar -->
      <aside class="docs-sidebar">
        <DocsSearchButton />
        <div class="sidebar-scroll">
          <DocsSidebar />
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="docs-main">
        <slot />
        <AppFooter />
      </div>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <Teleport to="body">
      <Transition name="sidebar-backdrop">
        <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />
      </Transition>
      <Transition name="sidebar-slide">
        <aside v-if="sidebarOpen" class="docs-sidebar-mobile">
          <DocsSearchButton />
          <div class="sidebar-scroll">
            <DocsSidebar />
          </div>
        </aside>
      </Transition>
    </Teleport>
  </UMain>
</template>

<style scoped>
.docs-layout {
  --fd-sidebar-width: 268px;
  --fd-toc-width: 268px;
  --fd-content-width: 860px;
  --header-height: 3.5rem; /* h-14 = 56px */
}

.docs-grid {
  display: grid;
  grid-template-columns: var(--fd-sidebar-width) minmax(0, 1fr);
  min-height: calc(100vh - var(--header-height));
}

.docs-sidebar {
  display: none;
  flex-direction: column;
  position: sticky;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));
  border-right: 1px solid var(--ui-border);
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--ui-border) transparent;
}

.sidebar-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: var(--ui-border);
  border-radius: 4px;
}

.docs-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Mobile sidebar */
.docs-sidebar-mobile {
  position: fixed;
  left: 0;
  top: var(--header-height);
  width: var(--fd-sidebar-width);
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  z-index: 50;
  border-right: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  top: var(--header-height);
  z-index: 40;
  background: rgba(0, 0, 0, 0.5);
}

/* Transitions */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.2s ease;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
}

.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}

/* Mobile: single column, no sidebar */
@media (max-width: 1023px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }
}

/* lg: show sidebar */
@media (min-width: 1024px) {
  .docs-sidebar {
    display: flex;
  }
}

/* XL: wider sidebar */
@media (min-width: 1280px) {
  .docs-layout {
    --fd-sidebar-width: 286px;
    --fd-toc-width: 286px;
  }
}
</style>
