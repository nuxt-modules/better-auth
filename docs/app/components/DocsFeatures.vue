<script setup lang="ts">
interface Feature { title: string, description: string, href?: string }

const props = defineProps<{ features: Feature[] }>()
const INLINE_CODE_RE = /`([^`]+)`/g

const patternId = useId()

function getGridSize(index: number) {
  return index * 5 + 10
}

function renderDescription(desc: string) {
  return desc.replace(INLINE_CODE_RE, '<code class="font-mono text-xs bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">$1</code>')
}
</script>

<template>
  <div class="not-prose py-4">
    <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      <component
        :is="feature.href ? 'a' : 'div'"
        v-for="(feature, i) in props.features"
        :key="feature.title"
        :href="feature.href"
        :target="feature.href?.startsWith('http') ? '_blank' : undefined"
        class="group relative overflow-hidden p-5 bg-gradient-to-b from-neutral-100 to-white dark:from-neutral-900 dark:to-neutral-950"
        :class="feature.href && 'cursor-pointer hover:ring-1 hover:ring-stone-300 dark:hover:ring-stone-700 transition-shadow'"
      >
        <!-- Grid Pattern Background -->
        <div class="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 size-full [mask-image:linear-gradient(white,transparent)]">
          <div class="absolute inset-0 bg-gradient-to-r from-zinc-100/30 to-zinc-300/30 opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 dark:to-zinc-900/30">
            <svg aria-hidden="true" class="absolute inset-0 size-full fill-black/10 stroke-black/10 mix-blend-overlay dark:fill-white/10 dark:stroke-white/10">
              <defs>
                <pattern :id="`${patternId}-${i}`" :width="getGridSize(i)" :height="getGridSize(i)" patternUnits="userSpaceOnUse" x="-12" y="4">
                  <path :d="`M.5 ${getGridSize(i)}V.5H${getGridSize(i)}`" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" :stroke-width="0" :fill="`url(#${patternId}-${i})`" />
            </svg>
          </div>
        </div>
        <p class="relative z-0 text-sm font-semibold text-neutral-800 dark:text-white flex items-center gap-1.5">
          {{ feature.title }}
          <svg v-if="feature.href" xmlns="http://www.w3.org/2000/svg" class="size-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
          </svg>
        </p>
        <p class="relative z-0 text-sm text-neutral-600 dark:text-neutral-400" v-html="renderDescription(feature.description)" />
      </component>
    </div>
    <slot />
  </div>
</template>
