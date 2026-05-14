<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const commandTabs = [
  {
    label: 'For humans',
    value: 'humans',
    icon: 'i-lucide-user',
  },
  {
    label: 'For agents',
    value: 'agents',
    icon: 'i-lucide-bot',
  },
] as const

const packageManagers = [
  {
    label: 'pnpm',
    value: 'pnpm',
    icon: 'i-simple-icons-pnpm',
    command: 'pnpm dlx nuxi module add @onmax/nuxt-better-auth@alpha',
  },
  {
    label: 'npm',
    value: 'npm',
    icon: 'i-simple-icons-npm',
    command: 'npx nuxi module add @onmax/nuxt-better-auth@alpha',
  },
  {
    label: 'bun',
    value: 'bun',
    icon: 'i-simple-icons-bun',
    command: 'bunx nuxi module add @onmax/nuxt-better-auth@alpha',
  },
  {
    label: 'yarn',
    value: 'yarn',
    icon: 'i-simple-icons-yarn',
    command: 'yarn dlx nuxi module add @onmax/nuxt-better-auth@alpha',
  },
] as const

type PackageManager = (typeof packageManagers)[number]['value']

const activeCommandTab = ref<(typeof commandTabs)[number]['value']>('humans')
const activePackageManager = ref<PackageManager>('pnpm')
const isMobile = useMediaQuery('(max-width: 639px)')
const requestUrl = useRequestURL()
const appBaseURL = useRuntimeConfig().app.baseURL || '/'
const promptOpen = ref(false)
const copied = ref<string | null>(null)
const commandMeasure = ref<HTMLElement | null>(null)
const commandWidth = ref<number | null>(null)
const resetPromptAfterLeave = ref(false)

const selectedPackageManager = computed(() =>
  isMobile.value
    ? packageManagers[0]
    : packageManagers.find(manager => manager.value === activePackageManager.value) ?? packageManagers[0],
)

const activeCommand = computed(() => selectedPackageManager.value.command)
const rawInstallationDocsUrl = computed(() => {
  const normalizedBaseURL = appBaseURL === '/' ? '' : appBaseURL.replace(/\/$/, '')

  return new URL(`${normalizedBaseURL}/raw/getting-started/installation.md`, requestUrl.origin).toString()
})

const agentPrompt = computed(() => `Install @onmax/nuxt-better-auth in my Nuxt 4 app.

- Read the raw installation documentation first: ${rawInstallationDocsUrl.value}
- Run \`${activeCommand.value}\`
- Set \`BETTER_AUTH_SECRET\` in \`.env\` (at least 32 chars, high entropy). Optionally prefix with \`NUXT_\` for runtime config
- Optionally set \`NUXT_PUBLIC_SITE_URL\` for non-auto-detected platforms
- Create \`server/auth.config.ts\` using \`defineServerAuth\` from \`@onmax/nuxt-better-auth/config\`
- Create \`app/auth.config.ts\` using \`defineClientAuth\` from \`@onmax/nuxt-better-auth/config\`
- The module auto-injects \`secret\` and \`baseURL\` — do not configure them manually
- In \`defineServerAuth\`, use the app config callback's \`requestOrigin\` when Better Auth needs the current request host, such as \`trustedOrigins\``)

async function copyValue(value: string, key: string) {
  copied.value = key
  setTimeout(() => {
    if (copied.value === key)
      copied.value = null
  }, 1500)

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    }
    else {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
  }
  catch {}
}

function updateCommandWidth() {
  if (!commandMeasure.value)
    return

  commandWidth.value = Math.ceil(commandMeasure.value.getBoundingClientRect().width)
}

onMounted(async () => {
  await nextTick()
  updateCommandWidth()
})

watch(activeCommand, async () => {
  copied.value = null
  await nextTick()
  updateCommandWidth()
})

watch(activeCommandTab, () => {
  copied.value = null
  if (activeCommandTab.value === 'humans')
    resetPromptAfterLeave.value = true
})

function handleInstallMainAfterLeave() {
  if (!resetPromptAfterLeave.value)
    return

  promptOpen.value = false
  resetPromptAfterLeave.value = false
}

watch(promptOpen, (open) => {
  if (open)
    resetPromptAfterLeave.value = false
})
</script>

