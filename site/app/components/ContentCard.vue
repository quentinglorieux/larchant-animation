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
    class="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] transition hover:border-[var(--color-forest-400)] hover:shadow-lg hover:-translate-y-0.5"
  >
    <div class="aspect-[3/2] overflow-hidden bg-[var(--color-bone)] relative">
      <img v-if="img" :src="img" :alt="title" class="size-full object-cover transition group-hover:scale-105">
      <div v-else class="size-full flex items-center justify-center text-4xl opacity-40">🐋</div>
      <span v-if="badge" class="absolute top-3 left-3 rounded-full bg-[var(--color-sable)] px-2.5 py-0.5 text-xs font-semibold text-white">
        {{ badge }}
      </span>
    </div>
    <div class="flex flex-col gap-2 p-4">
      <div class="flex items-center gap-2">
        <CategoryChip v-if="category" :category="category" />
        <span v-if="meta" class="text-xs text-[var(--color-ink-3)]">{{ meta }}</span>
      </div>
      <h3 class="font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-forest-600)]">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm text-[var(--color-ink-3)] line-clamp-2">{{ description }}</p>
    </div>
  </NuxtLink>
</template>
