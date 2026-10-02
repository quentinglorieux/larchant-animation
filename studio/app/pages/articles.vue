<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', half: true },
  { key: 'date', label: 'Date', type: 'date', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'featured', label: 'À la une', type: 'boolean', half: true },
  { key: 'preview', label: 'Image', type: 'image', half: true },
  { key: 'description', label: 'Résumé', type: 'textarea' },
  { key: 'content', label: 'Contenu (markdown)', type: 'markdown' }
]
const columns = [
  { key: 'preview', header: '', type: 'image' },
  { key: 'title', header: 'Titre' },
  { key: 'date', header: 'Date', type: 'date' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="articles" title="Articles" singular-label="article"
    :fields="fields" :columns="columns" :default-sort="['-date']" />
</template>
