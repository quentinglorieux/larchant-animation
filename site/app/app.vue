<script setup lang="ts">
import type { SiteParams } from '~/types'

const { data: site } = await useDirectusSingleton<SiteParams>('site_parameters')
useHead({
  title: site.value?.site_title || 'Larchant Animation'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
