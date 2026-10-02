<script setup lang="ts">
import type { Categorie, Edition, Evenement } from '~/types'

const route = useRoute()
const slug = route.params.slug as string
const { getUrl } = useDirectusFile()

const { data: evList } = await useDirectusCollection<Evenement>('evenements', {
  filter: { slug: { _eq: slug }, status: { _eq: 'published' } },
  limit: 1,
  fields: ['*', { category: ['*'] }]
})
const evenement = computed(() => evList.value?.[0] || null)
if (!evenement.value) throw createError({ statusCode: 404, statusMessage: 'Évènement introuvable' })

const { data: editions } = await useDirectusCollection<Edition>('editions', {
  filter: { status: { _eq: 'published' }, evenement: { _eq: evenement.value.id } },
  sort: ['-annee'],
  fields: ['*']
})

const current = computed(() => currentEdition(editions.value || []))
const archive = computed(() => pastEditions(editions.value || [], current.value))

const { data: related } = await useDirectusCollection<{ articles_id: { slug: string, title: string, preview: string | null, date: string | null } }>(
  'articles_evenements',
  {
    filter: { evenements_id: { _eq: evenement.value.id } },
    fields: [{ articles_id: ['slug', 'title', 'preview', 'date', 'status'] }],
    limit: 12
  }
)
const relatedArticles = computed(() =>
  (related.value || []).map(r => r.articles_id).filter(a => a && a.status !== 'archived')
)

const reglementUrl = computed(() => getUrl(evenement.value?.reglement))
const afficheUrl = computed(() => getUrl(current.value?.affiche, { width: '900' }))
const inscriptionPdf = computed(() => getUrl(current.value?.inscription_pdf))

useHead({ title: () => evenement.value?.title || 'Évènement' })
</script>

<template>
  <div v-if="evenement">
    <PageHero :kicker="(evenement.category as Categorie)?.name || 'Évènement'" :title="evenement.title">
      <p v-if="evenement.recurrence" class="mt-3 text-white/70 flex items-center gap-2">
        <UIcon name="i-lucide-repeat" class="size-4" /> {{ evenement.recurrence }}
      </p>
    </PageHero>

    <UContainer class="py-12 grid gap-10 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-10">
        <!-- Infos générales -->
        <section v-if="evenement.description">
          <h2 class="text-xl font-semibold mb-3">À propos</h2>
          <MarkdownBody :text="evenement.description" />
        </section>

        <!-- Édition en cours -->
        <section v-if="current" class="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="rounded-full bg-[var(--color-forest-600)] px-3 py-1 text-xs font-semibold text-white">
              {{ current.edition_label }}
            </span>
            <span class="text-sm text-[var(--color-ink-2)]">
              <UIcon name="i-lucide-calendar" class="size-4 inline -mt-0.5" />
              {{ current.date_start ? formatDate(current.date_start) : 'Date à venir' }}
            </span>
            <span v-if="current.annule" class="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold">Annulé</span>
          </div>

          <p v-if="!current.annule && isFinished(current)" class="mb-4 rounded-lg bg-[var(--color-paper)] px-4 py-2 text-sm text-[var(--color-ink-2)]">
            {{ current.edition_label }} terminée. La prochaine édition sera bientôt annoncée.
          </p>

          <img v-if="afficheUrl" :src="afficheUrl" :alt="current.edition_label" class="mb-5 w-full max-w-lg rounded-xl">

          <p v-if="current.lieu || evenement.lieu_defaut" class="mb-4 text-[var(--color-ink-2)]">
            <UIcon name="i-lucide-map-pin" class="size-4 inline -mt-0.5" /> {{ current.lieu || evenement.lieu_defaut }}
          </p>

          <MarkdownBody :text="current.content" />

          <div class="mt-5 flex flex-wrap gap-3">
            <UButton v-if="current.inscription_url && !isFinished(current)" :to="current.inscription_url" target="_blank" color="primary" trailing-icon="i-lucide-external-link">
              S’inscrire
            </UButton>
            <UButton v-if="inscriptionPdf && !isFinished(current)" :to="inscriptionPdf" target="_blank" variant="soft" color="neutral" icon="i-lucide-file-text">
              Bulletin d’inscription
            </UButton>
            <UButton v-if="reglementUrl" :to="reglementUrl" target="_blank" variant="soft" color="neutral" icon="i-lucide-file-text">
              Règlement
            </UButton>
          </div>
        </section>

        <!-- Archives -->
        <section v-if="archive.length">
          <h2 class="text-xl font-semibold mb-4">Éditions précédentes</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <NuxtLink
              v-for="ed in archive"
              :key="ed.id"
              :to="`/evenements/${evenement.slug}/${ed.annee}`"
              class="flex items-center gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 transition hover:border-[var(--color-forest-400)]"
            >
              <img
                v-if="getUrl(ed.affiche, { width: '120', height: '120', fit: 'cover' })"
                :src="getUrl(ed.affiche, { width: '120', height: '120', fit: 'cover' })!"
                :alt="ed.edition_label"
                class="size-14 rounded-lg object-cover"
              >
              <div>
                <p class="font-medium text-[var(--color-ink)]">{{ ed.edition_label }}</p>
                <p class="text-xs text-[var(--color-ink-3)]">
                  {{ ed.date_start ? formatDate(ed.date_start) : '' }}
                  <span v-if="ed.annule" class="text-red-600">· Annulé</span>
                </p>
              </div>
            </NuxtLink>
          </div>
        </section>
      </div>

      <!-- Aside : articles liés -->
      <aside v-if="relatedArticles.length" class="space-y-4">
        <h2 class="text-lg font-semibold">Articles liés</h2>
        <NuxtLink
          v-for="a in relatedArticles"
          :key="a.slug"
          :to="`/blog/${a.slug}`"
          class="flex gap-3 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 transition hover:border-[var(--color-forest-400)]"
        >
          <img
            v-if="getUrl(a.preview, { width: '120', height: '120', fit: 'cover' })"
            :src="getUrl(a.preview, { width: '120', height: '120', fit: 'cover' })!"
            :alt="a.title"
            class="size-14 rounded-lg object-cover shrink-0"
          >
          <div>
            <p class="text-sm font-medium text-[var(--color-ink)] line-clamp-2">{{ a.title }}</p>
            <p class="text-xs text-[var(--color-ink-3)]">{{ formatDate(a.date) }}</p>
          </div>
        </NuxtLink>
      </aside>
    </UContainer>
  </div>
</template>
