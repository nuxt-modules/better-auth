<script setup lang="ts">
const toast = useToast()
const { copy } = useClipboard()
const generated = ref(false)
const copied = ref(false)
const secretValue = ref('')

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

function generate() {
  secretValue.value = generateRandomString(32)
  generated.value = true
  copied.value = false

  const codeBlocks = document.querySelectorAll('pre code')
  for (const block of codeBlocks) {
    const spans = block.querySelectorAll('span.line span')
    for (const span of spans) {
      if (span.textContent?.includes('NUXT_BETTER_AUTH_SECRET=')) {
        span.textContent = `NUXT_BETTER_AUTH_SECRET=${secretValue.value}`
        // Hide copy button on this code block
        const pre = block.closest('pre')
        const copyBtn = pre?.querySelector('button')
        if (copyBtn)
          copyBtn.style.display = 'none'
        break
      }
    }
  }

  setTimeout(() => {
    for (const block of codeBlocks) {
      const spans = block.querySelectorAll('span.line span')
      for (const span of spans) {
        if (span.textContent?.includes('NUXT_BETTER_AUTH_SECRET=')) {
          span.textContent = 'NUXT_BETTER_AUTH_SECRET='
          // Restore copy button
          const pre = block.closest('pre')
          const copyBtn = pre?.querySelector('button')
          if (copyBtn)
            copyBtn.style.display = ''
          break
        }
      }
    }
    generated.value = false
    copied.value = false
    secretValue.value = ''
  }, 10000)
}

async function copySecret() {
  if (secretValue.value) {
    await copy(`NUXT_BETTER_AUTH_SECRET=${secretValue.value}`)
    copied.value = true
    toast.add({ title: 'Copied to clipboard', icon: 'i-lucide-check', color: 'success' })
  }
}
</script>

<template>
  <div class="flex items-center gap-2 my-3">
    <UButton variant="outline" :disabled="generated" @click="generate">
      {{ generated ? 'Generated!' : 'Generate Secret' }}
    </UButton>
    <UButton v-if="generated" variant="outline" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" @click="copySecret">
      {{ copied ? 'Copied' : 'Copy' }}
    </UButton>
  </div>
</template>
