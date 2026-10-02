<script setup lang="ts">
import type { Atelier, Categorie } from '~/types'

const route = useRoute()
const { getUrl } = useDirectusFile()
const { data: list } = await useDirectusCollection<Atelier>('activites', {
  filter: { slug: { _eq: route.params.slug as string }, status: { _eq: 'published' } },
  limit: 1,
  fields: ['*', { category: ['*'] }]
})
const item = computed(() => list.value?.[0] || null)
if (!item.value) throw createError({ statusCode: 404, statusMessage: 'Activité introuvable' })

const img = computed(() => getUrl(item.value?.image, { width: '900' }))
const infos = computed(() => [
  { icon: 'i-lucide-user', label: 'Animateur', value: item.value?.animateur },
  { icon: 'i-lucide-clock', label: 'Horaires', value: item.value?.horaires },
  { icon: 'i-lucide-map-pin', label: 'Lieu', value: item.value?.lieu },
  { icon: 'i-lucide-phone', label: 'Contact', value: item.value?.contact }
].filter(i => i.value))

useHead({ title: () => item.value?.title || 'Activité' })
useSeoMeta({
  description: () => seoDescription(item.value?.description),
  ogImage: () => getUrl(item.value?.image, { width: '1200' })
})
</script>

<template>
  <div v-if="item">
    <PageHero :kicker="(item.category as Categorie)?.name || 'Activité'" :title="item.title" />
    <UContainer class="py-12 grid gap-10 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <img v-if="img" :src="img" :alt="item.title" class="w-full max-w-lg rounded-xl">
        <MarkdownBody :text="item.description" />
      </div>
      <aside v-if="infos.length" class="space-y-3">
        <div class="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-3">
          <div v-for="i in infos" :key="i.label" class="flex gap-3 text-sm">
            <UIcon :name="i.icon" class="size-5 text-[var(--color-brand-600)] shrink-0" />
            <div>
              <p class="monotag">{{ i.label }}</p>
              <p class="text-[var(--color-ink)]">{{ i.value }}</p>
            </div>
          </div>
        </div>
      </aside>
    </UContainer>
  </div>
</template>
