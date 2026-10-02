<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { applyFormat, insertUploadedImage, type FormatKind } from '~/utils/markdownFormat'

const model = defineModel<string | null>({ default: '' })
const props = withDefaults(defineProps<{ rows?: number }>(), { rows: 14 })
const { uploadToDirectus, toast } = useStudio()
const { render } = useMarkdownRender()

const host = ref<HTMLElement>()
const tab = ref<'write' | 'preview'>('write')
const fullscreen = ref(false)
let view: EditorView | null = null

const TOOLS: { kind: FormatKind, icon: string, label: string }[] = [
  { kind: 'h2', icon: 'i-lucide-heading-2', label: 'Titre' },
  { kind: 'h3', icon: 'i-lucide-heading-3', label: 'Sous-titre' },
  { kind: 'bold', icon: 'i-lucide-bold', label: 'Gras' },
  { kind: 'italic', icon: 'i-lucide-italic', label: 'Italique' },
  { kind: 'ul', icon: 'i-lucide-list', label: 'Liste' },
  { kind: 'ol', icon: 'i-lucide-list-ordered', label: 'Liste numérotée' },
  { kind: 'quote', icon: 'i-lucide-quote', label: 'Citation' },
  { kind: 'link', icon: 'i-lucide-link', label: 'Lien' }
]

function format(kind: FormatKind) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const r = applyFormat(view.state.doc.toString(), from, to, kind)
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: r.doc }, selection: { anchor: r.from, head: r.to } })
  view.focus()
}

function insertAtCursor(text: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } })
}

async function uploadFiles(files: FileList | File[]) {
  for (const file of Array.from(files).filter(f => f.type.startsWith('image/'))) {
    await insertUploadedImage(
      () => uploadToDirectus(file),
      md => insertAtCursor(`${md}\n`),
      msg => toast.add({ title: msg, color: 'error' })
    )
  }
}

function pickImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => { if (input.files) uploadFiles(input.files) }
  input.click()
}

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    doc: model.value || '',
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({ '&': { minHeight: `${props.rows * 1.6}em` }, '.cm-scroller': { fontFamily: 'ui-monospace, monospace' } }),
      EditorView.updateListener.of((u) => { if (u.docChanged) model.value = u.state.doc.toString() }),
      EditorView.domEventHandlers({
        paste: (e) => { const f = e.clipboardData?.files; if (f?.length) { e.preventDefault(); uploadFiles(f); return true } return false },
        drop: (e) => { const f = e.dataTransfer?.files; if (f?.length) { e.preventDefault(); uploadFiles(f); return true } return false }
      })
    ]
  })
})

watch(model, (v) => {
  if (view && (v || '') !== view.state.doc.toString()) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v || '' } })
  }
})
onBeforeUnmount(() => view?.destroy())
</script>

<template>
  <div :class="fullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-950 p-4 flex flex-col' : 'rounded-lg border border-gray-200 dark:border-gray-800'">
    <div class="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-800 p-1">
      <UTooltip v-for="t in TOOLS" :key="t.kind" :text="t.label">
        <UButton :icon="t.icon" variant="ghost" color="neutral" size="xs" :aria-label="t.label" @click="format(t.kind)" />
      </UTooltip>
      <UTooltip text="Image">
        <UButton icon="i-lucide-image-plus" variant="ghost" color="neutral" size="xs" aria-label="Image" @click="pickImage" />
      </UTooltip>
      <div class="ml-auto flex gap-1">
        <UButton class="lg:hidden" size="xs" variant="soft" :color="tab === 'write' ? 'primary' : 'neutral'" @click="tab = 'write'">Écrire</UButton>
        <UButton class="lg:hidden" size="xs" variant="soft" :color="tab === 'preview' ? 'primary' : 'neutral'" @click="tab = 'preview'">Aperçu</UButton>
        <UButton :icon="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" variant="ghost" color="neutral" size="xs" aria-label="Plein écran" @click="fullscreen = !fullscreen" />
      </div>
    </div>
    <div class="grid lg:grid-cols-2 flex-1 min-h-0">
      <div ref="host" :class="['min-w-0 overflow-auto', tab === 'preview' ? 'hidden lg:block' : '']" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div :class="['prose-la overflow-auto border-l border-gray-200 dark:border-gray-800 p-4 text-sm', tab === 'write' ? 'hidden lg:block' : '']" v-html="render(model)" />
    </div>
    <p class="px-2 py-1 text-xs text-gray-500">Astuce : collez ou glissez une image directement dans le texte.</p>
  </div>
</template>
