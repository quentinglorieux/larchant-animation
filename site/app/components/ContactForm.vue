<script setup lang="ts">
const { gasFormUrl } = useRuntimeConfig().public
const state = reactive({ email: '', subject: '', message: '', trap: '' })
const sending = ref(false)
const error = ref('')

async function onSubmit() {
  if (state.trap) return
  sending.value = true
  error.value = ''
  const r = await submitGasForm(gasFormUrl as string, { form: 'contact', email: state.email, subject: state.subject, message: state.message })
  sending.value = false
  if (r === 'ok') return navigateTo('/merci')
  error.value = r === 'invalid'
    ? 'L’envoi a échoué, merci de vérifier votre adresse email.'
    : 'Une erreur est survenue, merci de réessayer plus tard.'
}
</script>

<template>
  <form class="space-y-5 max-w-xl" @submit.prevent="onSubmit">
    <input v-model="state.trap" type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
    <UFormField label="Votre email" required>
      <UInput v-model="state.email" type="email" required class="w-full" placeholder="contact@votre-email.fr" />
    </UFormField>
    <UFormField label="Sujet" required>
      <UInput v-model="state.subject" required class="w-full" placeholder="De quoi voulez-vous nous parler ?" />
    </UFormField>
    <UFormField label="Votre message">
      <UTextarea v-model="state.message" :rows="8" class="w-full" placeholder="Laissez-nous un message..." />
    </UFormField>
    <UButton type="submit" :loading="sending">Envoyer</UButton>
    <p v-if="error" class="text-red-600 text-sm" role="alert">{{ error }}</p>
  </form>
</template>
