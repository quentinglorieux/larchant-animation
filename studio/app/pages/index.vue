<script setup lang="ts">
import { aggregate, readItems } from '@directus/sdk'

const { client } = useDirectusAuth()

const cards = [
  { key: 'evenements', label: 'Évènements', to: '/evenements' },
  { key: 'editions', label: 'Éditions', to: '/editions' },
  { key: 'articles', label: 'Articles', to: '/articles' },
  { key: 'ateliers', label: 'Ateliers', to: '/ateliers' },
  { key: 'activites', label: 'Activités', to: '/activites' },
  { key: 'newsletters', label: 'Newsletters', to: '/newsletters' },
  { key: 'pages', label: 'Pages', to: '/pages' },
  { key: 'categories', label: 'Catégories', to: '/categories' }
]

const today = new Date().toISOString().slice(0, 10)
const upcoming = ref<Record<string, any>[]>([])
const drafts = ref<{ kind: string, label: string, to: string }[]>([])
const latest = ref<Record<string, any>[]>([])
const counts = ref<Record<string, number>>({})

const shortcuts = [
  { label: 'Nouvel article', icon: 'i-lucide-plus', to: '/articles?nouveau=1' },
  { label: 'Évènements', icon: 'i-lucide-party-popper', to: '/evenements' },
  { label: 'Accueil du site', icon: 'i-lucide-house', to: '/accueil' },
  { label: 'Toutes les éditions', icon: 'i-lucide-calendar-days', to: '/editions' }
]
const fmt = (d?: string | null) => d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
const statusLabel = (s: string) => s === 'published' ? 'Publié' : s === 'draft' ? 'Brouillon' : 'Archivé'

onMounted(async () => {
  try {
    upcoming.value = await client.value.request(readItems('editions', { filter: { date_start: { _gte: today } }, sort: ['date_start'], limit: 5, fields: ['id', 'annee', 'date_start', 'status', 'evenement.id', 'evenement.title'] })) as Record<string, any>[]
    const dEd = await client.value.request(readItems('editions', { filter: { status: { _eq: 'draft' } }, limit: 5, fields: ['annee', 'evenement.id', 'evenement.title'] })) as Record<string, any>[]
    const dAr = await client.value.request(readItems('articles', { filter: { status: { _eq: 'draft' } }, limit: 5, sort: ['-date'], fields: ['id', 'title'] })) as Record<string, any>[]
    drafts.value = [
      ...dEd.map(e => ({ kind: 'Édition', label: `${e.evenement?.title} ${e.annee}`, to: `/evenements/${e.evenement?.id}` })),
      ...dAr.map(a => ({ kind: 'Article', label: a.title, to: '/articles' }))
    ]
    latest.value = await client.value.request(readItems('articles', { sort: ['-date'], limit: 5, fields: ['id', 'title', 'date', 'status'] })) as Record<string, any>[]
  } catch (e) { console.error(e) }
  for (const c of cards) {
    try {
      const res = await client.value.request(aggregate(c.key, { aggregate: { count: '*' } })) as { count: number }[]
      counts.value[c.key] = Number(res?.[0]?.count ?? 0)
    } catch { counts.value[c.key] = 0 }
  }
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold">Tableau de bord</h1>
      <p class="text-gray-500 text-sm mt-1">Gérez le contenu du site Larchant Animation.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton v-for="s in shortcuts" :key="s.to" :to="s.to" :icon="s.icon" :variant="s.icon === 'i-lucide-plus' ? 'solid' : 'soft'">{{ s.label }}</UButton>
    </div>

    <section>
      <h2 class="text-lg font-semibold mb-3">Prochaines éditions</h2>
      <p v-if="!upcoming.length" class="text-sm text-gray-500">Aucune édition datée à venir. Pensez à préparer les prochaines depuis la fiche des évènements.</p>
      <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <li v-for="e in upcoming" :key="e.id">
          <NuxtLink :to="`/evenements/${e.evenement?.id}`" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900">
            <span><span class="text-sm text-gray-500">{{ fmt(e.date_start) }}</span> · <span class="font-medium">{{ e.evenement?.title }} {{ e.annee }}</span></span>
            <UBadge v-if="e.status === 'draft'" color="warning" variant="soft">Brouillon</UBadge>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="grid gap-8 md:grid-cols-2">
      <section>
        <h2 class="text-lg font-semibold mb-3">Brouillons en cours</h2>
        <p v-if="!drafts.length" class="text-sm text-gray-500">Aucun brouillon.</p>
        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <li v-for="(d, i) in drafts" :key="i">
            <NuxtLink :to="d.to" class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900">
              <UBadge color="neutral" variant="subtle">{{ d.kind }}</UBadge>
              <span class="truncate">{{ d.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
      <section>
        <h2 class="text-lg font-semibold mb-3">Derniers articles</h2>
        <ul class="divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <li v-for="a in latest" :key="a.id">
            <NuxtLink to="/articles" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900">
              <span class="truncate"><span class="font-medium">{{ a.title }}</span> <span class="text-sm text-gray-500">{{ fmt(a.date) }}</span></span>
              <UBadge :color="a.status === 'published' ? 'success' : 'warning'" variant="soft">{{ statusLabel(a.status) }}</UBadge>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>

    <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-800">
      <NuxtLink v-for="c in cards" :key="c.key" :to="c.to" class="hover:text-primary-500">{{ c.label }} : {{ counts[c.key] ?? '…' }}</NuxtLink>
    </div>
  </div>
</template>
