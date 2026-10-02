<script setup lang="ts">
import type { InfosGenerales, PageDoc } from '~/types'

const route = useRoute()
const slug = route.params.slug as string
const { getUrl } = useDirectusFile()

const { data: list } = await useDirectusCollection<PageDoc>('pages', {
  filter: { slug: { _eq: slug }, status: { _eq: 'published' } },
  limit: 1,
  fields: ['*']
})
const page = computed(() => list.value?.[0] || null)
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })

const { data: infos } = await useDirectusSingleton<InfosGenerales>('infos_generales')
const showContact = computed(() => slug === 'contact')
const showAdhesion = computed(() => slug === 'adherez')
const img = computed(() => getUrl(page.value?.image, { width: '1000' }))

useHead({ title: () => page.value?.title || 'Page' })
</script>

<template>
  <div v-if="page">
    <PageHero :title="page.title" />
    <UContainer class="py-12 grid gap-10 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <img v-if="img" :src="img" :alt="page.title" class="w-full max-w-lg rounded-xl">
        <MarkdownBody :text="page.content" />
        <MarkdownBody v-if="showAdhesion && infos?.adhesion" :text="infos.adhesion" />
        <UButton
          v-if="showAdhesion && infos?.helloasso_url"
          :to="infos.helloasso_url"
          target="_blank"
          size="lg"
          color="primary"
          trailing-icon="i-lucide-external-link"
        >
          Adhérer en ligne
        </UButton>
      </div>

      <aside v-if="(showContact || showAdhesion) && infos" class="space-y-3">
        <div class="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 space-y-3 text-sm">
          <p class="monotag">Nous contacter</p>
          <p v-if="infos.adresse" class="whitespace-pre-line text-[var(--color-ink-2)]">{{ infos.adresse }}</p>
          <p v-if="infos.email"><a :href="`mailto:${infos.email}`" class="text-[var(--color-forest-600)] hover:underline">{{ infos.email }}</a></p>
          <p v-if="infos.telephone" class="text-[var(--color-ink-2)]">{{ infos.telephone }}</p>
          <p v-if="infos.horaires" class="whitespace-pre-line text-[var(--color-ink-3)]">{{ infos.horaires }}</p>
        </div>
      </aside>
    </UContainer>
  </div>
</template>
