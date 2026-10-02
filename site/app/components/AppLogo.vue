<script setup lang="ts">
import type { SiteParams } from '~/types'

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters', { fields: ['logo', 'logo_dark', 'site_title'] })
const { getUrl } = useDirectusFile()
const logoUrl = computed(() => getUrl(site.value?.logo, { width: '80', height: '80', fit: 'contain' }))
</script>

<template>
  <NuxtLink to="/" class="flex items-center text-gray-100 transition duration-1000 ease-in-out group">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt=""
      width="36"
      height="36"
      class="transition-opacity h-9 w-9 object-contain group-hover:opacity-50 group-focus:opacity-70"
    >
    <span class="mt-1 ml-3 text-lg sm:text-xl font-black tracking-tight text-gray-100 uppercase transition-colors group-hover:text-gray-400/60">
      {{ site?.site_title || 'Larchant Animation' }}
    </span>
  </NuxtLink>
</template>
