<script setup lang="ts">
defineProps<{ intro?: string | null }>()
const { gasFormUrl } = useRuntimeConfig().public
const email = ref('')
const trap = ref('')
const sending = ref(false)
const message = ref('')

const MESSAGES = {
  ok: 'Merci, vous êtes bien inscrit !',
  invalid: 'Adresse invalide, merci de vérifier votre email.',
  error: 'Une erreur est survenue, merci de réessayer plus tard.'
} as const

async function onSubmit() {
  if (trap.value) return
  sending.value = true
  const r = await submitGasForm(gasFormUrl as string, { email: email.value })
  sending.value = false
  message.value = MESSAGES[r]
  if (r === 'ok') email.value = ''
}
</script>

<template>
  <section class="rounded-2xl bg-[var(--color-forest-600)] text-white p-8 text-center space-y-4">
    <h2 class="text-2xl font-semibold">Inscrivez-vous à notre liste de diffusion</h2>
    <MarkdownBody v-if="intro" :text="intro" class="text-white/80" />
    <form class="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row" @submit.prevent="onSubmit">
      <input v-model="trap" type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
      <UInput v-model="email" type="email" required placeholder="Entrez votre email" aria-label="Adresse email" class="flex-1" />
      <UButton type="submit" color="neutral" :loading="sending">Inscrivez-moi !</UButton>
    </form>
    <p v-if="message" role="status">{{ message }}</p>
  </section>
</template>
