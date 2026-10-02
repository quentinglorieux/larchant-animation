<script setup lang="ts">
import type { Atelier, Categorie } from '~/types'

const { data: activites } = await useDirectusCollection<Atelier>('activites', {
  filter: { status: { _eq: 'published' } },
  sort: ['title'],
  fields: ['id', 'slug', 'title', 'description', 'image', 'horaires', { category: ['*'] }]
})
useHead({ title: 'Activités' })
</script>

<template>
  <div>
    <PageHero kicker="Toute l’année" title="Activités libres" subtitle="Marche, course, jeux, pétanque… des rendez-vous conviviaux et gratuits." />
    <UContainer class="py-14">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ContentCard
          v-for="ac in activites"
          :key="ac.id"
          :to="`/activites/${ac.slug}`"
          :title="ac.title"
          :image="ac.image"
          :meta="ac.horaires"
          :category="(ac.category as Categorie)"
        />
      </div>
    </UContainer>
  </div>
</template>
