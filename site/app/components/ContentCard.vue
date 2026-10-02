<script setup lang="ts">
import type { Categorie } from '~/types'

const props = defineProps<{
  to: string
  title: string
  image?: string | null
  meta?: string | null
  description?: string | null
  category?: Categorie | null
  badge?: string | null
}>()

const { getUrl } = useDirectusFile()
const img = computed(() => getUrl(props.image, { width: '640', height: '420', fit: 'cover' }))
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex flex-col overflow-hidden rounded-lg shadow-lg bg-gray-50 dark:bg-gray-900 transition hover:shadow-xl"
  >
    <div class="aspect-[3/2] overflow-hidden bg-[var(--color-bone)] relative">
      <img v-if="img" :src="img" :alt="title" class="size-full object-cover transition group-hover:scale-105">
      <div v-else class="size-full flex items-center justify-center text-4xl opacity-40">🐋</div>
      <span v-if="badge" class="absolute top-3 left-3 rounded-md bg-[var(--color-accent-500)] px-2.5 py-0.5 text-xs font-semibold text-white">
        {{ badge }}
      </span>
    </div>
    <div class="flex flex-col gap-2 p-5">
      <div class="flex items-center gap-2">
        <CategoryChip v-if="category" :category="category" />
        <span v-if="meta" class="text-xs text-[var(--color-ink-3)]">{{ meta }}</span>
      </div>
      <h3 class="text-xl font-black text-gray-900 dark:text-gray-200 group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] group-hover:underline">
        {{ title }}
      </h3>
      <p v-if="description" class="text-base text-gray-900 dark:text-gray-300 line-clamp-3">{{ description }}</p>
    </div>
  </NuxtLink>
</template>
