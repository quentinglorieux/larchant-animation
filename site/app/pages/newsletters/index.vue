<script setup lang="ts">
import type { Newsletter } from '~/types'

const { getUrl } = useDirectusFile()
const { data: newsletters } = await useDirectusCollection<Newsletter>('newsletters', {
  filter: { status: { _eq: 'published' } },
  sort: ['-date'],
  fields: ['*']
})
useHead({ title: 'Newsletters' })
</script>

<template>
  <div>
    <PageHero kicker="Archives" title="Newsletters" subtitle="Retrouvez toutes les lettres d’information de l’association." />
    <UContainer class="py-14">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a
          v-for="n in newsletters"
          :key="n.id"
          :href="getUrl(n.fichier) || '#'"
          target="_blank"
          class="flex items-center gap-4 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 transition hover:border-[var(--color-forest-400)]"
        >
          <div class="flex size-12 items-center justify-center rounded-lg bg-[var(--color-bone)] text-[var(--color-forest-600)]">
            <UIcon name="i-lucide-mail" class="size-6" />
          </div>
          <div>
            <p class="font-medium text-[var(--color-ink)]">{{ n.title }}</p>
            <p class="text-xs text-[var(--color-ink-3)]">{{ formatMonth(n.date) }}</p>
          </div>
        </a>
      </div>
    </UContainer>
  </div>
</template>
