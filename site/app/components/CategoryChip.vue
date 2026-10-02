<script setup lang="ts">
import type { Categorie } from '~/types'

const props = defineProps<{ category?: Categorie | null }>()
const theme = computed(() => categoryTheme(props.category))
</script>

<template>
  <span
    v-if="category"
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
    :style="{ backgroundColor: theme.chipBg, color: theme.chipText }"
  >
    <UIcon v-if="theme.icon" :name="theme.icon" class="size-3.5" />
    {{ category.name }}
  </span>
</template>
