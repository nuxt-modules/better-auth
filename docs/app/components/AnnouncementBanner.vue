<template>
  <div class="announcement-banner relative overflow-hidden border-b border-[var(--ui-border)] bg-stone-50 dark:bg-black h-[var(--banner-height,42px)]">
    <div class="absolute inset-0 bg-grid text-stone-200 dark:text-stone-900 [background-size:16px_16px] opacity-50" />
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/60 via-transparent to-transparent dark:from-stone-900/60" />
    <div class="absolute inset-0 bg-gradient-to-r from-stone-50/80 via-transparent to-stone-50/80 dark:from-stone-950/80 dark:to-stone-950/80" />
    <div class="relative flex items-center justify-center px-4 text-sm h-full">
      <span class="text-stone-500 dark:text-stone-500">This library is in early development. Expect breaking changes.</span>
    </div>
  </div>
</template>
