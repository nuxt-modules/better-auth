<script setup lang="ts">
const appear = ref(false)

onMounted(() => {
  setTimeout(() => {
    appear.value = true
  }, 100)
})
</script>

<template>
  <div
    class="pointer-events-none absolute -top-40 left-0 w-screen overflow-hidden md:-left-4 md:-top-52 md:w-auto md:overflow-visible transition-opacity duration-1000"
    :class="appear ? 'opacity-100' : 'opacity-0'"
  >
    <svg
      class="size-[100vw] md:size-[650px] lg:size-[900px]"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          class="fill-white/10 dark:fill-white/[0.06]"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
        </filter>
      </defs>
    </svg>
  </div>
</template>
