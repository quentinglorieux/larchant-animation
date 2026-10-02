<script setup lang="ts">
import type { Article, Categorie } from '~/types'

const { data: articles } = await useDirectusCollection<Article>('articles', {
  filter: { status: { _eq: 'published' } },
  sort: ['-date'],
  limit: -1,
  fields: ['id', 'slug', 'title', 'description', 'preview', 'date', 'featured', { category: ['*'] }]
})
const featured = computed(() => (articles.value || []).filter((a) => a.featured).slice(0, 3))
useHead({ title: 'Actualités' })
</script>

<template>
  <div>
    <PageHero kicker="Le blog" title="Actualités" subtitle="Les nouvelles de l’association et de ses évènements." />
    <UContainer class="py-14 space-y-14">
      <section v-if="featured.length" aria-labelledby="a-la-une">
        <h2 id="a-la-une" class="text-2xl font-semibold mb-6">À la une</h2>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCard
            v-for="a in featured"
            :key="`une-${a.id}`"
            :to="`/blog/${a.slug}`"
            :title="a.title"
            :image="a.preview"
            :meta="formatDate(a.date)"
            :description="a.description"
            :category="(a.category as Categorie)"
          />
        </div>
      </section>
      <section aria-labelledby="toutes-les-actualites">
        <h2 id="toutes-les-actualites" class="text-2xl font-semibold mb-6">Toutes les actualités</h2>
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
      </section>
    </UContainer>
  </div>
</template>
