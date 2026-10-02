<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'Fin de l’adresse web, générée depuis le titre. À ne pas modifier après publication.' },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'content', label: 'Contenu', type: 'markdown' }
]
const columns = [
  { key: 'title', header: 'Titre' },
  { key: 'slug', header: 'Slug' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="pages" title="Pages" singular-label="page"
    :fields="fields" :columns="columns" :preview-path="(r) => `/${r.slug}`" :default-sort="['title']" />
</template>
