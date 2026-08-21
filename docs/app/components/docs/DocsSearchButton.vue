<script setup lang="ts">
const { open } = useContentSearch()
</script>

<template>
  <button class="docs-search-button" @click="open = true">
    <UIcon name="i-lucide-search" class="search-icon" />
    <span class="search-text">Search documentation...</span>
  </button>
</template>

<style scoped>
.docs-search-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  flex-shrink: 0;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  border-bottom: 1px solid var(--ui-border);
  transition: color 0.15s;
  text-align: left;
}

.docs-search-button:hover {
  color: var(--ui-text);
}

.docs-search-button:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.search-icon {
  width: 1rem;
  height: 1rem;
  margin-inline: 0.125rem;
  flex-shrink: 0;
}

.search-text {
  flex: 1;
}
</style>
