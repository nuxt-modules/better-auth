<script setup lang="ts">
type BrandName = keyof typeof brands

const props = defineProps<{
  name: BrandName
  to?: string
  unlinked?: boolean
}>()

const brands = {
  'cloudflare': { label: 'Cloudflare', icon: 'i-simple-icons-cloudflare', iconClass: 'text-orange-500', to: 'https://www.cloudflare.com/developer-platform/' },
  'cloudflare-d1': { label: 'Cloudflare D1', icon: 'i-simple-icons-cloudflare', iconClass: 'text-orange-500', to: 'https://developers.cloudflare.com/d1/' },
  'convex': { label: 'Convex', icon: 'i-simple-icons-convex', iconClass: 'text-orange-500', to: 'https://www.convex.dev/' },
  'drizzle': { label: 'Drizzle', icon: 'i-simple-icons-drizzle', iconClass: 'text-lime-600 dark:text-lime-400', to: 'https://orm.drizzle.team/' },
  'kysely': { label: 'Kysely', icon: 'i-lucide-database', iconClass: 'text-blue-500', to: 'https://kysely.dev/' },
  'mysql': { label: 'MySQL', icon: 'i-simple-icons-mysql', iconClass: 'text-blue-500', to: 'https://www.mysql.com/' },
  'netlify': { label: 'Netlify', icon: 'i-simple-icons-netlify', iconClass: 'text-teal-500', to: 'https://www.netlify.com/' },
  'nuxthub': { label: 'NuxtHub', icon: 'i-simple-icons-nuxt', iconClass: 'text-emerald-500', to: 'https://hub.nuxt.com/' },
  'postgresql': { label: 'PostgreSQL', icon: 'i-simple-icons-postgresql', iconClass: 'text-blue-500', to: 'https://www.postgresql.org/' },
  'prisma': { label: 'Prisma', icon: 'i-simple-icons-prisma', iconClass: 'text-indigo-500 dark:text-indigo-300', to: 'https://www.prisma.io/' },
  'redis': { label: 'Redis', icon: 'i-simple-icons-redis', iconClass: 'text-red-500', to: 'https://redis.io/' },
  'sqlite': { label: 'SQLite', icon: 'i-simple-icons-sqlite', iconClass: 'text-sky-500', to: 'https://sqlite.org/' },
  'upstash': { label: 'Upstash', icon: 'i-simple-icons-upstash', iconClass: 'text-emerald-500', to: 'https://upstash.com/' },
  'vercel': { label: 'Vercel', icon: 'i-simple-icons-vercel', iconClass: 'text-stone-900 dark:text-stone-100', to: 'https://vercel.com/' },
} as const

const brand = computed(() => brands[props.name])
const to = computed(() => props.unlinked ? undefined : props.to ?? brand.value.to)
const tag = computed(() => to.value ? resolveComponent('NuxtLink') : 'span')
const external = computed(() => to.value?.startsWith('http'))
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    class="brand-badge"
  >
    <UIcon :name="brand.icon" class="brand-badge__icon size-3.5 shrink-0" :class="brand.iconClass" aria-hidden="true" />
    <span>{{ brand.label }}</span>
  </component>
</template>

<style scoped>
.brand-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) + 0.125rem);
  background: color-mix(in srgb, var(--ui-bg-elevated) 72%, var(--ui-bg));
  box-shadow: 0 1px 1px color-mix(in srgb, var(--ui-text) 5%, transparent);
  color: var(--ui-text-toned);
  font-size: 0.875em;
  font-weight: 500;
  line-height: 1.25;
  text-decoration: none;
  vertical-align: baseline;
  white-space: nowrap;
}

.brand-badge__icon {
  transform: translateY(0.1em);
}

a.brand-badge {
  transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
}

a.brand-badge:hover {
  border-color: color-mix(in srgb, var(--ui-text) 24%, var(--ui-border));
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
}

a.brand-badge:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>
