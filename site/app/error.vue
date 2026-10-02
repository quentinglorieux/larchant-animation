<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error.statusCode === 404)
useHead({ title: is404.value ? 'Page introuvable' : 'Erreur' })
</script>

<template>
  <NuxtLayout>
    <UContainer class="py-24 text-center space-y-4">
      <p class="text-6xl font-bold text-[var(--color-forest-600)]">{{ error.statusCode }}</p>
      <h1 class="text-2xl font-semibold">{{ is404 ? 'Cette page n’existe pas (ou plus).' : 'Une erreur est survenue.' }}</h1>
      <UButton @click="clearError({ redirect: '/' })">Retour à l’accueil</UButton>
    </UContainer>
  </NuxtLayout>
</template>
