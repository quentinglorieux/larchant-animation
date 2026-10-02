<script setup lang="ts">
const props = defineProps<{ text?: string | null }>()
const { render } = useMarkdown()
const html = computed(() => render(props.text))
</script>

<template>
  <div class="prose-la max-w-none text-[var(--color-ink-2)]" v-html="html" />
</template>
