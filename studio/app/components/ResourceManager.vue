<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk'

import type { FieldDef, ColumnDef, Row } from '~/types/resource'

const props = defineProps<{
  collection: string
  title: string
  description?: string
  singularLabel: string
  fields: FieldDef[]
  columns: ColumnDef[]
  defaultSort?: string[]
  initialFilter?: Record<string, unknown>
  previewPath?: (row: Row) => string | null
  validate?: (payload: Row, id: number | null) => Promise<string | null>
  deleteGuard?: (row: Row) => Promise<string | null>
  rowTo?: (row: Row) => string
  hideHeader?: boolean
  extraFields?: string[]
}>()
const emit = defineEmits<{ saved: [] }>()

const { client, toast, assetUrl, slugify } = useStudio()
const siteUrl = useRuntimeConfig().public.siteUrl as string

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
    if (c.type === 'state') {
      const st = c.state?.(row.original)
      return st ? h(resolveComponent('UBadge'), { color: st.color, variant: 'soft', size: 'sm' }, () => st.label) : null
    }
    if (c.type === 'image') {
      return v
        ? h('img', { src: assetUrl(v as string, { width: 36, height: 36, fit: 'cover' }), class: 'w-9 h-9 rounded object-cover' })
        : h('div', { class: 'w-9 h-9 rounded bg-gray-100 dark:bg-gray-800' })
    }
    if (c.type === 'badge') {
      return h(resolveComponent('UBadge'), { color: STATUS_COLOR[v as string] || 'neutral', variant: 'soft', size: 'sm' }, () => String(v ?? ''))
    }
    if (c.type === 'boolean') return h('span', {}, v ? '✓' : '')
    // relation lue avec ses sous-champs (ex. evenement : { id, slug, title })
    if (v && typeof v === 'object') return h('span', {}, String((v as Row).title ?? (v as Row).name ?? ''))
    if (c.key === 'title') return h('span', { class: 'font-medium' }, String(v ?? ''))
    return h('span', {}, String(v ?? ''))
  }
})))

const load = async () => {
  const fields = ['id', ...props.columns.map(c => c.key).filter(k => k !== 'etat'), ...(props.extraFields || [])]
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

const openCreate = (prefill?: Row) => {
  editing.value = null
  slugTouched = false
  Object.assign(form, blank())
  if (props.initialFilter) Object.assign(form, props.initialFilter && Object.fromEntries(
    Object.entries(props.initialFilter).map(([k, v]) => [k, (v as { _eq?: unknown })?._eq ?? v])
  ))
  if (prefill) Object.assign(form, prefill)
  slideoverOpen.value = true
}

const openEdit = async (rowOrEvent: unknown) => {
  const orig = (rowOrEvent as { original?: Record<string, unknown> })?.original
    ?? (rowOrEvent as Record<string, unknown>)
  if (!orig?.id) return
  editing.value = orig
  slugTouched = true
  const full = await client.value.request(readItems(props.collection, {
    fields: ['id', ...props.fields.map(f => f.key), ...(props.extraFields || [])],
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
  // sous-champs utiles à l'aperçu, ex. evenement.slug devient form.evenement_slug
  for (const k of props.extraFields || []) {
    const [a, b] = k.split('.')
    if (a && b) form[`${a}_${b}`] = (d[a] as Row | undefined)?.[b]
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
    // Clés fixées par initialFilter (ex. evenement sur la fiche évènement) : absentes des champs, mais requises à la création.
    if (isCreating.value && props.initialFilter) for (const k of Object.keys(props.initialFilter)) if (!(k in payload)) payload[k] = form[k] ?? null
    if (hasSlug.value && !payload.slug && hasTitle.value) payload.slug = slugify(String(form.title))
    const problem = await props.validate?.(payload, isCreating.value ? null : editing.value!.id as number)
    if (problem) { toast.add({ title: problem, color: 'warning' }); return }
    if (isCreating.value) await client.value.request(createItem(props.collection, payload))
    else await client.value.request(updateItem(props.collection, editing.value!.id as number, payload))
    const savedTitle = !('status' in payload) ? 'Enregistré'
      : payload.status === 'published' ? 'Enregistré : c’est en ligne' : 'Enregistré en brouillon'
    toast.add({ title: savedTitle, color: 'success' })
    slideoverOpen.value = false
    emit('saved')
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
  const block = await props.deleteGuard?.({ ...form, id: editing.value.id })
  if (block) { toast.add({ title: 'Suppression impossible', description: block, color: 'warning' }); return }
  if (!confirm(`Supprimer définitivement « ${form.title || form.edition_label || props.singularLabel} » ? Cette action est irréversible.`)) return
  saving.value = true
  try {
    await client.value.request(deleteItem(props.collection, editing.value.id as number))
    toast.add({ title: 'Supprimé', color: 'success' })
    slideoverOpen.value = false
    emit('saved')
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

defineExpose({ openCreate, openEdit, reload: load })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between gap-4">
      <div v-if="!hideHeader">
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p v-if="description" class="text-gray-500 text-sm mt-1">{{ description }}</p>
      </div>
      <UButton icon="i-lucide-plus" class="ml-auto" @click="openCreate()">Ajouter</UButton>
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
        @select="(_e: Event, r: { original: Row }) => props.rowTo ? navigateTo(props.rowTo(r.original)) : openEdit(r)"
      />
    </template>

    <USlideover
      v-model:open="slideoverOpen"
      :title="isCreating ? `Nouveau · ${singularLabel}` : String(form.title || form.edition_label || singularLabel)"
      :ui="{ content: 'w-full sm:w-[44rem] max-w-none' }"
    >
      <span />
      <template #body>
        <ResourceForm :fields="fields" :form="form" :ref-options="refOptions" @slug-input="slugTouched = true" />
      </template>
      <template #footer>
        <div class="flex justify-between w-full">
          <UButton v-if="!isCreating" variant="ghost" color="error" icon="i-lucide-trash-2" :loading="saving" @click="remove">Supprimer</UButton>
          <div class="flex gap-2 ml-auto">
            <UButton v-if="!isCreating && previewPath && form.status === 'published' && previewPath(form)" :to="siteUrl + previewPath(form)" target="_blank" variant="soft" icon="i-lucide-external-link">Voir sur le site</UButton>
            <UButton variant="ghost" color="neutral" @click="slideoverOpen = false">Annuler</UButton>
            <UButton color="primary" :loading="saving" @click="save">Enregistrer</UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
