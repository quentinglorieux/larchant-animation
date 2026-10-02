<script setup lang="ts">
import type { Atelier, Categorie } from '~/types'

const { data: ateliers } = await useDirectusCollection<Atelier>('ateliers', {
  filter: { status: { _eq: 'published' } },
  sort: ['title'],
  fields: ['id', 'slug', 'title', 'description', 'image', 'horaires', { category: ['*'] }]
})
useHead({ title: 'Ateliers' })
</script>

<template>
  <div>
    <PageHero kicker="Saison" title="Ateliers & cours" subtitle="Des activités encadrées chaque semaine, pour tous les âges." />
    <UContainer class="py-14">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ContentCard
          v-for="at in ateliers"
          :key="at.id"
          :to="`/ateliers/${at.slug}`"
          :title="at.title"
          :image="at.image"
          :meta="at.horaires"
          :category="(at.category as Categorie)"
        />
      </div>
    </UContainer>
  </div>
</template>
