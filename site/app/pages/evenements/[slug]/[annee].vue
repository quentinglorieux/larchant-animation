<script setup lang="ts">
import type { Edition, Evenement } from '~/types'

const route = useRoute()
const slug = route.params.slug as string
const annee = route.params.annee as string
const { getUrl } = useDirectusFile()

const { data: list } = await useDirectusCollection<Edition & { evenement: Evenement }>('editions', {
  filter: {
    status: { _eq: 'published' },
    evenement: { slug: { _eq: slug } },
    _or: [{ annee: { _eq: Number(annee) || -1 } }, { id: { _eq: Number(annee) || -1 } }]
  },
  limit: 1,
  fields: ['*', { evenement: ['slug', 'title', 'lieu_defaut'] }]
})
const edition = computed(() => list.value?.[0] || null)
if (!edition.value) throw createError({ statusCode: 404, statusMessage: 'Édition introuvable' })

const afficheUrl = computed(() => getUrl(edition.value?.affiche, { width: '900' }))
useHead({ title: () => `${edition.value?.evenement?.title} — ${edition.value?.edition_label}` })
</script>

<template>
  <div v-if="edition">
    <PageHero :kicker="edition.evenement?.title" :title="edition.edition_label">
      <NuxtLink :to="`/evenements/${edition.evenement?.slug}`" class="mt-3 inline-flex items-center gap-1 text-white/70 hover:text-white">
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Retour à l’évènement
      </NuxtLink>
    </PageHero>

    <UContainer class="py-12 max-w-3xl space-y-6">
      <div class="flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-2)]">
        <span v-if="edition.date_start"><UIcon name="i-lucide-calendar" class="size-4 inline -mt-0.5" /> {{ formatDate(edition.date_start) }}</span>
        <span v-if="edition.lieu || edition.evenement?.lieu_defaut"><UIcon name="i-lucide-map-pin" class="size-4 inline -mt-0.5" /> {{ edition.lieu || edition.evenement?.lieu_defaut }}</span>
        <span v-if="edition.annule" class="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Annulé</span>
      </div>

      <img v-if="afficheUrl" :src="afficheUrl" :alt="edition.edition_label" class="w-full max-w-lg rounded-xl">

      <MarkdownBody :text="edition.content" />

      <section v-if="edition.resultats">
        <h2 class="text-xl font-semibold mb-2">Résultats</h2>
        <MarkdownBody :text="edition.resultats" />
      </section>
    </UContainer>
  </div>
</template>
