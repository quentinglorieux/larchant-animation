<script setup lang="ts">
import type { Article, Categorie } from '~/types'

const { data: articles } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' } },
  sort: ['-date'],
  fields: ['id', 'slug', 'title', 'description', 'preview', 'date', { category: ['*'] }]
})
useHead({ title: 'Actualités' })
</script>

<template>
  <div>
    <PageHero kicker="Le blog" title="Actualités" subtitle="Les nouvelles de l’association et de ses évènements." />
    <UContainer class="py-14">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ContentCard
          v-for="a in articles"
          :key="a.id"
          :to="`/blog/${a.slug}`"
          :title="a.title"
          :image="a.preview"
          :meta="formatDate(a.date)"
          :description="a.description"
          :category="(a.category as Categorie)"
        />
      </div>
    </UContainer>
  </div>
</template>
