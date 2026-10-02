<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk'

interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'markdown' | 'date' | 'number' | 'boolean' | 'select' | 'color' | 'image' | 'file' | 'm2o'
  half?: boolean
  required?: boolean
  options?: { value: string, label: string }[]
  refCollection?: string
  refLabelKey?: string
  placeholder?: string
}
interface ColumnDef { key: string, header: string, type?: 'image' | 'badge' | 'date' | 'boolean' | 'text' }

const props = defineProps<{
  collection: string
  title: string
  description?: string
  singularLabel: string
  fields: FieldDef[]
  columns: ColumnDef[]
  defaultSort?: string[]
  initialFilter?: Record<string, unknown>
}>()

const { client, toast, assetUrl, slugify, triggerImageUpload, triggerFileUpload } = useStudio()

const STATUS = [
  { value: 'published', label: 'Publié' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'archived', label: 'Archivé' }
]
const STATUS_COLOR: Record<string, string> = { published: 'success', draft: 'warning', archived: 'neutral' }

const loading = ref(true)
const saving = ref(false)
const rows = ref<Record<string, unknown>[]>([])
const search = ref('')
const slideoverOpen = ref(false)
const editing = ref<Record<string, unknown> | null>(null)
const isCreating = computed(() => !editing.value)

// Options des relations M2O et listes select dynamiques
const refOptions = reactive<Record<string, { value: unknown, label: string }[]>>({})

const hasSlug = computed(() => props.fields.some(f => f.key === 'slug'))
const hasTitle = computed(() => props.fields.some(f => f.key === 'title'))

const blank = () => {
  const o: Record<string, unknown> = {}
  for (const f of props.fields) o[f.key] = f.type === 'boolean' ? false : null
  if (props.fields.some(f => f.key === 'status')) o.status = 'draft'
  return o
}
const form = reactive<Record<string, unknown>>(blank())

let slugTouched = false
watch(() => form.title, (v) => {
  if (hasSlug.value && hasTitle.value && !slugTouched && isCreating.value) form.slug = slugify(String(v || ''))
})

const tableColumns = computed(() => props.columns.map(c => ({
  accessorKey: c.key,
  header: c.header,
  cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
    const v = row.original[c.key]
    if (c.type === 'image') {
      return v
        ? h('img', { src: assetUrl(v as string, { width: 36, height: 36, fit: 'cover' }), class: 'w-9 h-9 rounded object-cover' })
        : h('div', { class: 'w-9 h-9 rounded bg-gray-100 dark:bg-gray-800' })
    }
    if (c.type === 'badge') {
      return h(resolveComponent('UBadge'), { color: STATUS_COLOR[v as string] || 'neutral', variant: 'soft', size: 'sm' }, () => String(v ?? ''))
    }
    if (c.type === 'boolean') return h('span', {}, v ? '✓' : '—')
    if (c.key === 'title') return h('span', { class: 'font-medium' }, String(v ?? ''))
    return h('span', {}, String(v ?? ''))
  }
})))

const selectItems = (f: FieldDef) => {
  if (f.key === 'status') return STATUS
  if (f.type === 'm2o') return refOptions[f.key] || []
  return f.options || []
}

const load = async () => {
  const fields = ['id', ...props.columns.map(c => c.key)]
  rows.value = await client.value.request(readItems(props.collection, {
    fields,
    sort: props.defaultSort || ['-id'],
    filter: props.initialFilter || {},
    limit: -1
  }))
}

const loadRefs = async () => {
  for (const f of props.fields) {
    if (f.type === 'm2o' && f.refCollection) {
      const labelKey = f.refLabelKey || 'title'
      const data = await client.value.request(readItems(f.refCollection, {
        fields: ['id', labelKey], sort: [labelKey], limit: -1
      })) as Record<string, unknown>[]
      refOptions[f.key] = data.map(d => ({ value: d.id, label: String(d[labelKey]) }))
    }
  }
}

const openCreate = () => {
  editing.value = null
  slugTouched = false
  Object.assign(form, blank())
  if (props.initialFilter) Object.assign(form, props.initialFilter && Object.fromEntries(
    Object.entries(props.initialFilter).map(([k, v]) => [k, (v as { _eq?: unknown })?._eq ?? v])
  ))
  slideoverOpen.value = true
}

