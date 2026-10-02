<script setup lang="ts">
import type { Categorie, Evenement } from '~/types'

const { data: evenements } = await useDirectusCollection<Evenement>('evenements', {
  filter: { status: { _eq: 'published' } },
  sort: ['sort', 'title'],
  fields: ['id', 'slug', 'title', 'description', 'image', 'recurrence', { category: ['*'] }]
})

useHead({ title: 'Évènements' })
</script>

<template>
  <div>
    <PageHero kicker="Toute l’année" title="Nos évènements" subtitle="Rendez-vous récurrents de l’association — chaque édition et ses archives." />
    <UContainer class="py-14">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ContentCard
          v-for="ev in evenements"
          :key="ev.id"
          :to="`/evenements/${ev.slug}`"
          :title="ev.title"
          :image="ev.image"
          :description="ev.description || ev.recurrence"
          :category="(ev.category as Categorie)"
        />
      </div>
    </UContainer>
  </div>
</template>
