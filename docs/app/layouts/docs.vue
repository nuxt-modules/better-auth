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
.docs-grid {
  display: grid;
  grid-template-columns: var(--fd-sidebar-width) minmax(0, 1fr);
  align-items: start;
  min-height: calc(100vh - var(--header-height, 3.5rem));
  min-height: calc(100dvh - var(--header-height, 3.5rem));
}

.docs-sidebar {
  display: none;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  padding: 0;
  margin: 0;
  position: sticky;
  top: var(--header-height, 3.5rem);
  height: calc(100vh - var(--header-height, 3.5rem));
  height: calc(100dvh - var(--header-height, 3.5rem));
  border-right: 1px solid var(--ui-border);
  background: var(--ui-bg);
  box-sizing: border-box;
}

/* Hide scrollbar so nav rows span full sidebar width (aligns with header logo border) */
.sidebar-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sidebar-scroll::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.docs-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-x: clip;
}

/* Mobile sidebar (teleported to body — use :root --header-height fallbacks) */
.docs-sidebar-mobile {
  position: fixed;
  left: 0;
  top: var(--header-height, 3.5rem);
  width: min(var(--fd-sidebar-width), 85vw);
  height: calc(100vh - var(--header-height, 3.5rem));
  height: calc(100dvh - var(--header-height, 3.5rem));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 50;
  border-right: 1px solid var(--ui-border);
  background: var(--ui-bg);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  top: var(--header-height, 3.5rem);
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
    grid-template-columns: minmax(0, 1fr);
  }
}

/* lg: show sidebar */
@media (min-width: 1024px) {
  .docs-sidebar {
    display: flex;
  }
}
</style>
