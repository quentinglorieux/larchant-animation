<script setup lang="ts">
const route = useRoute()
const evFilter = route.query.evenement ? { evenement: { _eq: Number(route.query.evenement) } } : undefined
const fields = [
  { key: 'evenement', label: 'Évènement', type: 'm2o', refCollection: 'evenements', refLabelKey: 'title', required: true, half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'edition_label', label: 'Libellé', type: 'text', half: true },
  { key: 'annee', label: 'Année', type: 'number', half: true },
  { key: 'date_start', label: 'Date début', type: 'date', half: true },
  { key: 'date_end', label: 'Date fin', type: 'date', half: true },
  { key: 'lieu', label: 'Lieu (override)', type: 'text', half: true },
  { key: 'annule', label: 'Annulée', type: 'boolean', half: true },
  { key: 'affiche', label: 'Affiche', type: 'image', half: true },
  { key: 'inscription_pdf', label: 'Bulletin (PDF)', type: 'file', half: true },
  { key: 'inscription_url', label: 'Lien d’inscription', type: 'text' },
  { key: 'content', label: 'Programme (markdown)', type: 'markdown' },
  { key: 'resultats', label: 'Résultats (markdown)', type: 'markdown' },
  { key: 'sort', label: 'Ordre', type: 'number', half: true }
]
const columns = [
  { key: 'affiche', header: '', type: 'image' },
  { key: 'edition_label', header: 'Édition' },
  { key: 'annee', header: 'Année' },
  { key: 'date_start', header: 'Date', type: 'date' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager
    collection="editions" title="Éditions" singular-label="édition"
    description="Une édition par année, rattachée à un évènement."
    :fields="fields" :columns="columns" :default-sort="['sort', '-annee']" :initial-filter="evFilter"
  />
</template>
