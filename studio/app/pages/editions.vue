<script setup lang="ts">
const route = useRoute()
const evFilter = route.query.evenement ? { evenement: { _eq: Number(route.query.evenement) } } : undefined
const { editionFields, editionColumns, validate, deleteGuard, previewPath, extraFields } = useEditionConfig()
</script>
<template>
  <ResourceManager
    collection="editions" title="Toutes les éditions" singular-label="édition"
    description="Pour préparer une nouvelle édition, passez plutôt par la fiche de l’évènement."
    :fields="editionFields" :columns="editionColumns" :default-sort="['-annee']" :initial-filter="evFilter"
    :validate="validate" :delete-guard="deleteGuard" :preview-path="previewPath" :extra-fields="extraFields"
  />
</template>
