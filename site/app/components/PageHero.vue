<script setup lang="ts">
defineProps<{ kicker?: string | null, title: string, subtitle?: string | null }>()
</script>

<template>
  <!-- En-tête de page de l'ancien site : bandeau indigo, titre blanc centré -->
  <section class="bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-800)]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center flex flex-col items-center">
      <p v-if="kicker" class="text-sm font-semibold uppercase tracking-wider text-[var(--color-brand-200)] mb-3">{{ kicker }}</p>
      <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-white max-w-4xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-4 text-lg text-[var(--color-brand-100)] max-w-2xl">{{ subtitle }}</p>
      <slot />
    </div>
  </section>
</template>
