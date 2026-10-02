<script setup lang="ts">
import type { SiteParams } from '~/types'

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters', { fields: ['logo', 'logo_dark', 'site_title'] })
const { getUrl } = useDirectusFile()
const logoUrl = computed(() => getUrl(site.value?.logo, { width: '160', height: '160', fit: 'contain' }))
</script>

<template>
  <NuxtLink to="/" class="flex items-center gap-3 group">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt="Larchant Animation"
      class="h-10 w-10 rounded-full object-contain bg-[var(--color-bone)] ring-1 ring-[var(--color-rule)]"
    >
    <span v-else class="text-2xl">🐋</span>
    <span class="font-[var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-ink)]">
      {{ site?.site_title || 'Larchant Animation' }}
    </span>
  </NuxtLink>
</template>
