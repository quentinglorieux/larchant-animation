<script setup lang="ts">
import type { Article, Edition, Evenement } from '~/types'

const route = useRoute()
const slug = route.params.slug as string
const annee = Number(route.params.annee)
const { getUrl } = useDirectusFile()

const { data: list } = await useDirectusCollection<Edition & { evenement: Evenement }>('editions', {
  filter: { status: { _eq: 'published' }, evenement: { slug: { _eq: slug } }, annee: { _eq: Number.isInteger(annee) ? annee : -1 } },
  limit: 1,
  fields: ['*', { evenement: ['slug', 'title', 'lieu_defaut'] }, { articles_lies: [{ articles_id: ['slug', 'title', 'date', 'status'] }] }]
})
const edition = computed(() => list.value?.[0] || null)
if (!edition.value) throw createError({ statusCode: 404, statusMessage: 'Édition introuvable' })

const { data: siblings } = await useDirectusCollection<Edition>('editions', {
  filter: { status: { _eq: 'published' }, evenement: { slug: { _eq: slug } } },
  fields: ['id', 'annee', 'edition_label', 'date_start', 'date_end'],
  sort: ['annee']
})
const nav = computed(() => edition.value ? adjacentEditions(siblings.value || [], edition.value) : { prev: null, next: null })
const archived = computed(() => !!edition.value && isFinished(edition.value))
const articles = computed(() => (edition.value?.articles_lies || [])
  .map(a => a.articles_id as Article & { status: string })
  .filter(a => a?.status === 'published'))

const afficheUrl = computed(() => getUrl(edition.value?.affiche, { width: '900' }))
useHead({ title: () => `${edition.value?.evenement?.title} · ${edition.value?.edition_label}` })
</script>

<template>
  <div v-if="edition">
    <PageHero :kicker="edition.evenement?.title" :title="edition.edition_label">
      <NuxtLink :to="`/evenements/${edition.evenement?.slug}`" class="mt-3 inline-flex items-center gap-1 text-white/70 hover:text-white">
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Retour à l’évènement
      </NuxtLink>
    </PageHero>

    <UContainer class="py-12 max-w-3xl space-y-6">
      <div v-if="archived" class="rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-4 py-3 text-sm">
        <UIcon name="i-lucide-archive" class="size-4 inline -mt-0.5" /> Archive : {{ edition.edition_label }} de {{ edition.evenement?.title }}.
      </div>

      <div class="flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-2)]">
        <span><UIcon name="i-lucide-calendar" class="size-4 inline -mt-0.5" /> {{ edition.date_start ? formatDate(edition.date_start) : 'Date non précisée' }}</span>
        <span v-if="edition.lieu || edition.evenement?.lieu_defaut"><UIcon name="i-lucide-map-pin" class="size-4 inline -mt-0.5" /> {{ edition.lieu || edition.evenement?.lieu_defaut }}</span>
        <span v-if="edition.annule" class="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Annulé</span>
      </div>

      <img v-if="afficheUrl" :src="afficheUrl" :alt="edition.edition_label" class="w-full max-w-lg rounded-xl">

      <MarkdownBody :text="edition.content" />

      <section v-if="edition.resultats">
        <h2 class="text-xl font-semibold mb-2">Bilan / résultats</h2>
        <MarkdownBody :text="edition.resultats" />
      </section>

      <section v-if="articles.length">
        <h2 class="text-xl font-semibold mb-2">Articles de cette édition</h2>
        <ul class="space-y-1">
          <li v-for="a in articles" :key="a.slug">
            <NuxtLink :to="`/blog/${a.slug}`" class="text-[var(--color-forest-600)] hover:underline">{{ a.title }}</NuxtLink>
            <span class="text-xs text-[var(--color-ink-3)]"> · {{ formatDate(a.date) }}</span>
          </li>
        </ul>
      </section>

      <nav class="flex justify-between border-t border-[var(--color-rule)] pt-6 text-sm">
        <NuxtLink v-if="nav.prev" :to="`/evenements/${slug}/${nav.prev.annee}`">← {{ nav.prev.edition_label }}</NuxtLink><span v-else />
        <NuxtLink v-if="nav.next" :to="`/evenements/${slug}/${nav.next.annee}`">{{ nav.next.edition_label }} →</NuxtLink>
      </nav>
    </UContainer>
  </div>
</template>
