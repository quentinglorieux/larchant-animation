<script setup lang="ts">
import type { Slide } from '~/types'
const props = defineProps<{ slides: Slide[] }>()
const { getUrl } = useDirectusFile()
const items = computed(() => props.slides.filter(s => s.image))
</script>

<template>
  <UCarousel v-if="items.length" v-slot="{ item }" :items="items" loop :autoplay="{ delay: 5000 }" arrows dots class="rounded-2xl overflow-hidden">
    <component :is="item.lien ? resolveComponent('NuxtLink') : 'div'" :to="item.lien || undefined" class="block relative">
      <img :src="getUrl(item.image, { width: '1400', height: '600', fit: 'cover' })!" :alt="item.title || ''" class="w-full aspect-[7/3] object-cover">
      <span v-if="item.title" class="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-1 text-white text-sm">{{ item.title }}</span>
    </component>
  </UCarousel>
</template>
