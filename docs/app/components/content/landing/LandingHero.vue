<script setup lang="ts">
import type { MDCParserResult } from '@nuxtjs/mdc'
import { useElementSize } from '@vueuse/core'
import { motion, MotionConfig } from 'motion-v'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
// @ts-expect-error yaml is not typed
import hero from './hero.yml'

const currentTab = ref(0)
const contentRef = ref<HTMLElement | null>(null)
const { height } = useElementSize(contentRef)

const tabs = hero.tabs as { name: string, code: string }[]

const lineCounts = computed(() => tabs.map(tab => tab.code.trim().split('\n').length))

function getLang(filename: string) {
  if (filename.endsWith('.ts'))
    return 'ts'
  if (filename.endsWith('.vue'))
    return 'vue'
  if (filename.endsWith('.js'))
    return 'js'
  return 'ts'
}

function getCodeBlock(tab: { name: string, code: string }) {
  return `\`\`\`${getLang(tab.name)}\n${tab.code.trim()}\n\`\`\``
}

const codeBlocks = await Promise.all(
  tabs.map(tab => parseMarkdown(getCodeBlock(tab), {
    contentHeading: false,
    toc: false,
  }) as Promise<MDCParserResult>),
)
</script>

<template>
  <AnnouncementBanner />
  <section class="relative w-full flex md:items-center md:justify-center bg-white/96 dark:bg-black/[0.96] antialiased min-h-[40rem] md:min-h-[50rem] lg:min-h-[40rem]">
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
    <div class="px-4 py-8 md:w-10/12 mx-auto relative z-10">
      <div class="mx-auto grid lg:max-w-8xl xl:max-w-full grid-cols-1 items-center gap-x-8 gap-y-16 px-4 py-2 lg:grid-cols-2 lg:px-8 lg:py-4 xl:gap-x-16 xl:px-0">
        <!-- Left: Text content -->
        <div class="relative z-10 text-left lg:mt-0">
          <div class="relative space-y-4">
            <div class="space-y-2">
              <!-- Tagline -->
              <div class="flex items-center gap-1 mt-2">
                <UIcon name="i-lucide-sparkles" class="size-3.5" />
                <span class="text-xs opacity-75">{{ hero.tagline }}</span>
              </div>

              <!-- Headline -->
              <p class="text-stone-800 dark:text-stone-300 tracking-tight text-2xl md:text-3xl text-pretty">
                {{ hero.title }}
              </p>
            </div>

            <!-- npm install command -->
            <div class="relative flex items-center gap-2 w-full sm:w-[90%] border border-stone-200/50 dark:border-white/10">
              <div class="relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-sm z-10 bg-stone-50 dark:bg-zinc-950">
                <div class="w-full flex flex-col min-[350px]:flex-row min-[350px]:items-center gap-0.5 min-[350px]:gap-2 min-w-0">
                  <p class="text-xs sm:text-sm font-mono select-none tracking-tighter space-x-1 shrink-0">
                    <span class="text-sky-500">git:</span><span class="text-red-400">(main)</span>
                    <span class="italic text-amber-600">x</span>
                  </p>
                  <p class="relative inline tracking-tight opacity-90 md:text-sm text-xs dark:text-white font-mono text-black select-all">
                    npx nuxi module add <span class="relative dark:text-fuchsia-300 text-fuchsia-800">@onmax/nuxt-better-auth@alpha</span>
                  </p>
                </div>
                <div class="flex gap-2 items-center">
                  <NuxtLink to="https://www.npmjs.com/package/@onmax/nuxt-better-auth" target="_blank" class="opacity-60 hover:opacity-100 transition-opacity">
                    <UIcon name="i-simple-icons-npm" class="size-4 text-red-500" />
                  </NuxtLink>
                  <NuxtLink to="https://github.com/onmax/nuxt-better-auth" target="_blank" class="opacity-60 hover:opacity-100 transition-opacity">
                    <UIcon name="i-simple-icons-github" class="size-4" />
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- CTA Buttons -->
            <div class="mt-4 flex w-full max-w-sm items-center gap-3 font-sans min-[390px]:w-fit md:max-w-none md:gap-4 md:justify-center lg:justify-start">
              <NuxtLink
                to="/getting-started/installation"
                class="shrink-0 border-2 border-black bg-white px-4 py-1.5 text-sm uppercase text-black shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)] transition duration-200 hover:shadow-sm dark:border-stone-400 dark:hover:shadow-sm dark:shadow-[1px_1px_rgba(120,113,108),2px_2px_rgba(120,113,108),3px_3px_rgba(120,113,108),4px_4px_rgba(120,113,108),5px_5px_0px_0px_rgba(120,113,108)] md:px-8"
              >
                Get Started
              </NuxtLink>
              <NuxtLink
                to="https://github.com/onmax/nuxt-better-auth"
                target="_blank"
                class="group relative inline-block min-w-0 p-px text-xs font-semibold leading-6 text-white no-underline"
              >
                <span class="absolute inset-0 overflow-hidden rounded-sm">
                  <span class="absolute inset-0 rounded-sm bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </span>
                <span class="relative z-10 flex items-center gap-2 rounded-none bg-zinc-950 px-4 py-2 ring-1 ring-white/10 md:px-8">
                  <UIcon name="i-simple-icons-github" class="size-4" />
                  <span>GitHub</span>
                </span>
                <span class="absolute bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-stone-800/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Right: Code preview -->
        <div class="relative md:block lg:static xl:pl-10">
          <div class="relative">
            <div class="pointer-events-none from-sky-300 via-sky-300/70 to-blue-300 absolute inset-0 rounded-none bg-gradient-to-tr opacity-0 dark:opacity-5 blur-lg" />
            <div class="pointer-events-none from-stone-300 via-stone-300/70 to-blue-300 absolute inset-0 rounded-none bg-gradient-to-tr opacity-0 dark:opacity-5" />

            <!-- Code Preview Card -->
            <MotionConfig :transition="{ duration: 0.3, ease: 'easeInOut' }">
              <motion.div
                :animate="{ height: height > 0 ? height : undefined }"
                class="code-preview relative overflow-hidden rounded-sm backdrop-blur-lg"
              >
                <div ref="contentRef">
                  <div class="pointer-events-none absolute -top-px left-0 right-0 h-px" />
                  <div class="pointer-events-none absolute -bottom-px left-11 right-20 h-px" />
                  <div class="pl-4 pt-4">
                    <!-- Traffic lights -->
                    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" class="h-2.5 w-auto stroke-slate-500/30">
                      <circle cx="5" cy="5" r="4.5" />
                      <circle cx="21" cy="5" r="4.5" />
                      <circle cx="37" cy="5" r="4.5" />
                    </svg>

                    <!-- Tabs with layoutId animation -->
                    <div class="relative z-10 mt-4 flex space-x-2 text-xs">
                      <button
                        v-for="(tab, index) in tabs"
                        :key="tab.name"
                        type="button"
                        class="relative isolate flex h-6 cursor-pointer items-center justify-center rounded-full px-2.5 transition-colors"
                        :class="currentTab === index ? 'text-stone-300' : 'text-slate-500'"
                        @click="currentTab = index"
                      >
                        {{ tab.name }}
                        <motion.div
                          v-if="currentTab === index"
                          layout-id="tab-code-preview"
                          class="pointer-events-none bg-stone-800 absolute inset-0 -z-10 rounded-full"
                        />
                      </button>
                    </div>

                    <!-- Code content area -->
                    <div class="flex flex-col items-start px-1 text-sm mt-6">
                      <ScrollAreaRoot class="w-full overflow-hidden">
                        <ScrollAreaViewport class="w-full">
                          <!-- All tabs rendered for SSR, animated with CSS -->
                          <div class="relative">
                            <div
                              v-for="(tab, index) in tabs"
                              :key="tab.name"
                              class="flex items-start px-1 text-sm min-w-max transition-all duration-250 ease-out"
                              :class="index === currentTab ? 'opacity-100 relative' : 'opacity-0 absolute inset-0 pointer-events-none'"
                            >
                              <!-- Line numbers gutter -->
                              <div
                                aria-hidden="true"
                                class="text-slate-600 select-none pl-2 pr-4 font-mono text-xs sm:text-sm leading-6"
                              >
                                <div v-for="i in lineCounts[index]" :key="i">
                                  {{ String(i).padStart(2, '0') }}
                                </div>
                              </div>

                              <div class="hero-code">
                                <MDCRenderer :body="codeBlocks[index].body" />
                              </div>
                            </div>
                          </div>
                        </ScrollAreaViewport>
                        <ScrollAreaScrollbar orientation="horizontal" class="flex select-none touch-none p-0.5 bg-stone-800/50 transition-colors h-2.5 flex-col">
                          <ScrollAreaThumb class="flex-1 bg-stone-600 rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                        </ScrollAreaScrollbar>
                      </ScrollAreaRoot>

                      <!-- Demo CTA (bottom-right) -->
                      <motion.div layout class="self-end mt-3">
                        <NuxtLink
                          to="https://demo-nuxt-better-auth.onmax.me/"
                          target="_blank"
                          class="shadow-md border dark:border-stone-700 border-stone-300 mb-4 ml-auto mr-4 mt-auto flex cursor-pointer items-center gap-2 px-3 py-1 transition-all ease-in-out hover:opacity-70"
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
              </motion.div>
            </MotionConfig>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
