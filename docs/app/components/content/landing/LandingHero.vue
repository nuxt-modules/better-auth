<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import { useElementSize } from '@vueuse/core'
import { motion, MotionConfig } from 'motion-v'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
// @ts-expect-error yaml is not typed
import hero from './hero.yml'

const currentFileIndex = ref(0)
const mobileFilesOpen = ref(false)
const contentRef = ref<HTMLElement | null>(null)
const { height } = useElementSize(contentRef)

const files = hero.tabs as { name: string, code: string }[]

const trimmedCode = computed(() => files.map(file => file.code.trim()))
const lineCounts = computed(() => trimmedCode.value.map(code => code.split('\n').length))
const currentFile = computed(() => files[currentFileIndex.value]?.name ?? files[0]?.name ?? '')
const mobileFileItems = computed(() => files.map((file, index) => ({
  ...file,
  index,
  directory: file.name.includes('/') ? file.name.split('/').slice(0, -1).join('/') : '',
  filename: file.name.split('/').at(-1) ?? file.name,
})))

function getFileIcon(filename: string) {
  if (filename.endsWith('.vue'))
    return 'i-lucide-component'
  if (filename.endsWith('.ts'))
    return 'i-lucide-file-code-2'
  if (filename.endsWith('.json'))
    return 'i-lucide-braces'
  return 'i-lucide-file-code-2'
}

function selectFile(index: number) {
  currentFileIndex.value = index
  mobileFilesOpen.value = false
}

function selectedTreeClass(index: number) {
  return currentFileIndex.value === index
    ? '!text-stone-50 before:!bg-white/[0.08] hover:before:!bg-white/[0.1]'
    : ''
}

const fileTreeItems = computed<TreeItem[]>(() => [
  {
    id: 'nuxt.config.ts',
    label: 'nuxt.config.ts',
    icon: getFileIcon('nuxt.config.ts'),
    class: selectedTreeClass(0),
    onSelect: () => selectFile(0),
  },
  {
    id: 'server',
    label: 'server',
    defaultExpanded: true,
    children: [
      {
        id: 'server/auth.config.ts',
        label: 'auth.config.ts',
        icon: getFileIcon('server/auth.config.ts'),
        class: selectedTreeClass(1),
        onSelect: () => selectFile(1),
      },
    ],
  },
  {
    id: 'app',
    label: 'app',
    defaultExpanded: true,
    children: [
      {
        id: 'app/auth.config.ts',
        label: 'auth.config.ts',
        icon: getFileIcon('app/auth.config.ts'),
        class: selectedTreeClass(2),
        onSelect: () => selectFile(2),
      },
    ],
  },
  {
    id: 'pages',
    label: 'pages',
    defaultExpanded: true,
    children: [
      {
        id: 'pages/login.vue',
        label: 'login.vue',
        icon: getFileIcon('pages/login.vue'),
        class: selectedTreeClass(3),
        onSelect: () => selectFile(3),
      },
    ],
  },
])

const selectedTreeItem = computed(() => {
  if (currentFileIndex.value === 0)
    return fileTreeItems.value[0]

  const folder = fileTreeItems.value[currentFileIndex.value]
  return folder?.children?.[0] ?? fileTreeItems.value[0]
})

function getTreeItemKey(item: TreeItem) {
  return item.id ?? item.label ?? ''
}

function getLang(filename: string) {
  if (filename.endsWith('.vue'))
    return 'vue'
  if (filename.endsWith('.js'))
    return 'js'
  if (filename.endsWith('.json'))
    return 'json'
  if (filename.endsWith('.sh') || filename.endsWith('.bash'))
    return 'bash'
  return 'ts'
}
</script>

