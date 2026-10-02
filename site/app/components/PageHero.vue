<script setup lang="ts">
defineProps<{ kicker?: string, title: string, subtitle?: string | null }>()
</script>

<template>
  <section class="la-hero">
    <UContainer class="py-14 sm:py-20 relative z-10">
      <p v-if="kicker" class="monotag text-[var(--color-sable-light)] mb-3">{{ kicker }}</p>
      <h1 class="text-3xl sm:text-5xl font-semibold tracking-tight text-white max-w-3xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-4 text-lg text-white/80 max-w-2xl">{{ subtitle }}</p>
      <slot />
    </UContainer>
  </section>
</template>
