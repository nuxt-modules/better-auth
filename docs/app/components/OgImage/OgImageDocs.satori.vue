<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  headline?: string
}>()
</script>

<template>
  <div class="w-full h-full flex flex-col p-12 relative" style="background: #0a0505; color: white;">
    <!-- Main container with border -->
    <div class="flex flex-col flex-1 border-2 border-white/20 p-10 relative">
      <!-- Corner decorations -->
      <svg class="absolute -top-2 -left-2" width="17" height="17" fill="none">
        <path d="M7 1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V8a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H8a1 1 0 0 1-1-1V1z" fill="#cacaca" />
      </svg>
      <svg class="absolute -top-2 -right-2" width="17" height="17" fill="none">
        <path d="M7 1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V8a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H8a1 1 0 0 1-1-1V1z" fill="#cacaca" />
      </svg>
      <svg class="absolute -bottom-2 -left-2" width="17" height="17" fill="none">
        <path d="M7 1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V8a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H8a1 1 0 0 1-1-1V1z" fill="#cacaca" />
      </svg>
      <svg class="absolute -bottom-2 -right-2" width="17" height="17" fill="none">
        <path d="M7 1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V8a1 1 0 0 1 1-1h2a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H8a1 1 0 0 1-1-1V1z" fill="#cacaca" />
      </svg>

      <!-- Content -->
      <div class="flex flex-col flex-1 py-6">
        <!-- Logo -->
        <svg width="100" height="75" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H15V15H30V30H15V45H0V30V15V0ZM45 30V15H30V0H45H60V15V30V45H45H30V30H45Z" fill="white" />
        </svg>

        <!-- Type indicator -->
        <div class="flex items-center gap-2 mt-8 text-xl uppercase font-semibold text-white/80">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd" d="M4.172 3.172C3 4.343 3 6.229 3 10v4c0 3.771 0 5.657 1.172 6.828S7.229 22 11 22h2c3.771 0 5.657 0 6.828-1.172S21 17.771 21 14v-4c0-3.771 0-5.657-1.172-6.828S16.771 2 13 2h-2C7.229 2 5.343 2 4.172 3.172M8 9.25a.75.75 0 0 0 0 1.5h8a.75.75 0 0 0 0-1.5zm0 4a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5z" clip-rule="evenodd" />
          </svg>
          <span>{{ headline || 'Documentation' }}</span>
        </div>

        <!-- Title -->
        <div class="mt-4 text-5xl font-bold leading-tight max-w-[70%]" :class="title && title.length > 50 ? 'text-4xl' : 'text-5xl'">
          {{ (title || 'Nuxt Better Auth').slice(0, 80) }}
        </div>

        <!-- Description -->
        <div v-if="description" class="mt-4 text-2xl text-white/70 max-w-[70%] leading-snug">
          {{ description.slice(0, 120) }}
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between">
        <div class="text-xl font-semibold">
          Nuxt Better Auth
        </div>
        <div class="flex items-center gap-2 text-xl text-white/80">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2" />
          </svg>
          <span>github.com/onmax/nuxt-better-auth</span>
        </div>
      </div>
    </div>
  </div>
</template>
