<script setup lang="ts">
type BrandName = keyof typeof brands

const props = defineProps<{
  name: BrandName
  to?: string
}>()

const brands = {
  'cloudflare': { label: 'Cloudflare', icon: 'i-simple-icons-cloudflare', iconClass: 'text-orange-500' },
  'cloudflare-d1': { label: 'Cloudflare D1', icon: 'i-simple-icons-cloudflare', iconClass: 'text-orange-500' },
  'cloudflare-pages': { label: 'Cloudflare Pages', icon: 'i-simple-icons-cloudflarepages', iconClass: 'text-orange-500' },
  'cloudflare-workers': { label: 'Cloudflare Workers', icon: 'i-simple-icons-cloudflareworkers', iconClass: 'text-orange-500' },
  'convex': { label: 'Convex', icon: 'i-simple-icons-convex', iconClass: 'text-orange-500' },
  'drizzle': { label: 'Drizzle', icon: 'i-simple-icons-drizzle', iconClass: 'text-lime-600 dark:text-lime-400' },
  'kysely': { label: 'Kysely', icon: 'i-lucide-database', iconClass: 'text-blue-500' },
  'mysql': { label: 'MySQL', icon: 'i-simple-icons-mysql', iconClass: 'text-blue-500' },
  'netlify': { label: 'Netlify', icon: 'i-simple-icons-netlify', iconClass: 'text-teal-500' },
  'nuxthub': { label: 'NuxtHub', icon: 'i-simple-icons-nuxt', iconClass: 'text-emerald-500' },
  'postgresql': { label: 'PostgreSQL', icon: 'i-simple-icons-postgresql', iconClass: 'text-blue-500' },
  'prisma': { label: 'Prisma', icon: 'i-simple-icons-prisma', iconClass: 'text-indigo-500 dark:text-indigo-300' },
  'redis': { label: 'Redis', icon: 'i-simple-icons-redis', iconClass: 'text-red-500' },
  'sqlite': { label: 'SQLite', icon: 'i-simple-icons-sqlite', iconClass: 'text-sky-500' },
  'upstash': { label: 'Upstash', icon: 'i-simple-icons-upstash', iconClass: 'text-emerald-500' },
  'vercel': { label: 'Vercel', icon: 'i-simple-icons-vercel', iconClass: 'text-stone-900 dark:text-stone-100' },
} as const

const brand = computed(() => brands[props.name])
const tag = computed(() => props.to ? resolveComponent('NuxtLink') : 'span')
const external = computed(() => props.to?.startsWith('http'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    class="brand-badge"
  >
    <UIcon :name="brand.icon" class="size-3.5 shrink-0" :class="brand.iconClass" aria-hidden="true" />
    <span>{{ brand.label }}</span>
  </component>
</template>

<style scoped>
.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.4rem;
  border-radius: var(--ui-radius);
  background: color-mix(in srgb, var(--ui-text) 8%, transparent);
  color: var(--ui-text-muted);
  font-size: 0.875em;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  vertical-align: 0.08em;
  white-space: nowrap;
}

a.brand-badge {
  transition: color 150ms ease, background-color 150ms ease;
}

a.brand-badge:hover {
  background: color-mix(in srgb, var(--ui-text) 14%, transparent);
  color: var(--ui-text);
}
</style>
