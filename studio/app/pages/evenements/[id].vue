<script setup lang="ts">
import { readItem, readItems, updateItem, deleteItem, aggregate } from '@directus/sdk'
import type { FieldDef, Row } from '~/types/resource'
import { nextEditionDraft, deleteBlockReason, type EditionRow } from '~/utils/editions'

const route = useRoute()
const id = Number(route.params.id)
const { client } = useDirectusAuth()
const { toast } = useStudio()
const siteUrl = useRuntimeConfig().public.siteUrl as string
const { editionFields, editionColumns, validate, deleteGuard, previewPath, extraFields } = useEditionConfig({ withEvenement: false })

const fields: FieldDef[] = [
  { key: 'title', label: 'Nom de l’évènement', type: 'text', required: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'lieu_defaut', label: 'Lieu habituel', type: 'text', half: true },
  { key: 'recurrence', label: 'Quand ?', type: 'text', half: true, help: 'Ex. « chaque 2ᵉ dimanche de mars »' },
  { key: 'description', label: 'Présentation (commune à toutes les éditions)', type: 'markdown' },
  { key: 'image', label: 'Image', type: 'image', half: true },
  { key: 'reglement', label: 'Règlement (PDF)', type: 'file', half: true },
  { key: 'featured', label: 'Mettre en avant sur l’accueil', type: 'boolean', half: true },
  { key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'À ne pas modifier : les liens existants casseraient.' }
]

const form = reactive<Row>({})
const refOptions = reactive<Record<string, { value: unknown, label: string }[]>>({})
const saving = ref(false)
const editionsRm = ref<{ openCreate: (p?: Row) => void, reload: () => Promise<void> } | null>(null)
const lastEdition = ref<EditionRow | null>(null)
const nextYear = computed(() => nextEditionDraft(lastEdition.value, id).annee)

async function loadLast() {
  const [last] = await client.value.request(readItems('editions', { filter: { evenement: { _eq: id } }, sort: ['-annee'], limit: 1, fields: ['*'] })) as EditionRow[]
  lastEdition.value = last ?? null
}

onMounted(async () => {
  try {
  const ev = await client.value.request(readItem('evenements', id, { fields: fields.map(f => f.key) })) as Row
  Object.assign(form, ev, { category: (ev.category as Row | null)?.id ?? ev.category })
  const cats = await client.value.request(readItems('categories', { fields: ['id', 'name'], sort: ['name'], limit: -1 })) as { id: number, name: string }[]
  refOptions.category = cats.map(c => ({ value: c.id, label: c.name }))
  await loadLast()
  } catch {
    toast.add({ title: 'Évènement introuvable', color: 'error' })
    await navigateTo('/evenements')
  }
})

async function save() {
  if (!String(form.title || '').trim()) return toast.add({ title: 'Le nom est requis', color: 'warning' })
  saving.value = true
  try {
    await client.value.request(updateItem('evenements', id, Object.fromEntries(fields.map(f => [f.key, form[f.key] === '' ? null : form[f.key] ?? null]))))
    toast.add({ title: form.status === 'published' ? 'Enregistré : c’est en ligne' : 'Enregistré en brouillon', color: 'success' })
  } catch {
    toast.add({ title: 'Échec de l’enregistrement', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function prepareNext() {
  await loadLast()
  editionsRm.value?.openCreate(nextEditionDraft(lastEdition.value, id))
}

async function removeEvent() {
  try {
    const [res] = await client.value.request(aggregate('editions', { aggregate: { count: '*' }, query: { filter: { evenement: { _eq: id } } } })) as { count: number | string }[]
    const block = deleteBlockReason('evenements', form, { editionsCount: Number(res?.count ?? 0) })
    if (block) return toast.add({ title: 'Suppression impossible', description: block, color: 'warning' })
    if (!confirm(`Supprimer définitivement « ${form.title} » ? Cette action est irréversible.`)) return
    await client.value.request(deleteItem('evenements', id))
    navigateTo('/evenements')
  } catch {
    toast.add({ title: 'Suppression impossible', description: 'Vous n’avez pas le droit de supprimer cet évènement, ou une erreur est survenue.', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-10">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UButton to="/evenements" variant="ghost" color="neutral" icon="i-lucide-arrow-left">Évènements</UButton>
      <div class="flex gap-2">
        <UButton v-if="form.status === 'published'" :to="`${siteUrl}/evenements/${form.slug}`" target="_blank" variant="soft" icon="i-lucide-external-link">Voir sur le site</UButton>
        <UButton variant="ghost" color="error" icon="i-lucide-trash-2" @click="removeEvent">Supprimer</UButton>
        <UButton :loading="saving" @click="save">Enregistrer</UButton>
      </div>
    </div>

    <section>
      <h1 class="text-2xl font-bold mb-4">{{ form.title }}</h1>
      <ResourceForm :fields="fields" :form="form" :ref-options="refOptions" />
    </section>

    <section>
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 class="text-xl font-semibold">Éditions</h2>
          <p class="text-sm text-gray-500">L’édition à venir est mise en avant sur le site ; les précédentes restent consultables en archive.</p>
        </div>
        <UButton icon="i-lucide-copy-plus" @click="prepareNext">Préparer l’édition {{ nextYear }}</UButton>
      </div>
      <ResourceManager
        ref="editionsRm" hide-header collection="editions" title="Éditions" singular-label="édition"
        :fields="editionFields" :columns="editionColumns" :default-sort="['-annee']"
        :initial-filter="{ evenement: { _eq: id } }" :validate="validate" :delete-guard="deleteGuard"
        :extra-fields="extraFields" :preview-path="previewPath" @saved="loadLast"
      />
    </section>
  </div>
</template>