<template>
  <div class="landing-install">
    <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        class="relative grid w-full grid-cols-2 gap-1 rounded-sm bg-stone-100/80 p-1 text-xs ring-1 ring-stone-950/10 sm:w-auto dark:bg-zinc-950 dark:ring-white/10"
        role="tablist"
        aria-label="Install audience"
      >
        <span
          class="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%_-_0.75rem)/2)] rounded-[3px] bg-white shadow-sm ring-1 ring-stone-950/10 transition-transform duration-150 ease-out motion-reduce:transition-none dark:bg-stone-800 dark:ring-white/10"
          :style="{
            transform: activeCommandTab === 'agents' ? 'translateX(calc(100% + 0.25rem))' : 'translateX(0)',
          }"
          aria-hidden="true"
        />
        <UButton
          v-for="tab in commandTabs"
          :key="tab.value"
          type="button"
          color="neutral"
          variant="ghost"
          role="tab"
          :aria-selected="activeCommandTab === tab.value"
          class="relative z-10 h-8 min-w-0 justify-center rounded-[3px] px-3 text-xs font-medium hover:bg-transparent active:bg-transparent sm:min-w-28"
          :class="activeCommandTab === tab.value ? 'text-stone-950 dark:text-white' : 'text-stone-500 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300'"
          @pointerdown="activeCommandTab = tab.value"
          @mousedown="activeCommandTab = tab.value"
          @click="activeCommandTab = tab.value"
          @pointerup="activeCommandTab = tab.value"
        >
          <UIcon :name="tab.icon" class="size-3.5 shrink-0" />
          <span>{{ tab.label }}</span>
        </UButton>
      </div>

      <Transition name="manager-picker">
        <div
          v-if="activeCommandTab === 'humans' && !isMobile"
          class="hidden max-w-full items-center gap-1 rounded-sm bg-stone-100/80 p-1 text-xs ring-1 ring-stone-950/10 sm:flex sm:w-max dark:bg-zinc-950 dark:ring-white/10"
          role="radiogroup"
          aria-label="Package manager"
        >
          <UButton
            v-for="manager in packageManagers"
            :key="manager.value"
            type="button"
            color="neutral"
            variant="ghost"
            role="radio"
            :aria-checked="activePackageManager === manager.value"
            :aria-label="manager.label"
            class="h-8 min-w-8 justify-center gap-0 overflow-hidden rounded-[3px] text-xs font-medium transition-[width,color,background-color,box-shadow] duration-200 ease-out active:bg-transparent motion-reduce:transition-none"
            :class="activePackageManager === manager.value ? 'w-20 bg-white px-2.5 text-stone-950 shadow-sm ring-1 ring-stone-950/10 hover:bg-white active:bg-white dark:bg-stone-800 dark:text-white dark:ring-white/10 dark:hover:bg-stone-800 dark:active:bg-stone-800' : 'w-8 px-0 text-stone-500 grayscale hover:bg-white/40 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-white/[0.04] dark:hover:text-stone-300'"
            @pointerdown="activePackageManager = manager.value"
            @mousedown="activePackageManager = manager.value"
            @click="activePackageManager = manager.value"
            @pointerup="activePackageManager = manager.value"
          >
            <UIcon :name="manager.icon" class="size-3.5 shrink-0" />
            <span
              class="overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin-left] duration-150 ease-out motion-reduce:transition-none"
              :class="activePackageManager === manager.value ? 'ml-1.5 max-w-12 opacity-100' : 'ml-0 max-w-0 opacity-0'"
            >
              {{ manager.label }}
            </span>
          </UButton>
        </div>
      </Transition>
    </div>

    <Transition name="install-main" mode="out-in" @after-leave="handleInstallMainAfterLeave">
      <UButton
        v-if="activeCommandTab === 'humans'"
        key="humans-command"
        type="button"
        color="neutral"
        variant="ghost"
        class="group h-auto w-full justify-start rounded-sm border border-stone-950/10 bg-white/70 px-3 py-2 text-left hover:bg-white active:bg-white dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.04]"
        :aria-label="copied === 'command' ? 'Copied command' : 'Copy command'"
        @click="copyValue(activeCommand, 'command')"
      >
        <span class="inline-flex size-6 shrink-0 items-center justify-center rounded-[3px] bg-stone-100 text-stone-500 ring-1 ring-stone-950/10 select-none dark:bg-white/[0.06] dark:text-stone-400 dark:ring-white/10">
          <UIcon name="i-lucide-terminal" class="size-3.5" />
        </span>
        <span
          class="relative block min-w-0 overflow-hidden font-mono text-xs text-stone-950 sm:text-sm dark:text-white"
          :style="commandWidth ? { width: `${commandWidth}px` } : undefined"
        >
          <span ref="commandMeasure" aria-hidden="true" class="pointer-events-none invisible absolute whitespace-nowrap">{{ activeCommand }}</span>
          <Transition name="command-swap" mode="out-in">
            <code :key="activeCommand" class="block truncate whitespace-nowrap">
              {{ activeCommand }}
            </code>
          </Transition>
        </span>
        <span class="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-stone-500 group-hover:bg-stone-100/80 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:bg-white/[0.06] dark:group-hover:text-stone-300">
          <Transition name="copy-icon" mode="out-in">
            <svg v-if="copied === 'command'" key="check" class="size-4 text-emerald-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <UIcon v-else key="copy" name="i-lucide-copy" class="size-4" />
          </Transition>
        </span>
      </UButton>

      <div v-else key="agents-prompt" class="overflow-hidden rounded-sm border border-stone-950/10 bg-white/70 text-left dark:border-white/10 dark:bg-zinc-950">
        <UCollapsible
          v-model:open="promptOpen"
          :ui="{ content: 'overflow-hidden data-[state=open]:animate-[collapsible-down_150ms_ease-out] data-[state=closed]:animate-[collapsible-up_150ms_ease-out]' }"
        >
          <template #default="{ open }">
            <div class="flex min-h-11 items-center gap-2 px-3 py-2">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                class="min-w-0 flex-1 justify-start rounded-sm p-0 text-left text-sm text-stone-700 hover:bg-transparent hover:text-stone-800 active:bg-transparent dark:text-stone-300 dark:hover:text-stone-100"
                :aria-expanded="open"
              >
                <UIcon :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 shrink-0" />
                <UIcon name="i-lucide-sparkles" class="size-4 shrink-0 text-stone-500 dark:text-stone-500" />
                <span class="min-w-0 truncate font-medium">AI install prompt</span>
              </UButton>

              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                class="h-7 shrink-0 rounded-sm px-2 text-stone-500 hover:bg-stone-100/80 hover:text-stone-700 active:bg-stone-100/80 dark:text-stone-500 dark:hover:bg-white/[0.06] dark:hover:text-stone-300 dark:active:bg-white/[0.06]"
                :aria-label="copied === 'prompt' ? 'Copied prompt' : 'Copy prompt'"
                @click.stop="copyValue(agentPrompt, 'prompt')"
              >
                <Transition name="copy-icon" mode="out-in">
                  <span v-if="copied === 'prompt'" key="check" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <svg class="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="text-xs font-medium">Copied</span>
                  </span>
                  <UIcon v-else key="copy" name="i-lucide-copy" class="size-4" />
                </Transition>
              </UButton>
            </div>
          </template>

          <template #content>
            <pre class="max-h-72 overflow-auto border-t border-stone-950/10 bg-stone-50/70 px-3 py-3 text-left text-xs leading-5 text-stone-800 dark:border-white/10 dark:bg-black/10 dark:text-stone-200"><code>{{ agentPrompt }}</code></pre>
          </template>
        </UCollapsible>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.landing-install {
  display: flex;
  width: 100%;
  max-width: 38rem;
  flex-direction: column;
  gap: 0.75rem;
}

.command-swap-enter-active,
.command-swap-leave-active,
.copy-icon-enter-active,
.copy-icon-leave-active,
.install-main-enter-active,
.install-main-leave-active,
.manager-picker-enter-active,
.manager-picker-leave-active {
  transition: opacity 0.14s ease-out, transform 0.14s ease-out;
}

.command-swap-enter-from,
.command-swap-leave-to,
.copy-icon-enter-from,
.copy-icon-leave-to,
.install-main-enter-from,
.install-main-leave-to,
.manager-picker-enter-from,
.manager-picker-leave-to {
  opacity: 0;
  transform: translateY(0.125rem);
}

.install-main-enter-from {
  transform: translateY(-0.125rem);
}

.install-main-leave-to {
  transform: translateY(0.125rem);
}

.copy-icon-enter-from {
  transform: scale(0.92);
}

.copy-icon-leave-to {
  transform: scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .command-swap-enter-active,
  .command-swap-leave-active,
  .copy-icon-enter-active,
  .copy-icon-leave-active,
  .install-main-enter-active,
  .install-main-leave-active,
  .manager-picker-enter-active,
  .manager-picker-leave-active {
    transition: none;
  }
}
</style>
