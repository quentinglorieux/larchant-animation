<script setup lang="ts">
const fields = [
  { key: 'title', label: 'Titre', type: 'text', required: true },
  { key: 'slug', label: 'Slug', type: 'text', half: true },
  { key: 'status', label: 'Statut', type: 'select', half: true },
  { key: 'date', label: 'Date', type: 'date', half: true },
  { key: 'numero', label: 'Numéro', type: 'number', half: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'fichier', label: 'Document (PDF/image)', type: 'file' }
]
const columns = [
  { key: 'title', header: 'Titre' },
  { key: 'date', header: 'Date', type: 'date' },
  { key: 'status', header: 'Statut', type: 'badge' }
]
</script>
<template>
  <ResourceManager collection="newsletters" title="Newsletters" singular-label="newsletter"
    :fields="fields" :columns="columns" :default-sort="['-date']" />
</template>
