<script setup lang="ts">
import { readSingleton, updateSingleton, readItems, updateItem } from '@directus/sdk'
import type { FieldDef, Row } from '~/types/resource'

const { client } = useDirectusAuth()
const { toast, assetUrl } = useStudio()

const fields: FieldDef[] = [
  { key: 'bandeau_texte', label: 'Bouton mis en avant', type: 'text', half: true, help: 'Ex. « Inscriptions aux ateliers 2026-2027 ». Laisser vide pour le masquer.' },
  { key: 'bandeau_lien', label: 'Lien du bouton', type: 'text', half: true, help: 'Ex. /inscriptions' },
  { key: 'devise', label: 'Devise (au-dessus du titre)', type: 'text' },
  { key: 'hero_subtitle', label: 'Phrase d’accueil', type: 'textarea' },
  { key: 'asso_titre', label: 'Titre de la présentation', type: 'text', half: true },
  { key: 'asso_image', label: 'Photo de la présentation', type: 'image', half: true },
  { key: 'asso_texte', label: 'Présentation de l’association', type: 'markdown' },
  { key: 'ateliers_texte', label: 'Introduction des ateliers', type: 'markdown' },
  { key: 'newsletter_texte', label: 'Texte de la liste de diffusion', type: 'markdown' }
]
const slideFields: FieldDef[] = [
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'title', label: 'Titre', type: 'text' },
  { key: 'lien', label: 'Lien', type: 'text', help: 'Optionnel, ex. /evenements/hivernale' }
]
const slideColumns = [
  { key: 'image', header: '', type: 'image' as const },
  { key: 'title', header: 'Titre' }
]

const form = reactive<Row>({})
const refOptions = reactive<Record<string, { value: unknown, label: string }[]>>({})
const saving = ref(false)
const slides = ref<Row[]>([])
const rm = ref()

const loadSlides = async () => {
  slides.value = await client.value.request(readItems('accueil_slides', { sort: ['sort'], fields: ['id', 'title', 'image', 'lien', 'sort'] })) as Row[]
}

onMounted(async () => {
  try {
    const s = await client.value.request(readSingleton('site_parameters')) as Row
    Object.assign(form, s)
    await loadSlides()
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Chargement impossible', color: 'error' })
  }
})

async function save() {
  saving.value = true
  try {
    await client.value.request(updateSingleton('site_parameters', Object.fromEntries(fields.map(f => [f.key, form[f.key] || null]))))
    toast.add({ title: 'Enregistré : c’est en ligne', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Échec de l’enregistrement', color: 'error' })
  } finally { saving.value = false }
}

async function move(i: number, dir: -1 | 1) {
  const a = slides.value[i]!, b = slides.value[i + dir]
  if (!b) return
  try {
    let sa = Number(a.sort) || 0, sb = Number(b.sort) || 0
    // Deux slides au même rang : on les sépare pour que l'échange ait un effet.
    if (sa === sb) { sa = i + 1; sb = i + dir + 1 }
    await client.value.request(updateItem('accueil_slides', a.id as number, { sort: sb }))
    await client.value.request(updateItem('accueil_slides', b.id as number, { sort: sa }))
    await loadSlides()
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Déplacement impossible', color: 'error' })
  }
}

const validateSlide = async (p: Row, id: number | null) => {
  if (!p.image) return 'Choisissez une image.'
  if (id === null) p.sort = Math.max(0, ...slides.value.map(s => Number(s.sort) || 0)) + 1
  return null
}
</script>

<template>
  <div class="space-y-10">
    <section>
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Accueil du site</h1>
        <UButton :loading="saving" @click="save">Enregistrer</UButton>
      </div>
      <ResourceForm :fields="fields" :form="form" :ref-options="refOptions" />
    </section>

    <section>
      <h2 class="text-xl font-semibold">Carrousel de la page d’accueil</h2>
      <p class="text-sm text-gray-500 mb-3">Les images défilent dans cet ordre. Utilisez les flèches pour les déplacer.</p>
      <p v-if="!slides.length" class="text-sm text-gray-500 mb-3">Aucune image pour le moment.</p>
      <ul v-else class="mb-4 divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <li v-for="(s, i) in slides" :key="String(s.id)" class="flex items-center gap-3 px-4 py-2">
          <img v-if="s.image" :src="assetUrl(s.image as string, { width: 120, height: 72, fit: 'cover' }) || ''" alt="" class="h-12 w-20 rounded object-cover">
          <span class="flex-1 truncate">{{ s.title || 'Sans titre' }}</span>
          <UButton icon="i-lucide-arrow-up" variant="ghost" color="neutral" aria-label="Monter" :disabled="i === 0" @click="move(i, -1)" />
          <UButton icon="i-lucide-arrow-down" variant="ghost" color="neutral" aria-label="Descendre" :disabled="i === slides.length - 1" @click="move(i, 1)" />
          <UButton variant="soft" @click="rm?.openEdit(s)">Modifier</UButton>
        </li>
      </ul>
      <ResourceManager
        ref="rm" hide-header hide-table collection="accueil_slides" title="Carrousel" singular-label="image"
        :fields="slideFields" :columns="slideColumns" :default-sort="['sort']"
        :validate="validateSlide" @saved="loadSlides"
      />
    </section>
  </div>
</template>
