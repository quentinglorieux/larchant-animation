<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'content', label: 'Contenu (markdown)', type: 'markdown' }
]
const columns = [
  { key: 'title', header: 'Titre' },
  { key: 'slug', header: 'Slug' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="pages" title="Pages" singular-label="page"
    :fields="fields" :columns="columns" :default-sort="['title']" />
</template>
