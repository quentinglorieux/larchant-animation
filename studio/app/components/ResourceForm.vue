<script setup lang="ts">
import type { FieldDef, Row } from '~/types/resource'

const props = defineProps<{
  fields: FieldDef[]
  form: Row
  refOptions: Record<string, { value: unknown, label: string }[]>
}>()
// Signale une saisie manuelle de l'adresse : ResourceManager cesse alors de la générer depuis le titre.
const emit = defineEmits<{ slugInput: [] }>()

const { assetUrl, triggerImageUpload, triggerFileUpload } = useStudio()

const STATUS = [
  { value: 'published', label: 'Publié (visible sur le site)' },
  { value: 'draft', label: 'Brouillon (non visible)' },
  { value: 'archived', label: 'Archivé (masqué)' }
]

const selectItems = (f: FieldDef) => {
  if (f.key === 'status') return STATUS
  if (f.type === 'm2o') return props.refOptions[f.key] || []
  return f.options || []
}

// Nom affiché d'une édition : suit l'année tant qu'il est vide ou encore celui généré automatiquement.
const hasEditionLabel = computed(() => props.fields.some(f => f.key === 'edition_label'))
watch(() => props.form.annee, (annee, old) => {
  if (!hasEditionLabel.value || !annee) return
  const label = props.form.edition_label
  if (!label || label === `Édition ${old}`) props.form.edition_label = `Édition ${annee}`
})
</script>

<template>
  <div class="grid grid-cols-2 gap-4 pb-4">
    <UFormField
      v-for="f in fields"
      :key="f.key"
      :label="f.label"
      :required="f.required"
      :help="f.help"
      :class="f.half ? 'col-span-1' : 'col-span-2'"
    >
      <!-- image -->
      <div v-if="f.type === 'image'" class="flex items-center gap-4">
        <img v-if="form[f.key]" :src="assetUrl(form[f.key] as string, { width: 160, height: 100, fit: 'cover' })!" class="h-16 w-24 rounded-lg object-cover">
        <div v-else class="h-16 w-24 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <UIcon name="i-lucide-image" class="w-6 h-6 text-gray-400" />
        </div>
        <UButton variant="soft" icon="i-lucide-camera" @click="triggerImageUpload((id) => form[f.key] = id)">Changer</UButton>
        <UButton v-if="form[f.key]" variant="ghost" color="neutral" icon="i-lucide-x" @click="form[f.key] = null" />
      </div>
      <!-- fichier (PDF) -->
      <div v-else-if="f.type === 'file'" class="flex items-center gap-3">
        <UIcon :name="form[f.key] ? 'i-lucide-file-check' : 'i-lucide-file'" class="w-5 h-5" :class="form[f.key] ? 'text-primary-500' : 'text-gray-400'" />
        <span class="text-xs text-gray-500 truncate max-w-[12rem]">{{ form[f.key] ? 'Fichier joint' : 'Aucun fichier' }}</span>
        <UButton variant="soft" size="xs" icon="i-lucide-upload" @click="triggerFileUpload((id) => form[f.key] = id, { accept: 'application/pdf' })">Téléverser</UButton>
        <UButton v-if="form[f.key]" variant="ghost" color="neutral" size="xs" icon="i-lucide-x" @click="form[f.key] = null" />
      </div>
      <!-- boolean -->
      <USwitch v-else-if="f.type === 'boolean'" v-model="(form[f.key] as boolean)" />
      <!-- markdown -->
      <MarkdownEditor v-else-if="f.type === 'markdown'" v-model="(form[f.key] as string)" />
      <!-- textarea -->
      <UTextarea
        v-else-if="f.type === 'textarea'"
        v-model="(form[f.key] as string)"
        :rows="3"
        :placeholder="f.placeholder"
        class="w-full text-sm"
      />
      <!-- m2m : plusieurs choix -->
      <USelectMenu
        v-else-if="f.type === 'm2m'"
        v-model="(form[f.key] as unknown[])"
        :items="refOptions[f.key] || []"
        value-key="value"
        multiple
        placeholder="Aucun"
        class="w-full"
      />
      <!-- select / m2o / status -->
      <USelectMenu
        v-else-if="f.type === 'select' || f.type === 'm2o' || f.key === 'status'"
        v-model="form[f.key]"
        :items="selectItems(f)"
        value-key="value"
        placeholder="Choisir…"
        class="w-full"
      />
      <!-- date -->
      <UInput v-else-if="f.type === 'date'" v-model="(form[f.key] as string)" type="date" class="w-full" />
      <!-- number -->
      <UInput v-else-if="f.type === 'number'" v-model.number="form[f.key]" type="number" class="w-full" />
      <!-- color -->
      <div v-else-if="f.type === 'color'" class="flex items-center gap-2">
        <input type="color" :value="(form[f.key] as string) || '#4F7A4A'" class="h-9 w-12 rounded border border-gray-300" @input="form[f.key] = ($event.target as HTMLInputElement).value">
        <UInput v-model="(form[f.key] as string)" placeholder="#RRGGBB" class="w-32" />
      </div>
      <!-- text -->
      <UInput
        v-else
        v-model="(form[f.key] as string)"
        :placeholder="f.placeholder"
        class="w-full"
        @input="f.key === 'slug' ? emit('slugInput') : null"
      />
    </UFormField>
  </div>
</template>
