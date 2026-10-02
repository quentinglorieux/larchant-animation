<script setup lang="ts">
import type { Article, Categorie, Evenement } from '~/types'

const route = useRoute()
const { getUrl } = useDirectusFile()

const { data: list } = await useDirectusCollection<Article & { evenements_lies: { evenements_id: Evenement }[] }>('articles', {
  filter: { slug: { _eq: route.params.slug as string }, status: { _eq: 'published' } },
  limit: 1,
  fields: ['*', { category: ['*'] }, { evenements_lies: [{ evenements_id: ['slug', 'title'] }] }]
})
const article = computed(() => list.value?.[0] || null)
if (!article.value) throw createError({ statusCode: 404, statusMessage: 'Article introuvable' })

const img = computed(() => getUrl(article.value?.preview, { width: '1000' }))
const events = computed(() => (article.value?.evenements_lies || []).map(e => e.evenements_id).filter(Boolean))

useHead({ title: () => article.value?.title || 'Article' })
useSeoMeta({
  description: () => seoDescription(article.value?.description || article.value?.content),
  ogImage: () => getUrl(article.value?.preview, { width: '1200' })
})
</script>

<template>
  <div v-if="article">
    <PageHero :kicker="(article.category as Categorie)?.name || formatDate(article.date)" :title="article.title" />
    <UContainer class="py-12 max-w-3xl space-y-6">
      <p v-if="article.date" class="text-sm text-[var(--color-ink-3)]">{{ formatDate(article.date) }}</p>
      <img v-if="img" :src="img" :alt="article.title" class="w-full rounded-xl">
      <MarkdownBody :text="article.content" />

      <div v-if="events.length" class="pt-6 border-t border-[var(--color-rule)]">
        <p class="monotag mb-3">Évènement lié</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="ev in events"
            :key="ev.slug"
            :to="`/evenements/${ev.slug}`"
            variant="soft"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
          >
            {{ ev.title }}
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>