<template>
  <AnnouncementBanner />
  <section class="relative w-full flex overflow-x-hidden md:items-end md:justify-center bg-white/96 dark:bg-black/[0.96] antialiased min-h-[40rem] md:min-h-[50rem] lg:min-h-[40rem]">
    <!-- Spotlight Effect -->
    <LandingSpotlight />

    <!-- Background Grid -->
    <div class="absolute inset-0 left-5 right-5 lg:left-16 lg:right-14 xl:left-16 xl:right-14">
      <div class="absolute inset-0 bg-grid text-stone-100 dark:text-white/[0.02]" />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[--ui-bg]" />
    </div>

    <!-- Vertical lines on sides -->
    <div class="hidden absolute top-0 left-5 w-px h-[calc(100%_+_30px)] bg-stone-200 dark:bg-[#26242C] pointer-events-none lg:block lg:left-16 xl:left-16" />
    <div class="hidden absolute top-0 right-5 w-px h-[calc(100%_+_30px)] bg-stone-200 dark:bg-[#26242C] pointer-events-none lg:block lg:right-14 xl:right-14" />

    <!-- Plus icons at top of lines -->
    <UIcon name="i-lucide-plus" class="hidden absolute top-[4.5rem] size-6 left-[3.275rem] pointer-events-none lg:block text-neutral-300 dark:text-neutral-600" />
    <UIcon name="i-lucide-plus" class="hidden absolute top-[4.5rem] size-6 right-[2.775rem] pointer-events-none lg:block text-neutral-300 dark:text-neutral-600" />

    <!-- Content -->
    <div class="relative z-10 w-full px-4 py-8 md:w-10/12 md:mx-auto md:pb-16 lg:pb-20">
      <div class="flex w-full min-w-0 flex-col items-start gap-8 px-0 py-2 text-left lg:mx-auto lg:max-w-4xl lg:items-center lg:px-8 lg:py-4 lg:text-center xl:px-0">
        <!-- Text content -->
        <div class="relative z-10 w-full min-w-0 text-left lg:text-center">
          <div class="relative mx-auto space-y-4 lg:flex lg:max-w-2xl lg:flex-col lg:items-center">
            <div class="space-y-2">
              <!-- Tagline -->
              <div class="flex items-center justify-start gap-1 mt-2 lg:justify-center">
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
                <span class="text-xs opacity-75">{{ hero.tagline }}</span>
              </div>

              <!-- Headline -->
              <p class="text-left text-stone-800 dark:text-stone-300 tracking-tight text-2xl md:text-3xl text-pretty lg:text-center">
                {{ hero.title }}
              </p>
            </div>

            <LandingInstallCommands />

            <!-- CTA Buttons -->
            <div class="mt-4 flex w-full max-w-sm items-center justify-start gap-3 font-sans min-[390px]:w-fit md:max-w-none md:gap-4 lg:justify-center">
              <NuxtLink
                to="/getting-started/installation"
                class="shrink-0 border-2 border-black bg-white px-4 py-1.5 text-sm uppercase text-black shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0)] transition duration-200 hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 dark:border-stone-400 dark:shadow-[1px_1px_rgba(120,113,108),2px_2px_rgba(120,113,108),3px_3px_rgba(120,113,108),4px_4px_rgba(120,113,108)] dark:hover:shadow-[1px_1px_rgba(120,113,108),2px_2px_rgba(120,113,108)] dark:focus-visible:outline-stone-300 md:px-8"
              >
                Get Started
              </NuxtLink>
              <NuxtLink
                to="https://github.com/nuxt-modules/better-auth"
                target="_blank"
                class="group relative inline-block min-w-0 text-xs font-semibold leading-6 text-stone-950 no-underline dark:text-white"
              >
                <span class="relative z-10 flex items-center gap-2 rounded-none bg-transparent px-4 py-2 text-stone-950 transition-colors group-hover:text-stone-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950 dark:text-white dark:group-hover:text-stone-300 dark:focus-visible:outline-stone-300 md:px-8">
                  <UIcon name="i-simple-icons-github" class="size-4" />
                  <span>GitHub</span>
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Code preview -->
        <div class="relative w-full min-w-0 md:block lg:max-w-3xl">
          <div class="relative">
            <div class="pointer-events-none absolute -inset-x-4 -inset-y-3 rounded-[6px] bg-stone-950/[0.04] opacity-60 blur-xl dark:bg-black/40" />

            <!-- Code Preview Card -->
            <MotionConfig :transition="{ duration: 0.3, ease: 'easeInOut' }">
              <motion.div
                :animate="{ height: height > 0 ? height : undefined }"
                class="code-preview relative min-w-0 overflow-hidden rounded-md text-left"
              >
                <div ref="contentRef">
                  <div class="min-w-0">
                    <div class="editor-toolbar flex min-w-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
                      <!-- Traffic lights -->
                      <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" class="h-2.5 w-auto shrink-0 stroke-stone-500/45">
                        <circle cx="5" cy="5" r="4.5" />
                        <circle cx="21" cy="5" r="4.5" />
                        <circle cx="37" cy="5" r="4.5" />
                      </svg>

                      <div class="min-w-0 truncate font-mono text-xs text-stone-400">
                        {{ currentFile }}
                      </div>
                    </div>

                    <div class="grid min-w-0 grid-cols-1 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <aside class="file-tree hidden min-w-0 border-r border-white/10 bg-black/[0.12] px-2 py-3 text-left sm:block" aria-label="Example files">
                        <div class="mb-2 px-2 text-[10px] font-medium uppercase text-stone-500">
                          Project
                        </div>
                        <UTree
                          :model-value="selectedTreeItem"
                          :items="fileTreeItems"
                          :get-key="getTreeItemKey"
                          :default-expanded="['server', 'app', 'pages']"
                          size="xs"
                          color="neutral"
                          expanded-icon="i-lucide-folder-open"
                          collapsed-icon="i-lucide-folder"
                          :ui="{
                            root: 'space-y-0.5',
                            link: 'h-7 rounded-[5px] px-2 !text-stone-400 before:!bg-transparent hover:!text-stone-100 hover:before:!bg-white/[0.05] focus-visible:before:!ring-white/20',
                            linkLeadingIcon: 'size-4 shrink-0 text-stone-500 group-hover:text-stone-300',
                            linkLabel: 'truncate text-xs font-medium',
                            linkTrailingIcon: 'size-3.5 text-stone-500',
                            listWithChildren: 'ms-4 border-s border-white/10 ps-1.5',
                          }"
                        />
                      </aside>

                      <!-- Code content area -->
                      <div class="flex min-w-0 flex-col items-start px-3 py-4 text-left text-sm sm:px-5 sm:py-5">
                        <UCollapsible v-model:open="mobileFilesOpen" class="mb-4 w-full sm:hidden">
                          <UButton
                            type="button"
                            color="neutral"
                            variant="ghost"
                            class="h-9 w-full justify-between rounded-[5px] bg-white/[0.06] px-2.5 text-left text-stone-100 ring-1 ring-white/10 hover:bg-white/[0.08]"
                            :aria-label="mobileFilesOpen ? 'Hide example files' : 'Show example files'"
                          >
                            <span class="flex min-w-0 items-center gap-2">
                              <UIcon name="i-lucide-folder-tree" class="size-4 shrink-0 text-stone-400" />
                              <span class="min-w-0 truncate font-mono text-xs">{{ currentFile }}</span>
                            </span>
                            <UIcon :name="mobileFilesOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4 shrink-0 text-stone-400" />
                          </UButton>

                          <template #content>
                            <div class="mt-2 rounded-[5px] bg-black/[0.16] p-2 ring-1 ring-white/10">
                              <div class="space-y-1" role="listbox" aria-label="Example files">
                                <UButton
                                  v-for="file in mobileFileItems"
                                  :key="file.name"
                                  type="button"
                                  color="neutral"
                                  variant="ghost"
                                  role="option"
                                  :aria-selected="currentFileIndex === file.index"
                                  class="h-auto w-full justify-start gap-2 rounded-[5px] px-2 py-2 text-left"
                                  :class="currentFileIndex === file.index ? 'bg-white/10 text-stone-50 ring-1 ring-white/10 hover:bg-white/10' : 'text-stone-400 hover:bg-white/[0.06] hover:text-stone-100'"
                                  @click="selectFile(file.index)"
                                >
                                  <UIcon :name="getFileIcon(file.name)" class="size-4 shrink-0" />
                                  <span class="min-w-0 leading-4">
                                    <span v-if="file.directory" class="block truncate text-[10px] text-stone-500">
                                      {{ file.directory }}
                                    </span>
                                    <span class="block truncate text-sm font-medium">
                                      {{ file.filename }}
                                    </span>
                                  </span>
                                </UButton>
                              </div>
                            </div>
                          </template>
                        </UCollapsible>

                        <ScrollAreaRoot class="w-full min-w-0 overflow-hidden">
                          <ScrollAreaViewport class="w-full min-w-0 overflow-x-auto overscroll-x-contain">
                            <!-- All files rendered for SSR, animated with CSS -->
                            <div class="relative">
                              <div
                                v-for="(file, index) in files"
                                :key="file.name"
                                class="flex min-w-max items-start px-1 text-left text-sm transition-all duration-250 ease-out"
                                :class="index === currentFileIndex ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'"
                              >
                                <!-- Line numbers gutter -->
                                <div
                                  aria-hidden="true"
                                  class="select-none pl-1 pr-4 font-mono text-xs leading-6 text-stone-500/80 sm:text-sm"
                                >
                                  <div v-for="i in lineCounts[index]" :key="i">
                                    {{ String(i).padStart(2, '0') }}
                                  </div>
                                </div>

                                <div class="hero-code">
                                  <Shiki
                                    :code="trimmedCode[index]"
                                    :lang="getLang(file.name)"
                                    unwrap
                                  />
                                </div>
                              </div>
                            </div>
                          </ScrollAreaViewport>
                          <ScrollAreaScrollbar orientation="horizontal" class="flex h-2 select-none touch-none flex-col rounded-full bg-white/[0.04] p-0.5">
                            <ScrollAreaThumb class="relative flex-1 rounded-full bg-white/20 before:absolute before:top-1/2 before:left-1/2 before:min-h-[44px] before:w-full before:min-w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']" />
                          </ScrollAreaScrollbar>
                        </ScrollAreaRoot>

                        <!-- Demo CTA (bottom-right) -->
                        <motion.div layout class="self-end mt-3">
                          <NuxtLink
                            to="https://demo-nuxt-better-auth.onmax.me/"
                            target="_blank"
                            class="mb-1 ml-auto mt-auto flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-white/[0.07] py-1.5 pr-3 pl-2 text-stone-200 ring-1 ring-white/10 hover:bg-white/[0.1] hover:text-white"
                          >
                            <!-- Pixel art play icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M10 20H8V4h2v2h2v3h2v2h2v2h-2v2h-2v3h-2z" />
                            </svg>
                            <p class="text-sm">
                              Demo
                            </p>
                          </NuxtLink>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </MotionConfig>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
