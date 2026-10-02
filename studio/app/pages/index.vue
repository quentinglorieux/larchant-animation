<script setup lang="ts">
import { aggregate } from '@directus/sdk'

const { client } = useDirectusAuth()

const cards = [
  { key: 'evenements', label: 'Évènements', icon: 'i-lucide-party-popper', to: '/evenements' },
  { key: 'editions', label: 'Éditions', icon: 'i-lucide-calendar-days', to: '/editions' },
  { key: 'articles', label: 'Articles', icon: 'i-lucide-newspaper', to: '/articles' },
  { key: 'ateliers', label: 'Ateliers', icon: 'i-lucide-school', to: '/ateliers' },
  { key: 'activites', label: 'Activités', icon: 'i-lucide-bike', to: '/activites' },
  { key: 'newsletters', label: 'Newsletters', icon: 'i-lucide-mail', to: '/newsletters' },
  { key: 'pages', label: 'Pages', icon: 'i-lucide-file-text', to: '/pages' },
  { key: 'categories', label: 'Catégories', icon: 'i-lucide-tag', to: '/categories' }
]

const counts = ref<Record<string, number>>({})
onMounted(async () => {
  for (const c of cards) {
    try {
      const res = await client.value.request(aggregate(c.key, { aggregate: { count: '*' } })) as { count: number }[]
      counts.value[c.key] = Number(res?.[0]?.count ?? 0)
    } catch { counts.value[c.key] = 0 }
  }
})
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Tableau de bord</h1>
      <p class="text-gray-500 text-sm mt-1">Gérez le contenu du site Larchant Animation.</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <NuxtLink
        v-for="c in cards"
        :key="c.key"
        :to="c.to"
        class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 transition hover:border-primary-400 hover:shadow"
      >
        <div class="flex items-center justify-between">
          <UIcon :name="c.icon" class="w-6 h-6 text-primary-500" />
          <span class="text-2xl font-bold">{{ counts[c.key] ?? '…' }}</span>
        </div>
        <p class="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{{ c.label }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
