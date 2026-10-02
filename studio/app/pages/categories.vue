<script setup lang="ts">
const fields = [
  { key: 'name', label: 'Nom', type: 'text', required: true },
  { key: 'slug', label: 'Identifiant', type: 'text', half: true, help: 'Identifiant technique, sans espaces ni accents. À ne pas modifier.' },
  { key: 'type', label: 'Type', type: 'select', half: true, options: [
    { value: 'evenement', label: 'Évènement' }, { value: 'atelier', label: 'Atelier' },
    { value: 'activite', label: 'Activité' }, { value: 'article', label: 'Article' } ] },
  { key: 'couleur', label: 'Couleur', type: 'color', half: true },
  { key: 'couleur_accent', label: 'Couleur accent', type: 'color', half: true },
  { key: 'icon', label: 'Icône (Lucide, ex. i-lucide-bike)', type: 'text' },
]
const columns = [
  { key: 'name', header: 'Nom' },
  { key: 'type', header: 'Type' },
  { key: 'couleur', header: 'Couleur' }
]
</script>
<template>
  <ResourceManager collection="categories" title="Catégories" singular-label="catégorie"
    :fields="fields" :columns="columns" :default-sort="['name']" />
</template>
