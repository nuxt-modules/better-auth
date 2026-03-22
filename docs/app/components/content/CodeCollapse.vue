<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <UCollapsible v-model:open="open" class="my-4">
    <UButton variant="ghost" size="sm" :icon="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" trailing-icon="i-lucide-sparkles" label="AI Prompt" @click="open = !open" />
    <template #content>
      <div class="pt-2">
        <ContentSlot :use="$slots.default" unwrap="p" />
      </div>
    </template>
  </UCollapsible>
</template>
