<script setup lang="ts">
// @ts-expect-error yaml is not typed
import features from './features.yml'

const items = features.items as { title: string, description: string, icon: string }[]
</script>

<template>
  <section class="relative overflow-x-hidden">
    <!-- Vertical lines on sides (matching hero) -->
    <div class="hidden absolute top-0 left-5 w-px h-full bg-stone-200 dark:bg-[#26242C] pointer-events-none lg:block lg:left-16 xl:left-16" />
    <div class="hidden absolute top-0 right-5 w-px h-full bg-stone-200 dark:bg-[#26242C] pointer-events-none lg:block lg:right-14 xl:right-14" />

    <div class="md:w-10/12 mt-10 mx-auto relative min-w-0 border-thin border-stone-200 bg-white/70 ring-1 ring-black/[0.02] dark:border-stone-800 dark:bg-black/[0.95] dark:ring-white/[0.03] md:border-l-0 md:border-b-0">
      <div class="w-full min-w-0 md:mx-0">
        <!-- Features Grid -->
        <div class="grid grid-cols-1 relative md:grid-rows-2 md:grid-cols-3 border-b-thin border-stone-200 dark:border-stone-800">
          <!-- Plus decorators at grid intersections -->
          <div class="hidden md:grid top-1/2 left-0 -translate-y-1/2 w-full grid-cols-3 z-10 pointer-events-none select-none absolute">
            <UIcon name="i-lucide-plus" class="size-8 text-stone-300 translate-x-[16.5px] translate-y-[.5px] ml-auto dark:text-stone-600" />
            <UIcon name="i-lucide-plus" class="size-8 text-stone-300 ml-auto translate-x-[16.5px] translate-y-[.5px] dark:text-stone-600" />
          </div>

          <!-- Feature items -->
          <div
            v-for="(feature, index) in items"
            :key="feature.title"
            class="justify-center min-w-0 md:border-l-thin border-stone-200 dark:border-stone-800 md:min-h-[240px] border-t-thin md:border-t-0 transform-gpu flex flex-col p-8 transition-colors hover:bg-stone-50/70 dark:hover:bg-white/[0.02] md:p-10 2xl:p-12"
            :class="{ 'md:border-t-thin': index >= 3 }"
          >
            <div class="flex items-center gap-2 my-1">
              <UIcon :name="feature.icon" class="size-4 text-stone-700 dark:text-stone-300" />
              <p class="text-stone-700 dark:text-stone-300">
                {{ feature.title }}
              </p>
            </div>
            <div class="mt-2">
              <p class="mt-2 text-sm leading-6 text-left text-stone-600 dark:text-stone-400">
                {{ feature.description }}
                <NuxtLink class="underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-950 hover:decoration-stone-600 dark:decoration-stone-700 dark:hover:text-white dark:hover:decoration-stone-300" to="/getting-started/installation">
                  Learn more
                </NuxtLink>
              </p>
            </div>
          </div>
        </div>

        <!-- CTA Section (no top border - grid above has bottom border) -->
        <div class="relative col-span-3 md:border-l-thin border-stone-200 dark:border-stone-800 h-full py-20">
          <div class="w-full h-full px-6 py-10 md:px-10 2xl:px-16">
            <div class="flex flex-col items-start justify-center w-full h-full gap-3 md:items-center">
              <div class="flex items-center justify-start gap-2 md:justify-center">
                <UIcon name="i-lucide-globe" class="size-4" />
                <p class="text-stone-600 dark:text-stone-400">
                  Nuxt + Better Auth
                </p>
              </div>
              <p class="max-w-md mt-4 text-4xl font-normal tracking-tighter text-left md:mx-auto md:text-center md:text-4xl">
                <strong>Set up authentication in minutes, not hours!</strong>
              </p>
              <div class="flex flex-wrap mt-4 z-20 justify-start items-center gap-4 md:justify-center">
                <UButton to="/getting-started/installation" size="lg" class="ring-1 ring-black/10">
                  Get Started
                  <UIcon name="i-lucide-arrow-right" class="size-4" />
                </UButton>
                <UButton to="https://www.better-auth.com/docs" target="_blank" color="neutral" variant="outline" size="lg" class="bg-white/40 dark:bg-white/[0.03]">
                  Better Auth Docs
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
