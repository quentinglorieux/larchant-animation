<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'Fin de l’adresse web, générée depuis le titre. À ne pas modifier après publication.' },
  { key: 'date', label: 'Date', type: 'date', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'featured', label: 'À la une', type: 'boolean', half: true, help: 'L’article apparaît en plus dans le bloc « À la une » de l’accueil et de la page Actualités (les 3 plus récents).' },
  { key: 'preview', label: 'Image', type: 'image', half: true },
  { key: 'description', label: 'Résumé', type: 'textarea' },
  { key: 'content', label: 'Contenu', type: 'markdown' }
]
const columns = [
  { key: 'preview', header: '', type: 'image' },
  { key: 'title', header: 'Titre' },
  { key: 'date', header: 'Date', type: 'date' },
  { key: 'featured', header: 'À la une', type: 'boolean' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="articles" title="Articles" singular-label="article"
    :fields="fields" :columns="columns" :preview-path="(r) => `/blog/${r.slug}`" :default-sort="['-date']" />
</template>
