<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'category', label: 'Catégorie', type: 'm2o', refCollection: 'categories', refLabelKey: 'name', half: true },
  { key: 'actif', label: 'Actif', type: 'boolean', half: true },
  { key: 'animateur', label: 'Animateur', type: 'text', half: true },
  { key: 'horaires', label: 'Horaires', type: 'text', half: true },
  { key: 'lieu', label: 'Lieu', type: 'text', half: true },
  { key: 'salle', label: 'Salle', type: 'text', half: true },
  { key: 'tarif', label: 'Tarif', type: 'text', half: true },
  { key: 'contact', label: 'Contact', type: 'text', half: true },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'description', label: 'Description (markdown)', type: 'markdown' }
]
const columns = [
  { key: 'image', header: '', type: 'image' },
  { key: 'title', header: 'Titre' },
  { key: 'horaires', header: 'Horaires' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="ateliers" title="Ateliers" singular-label="atelier"
    :fields="fields" :columns="columns" :default-sort="['title']" />
</template>
