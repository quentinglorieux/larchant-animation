<script setup lang="ts">
import type { Atelier, Categorie } from '~/types'

const route = useRoute()
const { getUrl } = useDirectusFile()
const { data: list } = await useDirectusCollection<Atelier>('ateliers', {
  filter: { slug: { _eq: route.params.slug as string }, status: { _eq: 'published' } },
  limit: 1,
  fields: ['*', { category: ['*'] }]
})
const atelier = computed(() => list.value?.[0] || null)
if (!atelier.value) throw createError({ statusCode: 404, statusMessage: 'Atelier introuvable' })

const img = computed(() => getUrl(atelier.value?.image, { width: '900' }))
const infos = computed(() => [
  { icon: 'i-lucide-user', label: 'Animateur', value: atelier.value?.animateur },
  { icon: 'i-lucide-clock', label: 'Horaires', value: atelier.value?.horaires },
  { icon: 'i-lucide-map-pin', label: 'Lieu', value: atelier.value?.lieu },
  { icon: 'i-lucide-door-open', label: 'Salle', value: atelier.value?.salle },
  { icon: 'i-lucide-euro', label: 'Tarif', value: atelier.value?.tarif },
  { icon: 'i-lucide-phone', label: 'Contact', value: atelier.value?.contact }
].filter(i => i.value))

useHead({ title: () => atelier.value?.title || 'Atelier' })
</script>

<template>
  <div v-if="atelier">
    <PageHero :kicker="(atelier.category as Categorie)?.name || 'Atelier'" :title="atelier.title" />
    <UContainer class="py-12 grid gap-10 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <img v-if="img" :src="img" :alt="atelier.title" class="w-full max-w-lg rounded-xl">
        <MarkdownBody :text="atelier.description" />
      </div>
      <aside v-if="infos.length" class="space-y-3">
        <div class="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-3">
          <div v-for="i in infos" :key="i.label" class="flex gap-3 text-sm">
            <UIcon :name="i.icon" class="size-5 text-[var(--color-forest-600)] shrink-0" />
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
