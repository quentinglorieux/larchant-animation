<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'lieu_defaut', label: 'Lieu habituel', type: 'text', half: true },
  { key: 'recurrence', label: 'Récurrence', type: 'text' },
  { key: 'description', label: 'Description (markdown)', type: 'markdown' },
  { key: 'image', label: 'Image générique', type: 'image', half: true },
  { key: 'reglement', label: 'Règlement (PDF)', type: 'file', half: true },
  { key: 'featured', label: 'À la une', type: 'boolean', half: true }
]
const columns = [
  { key: 'image', header: '', type: 'image' },
  { key: 'title', header: 'Titre' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <div>
    <ResourceManager
      collection="evenements" title="Évènements" singular-label="évènement"
      description="Cliquez sur un évènement pour modifier sa présentation et gérer ses éditions."
      :fields="fields" :columns="columns" :default-sort="['title']" :row-to="(r) => `/evenements/${r.id}`"
    />
  </div>
</template>
