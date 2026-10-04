<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Adresse de la page', type: 'text', half: true, help: 'Fin de l’adresse web, générée depuis le titre. À ne pas modifier après publication.' },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'actif', label: 'Actif', type: 'boolean', half: true },
  { key: 'animateur', label: 'Animateur', type: 'text', half: true },
  { key: 'horaires', label: 'Horaires', type: 'text', half: true },
  { key: 'lieu', label: 'Lieu', type: 'text', half: true },
  { key: 'contact', label: 'Contact', type: 'text', half: true },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'picto', label: 'Pictogramme (SVG)', type: 'image', help: 'Petit dessin affiché dans le menu et sur l’accueil.' },
  { key: 'description', label: 'Description', type: 'markdown' }
]
const columns = [
  { key: 'image', header: '', type: 'image' },
  { key: 'title', header: 'Titre' },
  { key: 'horaires', header: 'Horaires' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="activites" title="Activités" singular-label="activité"
    :fields="fields" :columns="columns" :preview-path="(r) => `/activites/${r.slug}`" :default-sort="['title']" />
</template>
