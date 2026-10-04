<script setup lang="ts">
import { readSingleton, updateSingleton } from '@directus/sdk'
import type { FieldDef, Row } from '~/types/resource'

const { client } = useDirectusAuth()
const { toast } = useStudio()

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

const form = reactive<Row>({})
const refOptions = reactive<Record<string, { value: unknown, label: string }[]>>({})
const saving = ref(false)

onMounted(async () => {
  try {
    const s = await client.value.request(readSingleton('site_parameters')) as Row
    Object.assign(form, s)
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
  </div>
</template>