const openEdit = async (rowOrEvent: unknown) => {
  const orig = (rowOrEvent as { original?: Record<string, unknown> })?.original
    ?? (rowOrEvent as Record<string, unknown>)
  if (!orig?.id) return
  editing.value = orig
  slugTouched = true
  const full = await client.value.request(readItems(props.collection, {
    fields: ['id', ...props.fields.map(f => f.key)],
    filter: { id: { _eq: orig.id } },
    limit: 1
  })) as Record<string, unknown>[]
  const d = full?.[0] || {}
  Object.assign(form, blank())
  for (const f of props.fields) {
    const val = d[f.key]
    // les relations/fichiers peuvent revenir en objet { id }
    form[f.key] = (val && typeof val === 'object' && 'id' in (val as object)) ? (val as { id: unknown }).id : (val ?? form[f.key])
  }
  slideoverOpen.value = true
}

const save = async () => {
  if (hasTitle.value && !String(form.title || '').trim()) {
    toast.add({ title: 'Le titre est requis', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const payload: Record<string, unknown> = {}
    for (const f of props.fields) {
      let v = form[f.key]
      if (f.type === 'number') v = (v === '' || v == null) ? null : Number(v)
      if (f.type === 'boolean') v = !!v
      if ((f.type === 'text' || f.type === 'textarea' || f.type === 'markdown' || f.type === 'date' || f.type === 'select' || f.type === 'color') && v === '') v = null
      payload[f.key] = v ?? null
    }
    if (hasSlug.value && !payload.slug && hasTitle.value) payload.slug = slugify(String(form.title))
    if (isCreating.value) await client.value.request(createItem(props.collection, payload))
    else await client.value.request(updateItem(props.collection, editing.value!.id as number, payload))
    toast.add({ title: isCreating.value ? `${props.singularLabel} créé(e)` : 'Modifications enregistrées', color: 'success' })
    slideoverOpen.value = false
    await load()
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Échec de l’enregistrement', color: 'error' })
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!editing.value) return
  if (!confirm(`Supprimer « ${form.title || props.singularLabel} » ?`)) return
  saving.value = true
  try {
    await client.value.request(deleteItem(props.collection, editing.value.id as number))
    toast.add({ title: 'Supprimé', color: 'success' })
    slideoverOpen.value = false
    await load()
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Échec de la suppression', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try { await Promise.all([load(), loadRefs()]) } finally { loading.value = false }
})

defineExpose({ openCreate, reload: load })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p v-if="description" class="text-gray-500 text-sm mt-1">{{ description }}</p>
      </div>
      <UButton icon="i-lucide-plus" @click="openCreate">Ajouter</UButton>
    </div>

    <div v-if="loading" class="flex justify-center p-16">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>
    <template v-else>
      <UInput v-model="search" icon="i-lucide-search" placeholder="Filtrer…" class="mb-3 max-w-sm" />
      <UTable
        :data="rows"
        :columns="tableColumns"
        :global-filter="search"
        :empty="`Aucun élément.`"
        class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/80 shadow-sm cursor-pointer text-sm"
        @select="openEdit"
      />
    </template>

    <USlideover
      v-model:open="slideoverOpen"
      :title="isCreating ? `Nouveau · ${singularLabel}` : String(form.title || singularLabel)"
      :ui="{ content: 'w-full sm:w-[44rem] max-w-none' }"
    >
      <span />
      <template #body>
        <div class="grid grid-cols-2 gap-4 pb-4">
          <UFormField
            v-for="f in fields"
            :key="f.key"
            :label="f.label"
            :required="f.required"
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
            <!-- markdown / textarea -->
            <UTextarea
              v-else-if="f.type === 'markdown' || f.type === 'textarea'"
              v-model="(form[f.key] as string)"
              :rows="f.type === 'markdown' ? 10 : 3"
              :placeholder="f.placeholder"
              class="w-full font-mono text-sm"
            />
            <!-- select / m2o / status -->
            <USelectMenu
              v-else-if="f.type === 'select' || f.type === 'm2o' || f.key === 'status'"
              v-model="form[f.key]"
              :items="selectItems(f)"
              value-key="value"
              placeholder="—"
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
              @input="f.key === 'slug' ? (slugTouched = true) : null"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton v-if="!isCreating" variant="ghost" color="error" icon="i-lucide-trash-2" :loading="saving" @click="remove">Supprimer</UButton>
          <div class="flex gap-2 ml-auto">
            <UButton variant="ghost" color="neutral" @click="slideoverOpen = false">Annuler</UButton>
            <UButton color="primary" :loading="saving" @click="save">Enregistrer</UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
