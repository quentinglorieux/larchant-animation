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
  <!-- Ancien cta.html -->
  <section class="relative pb-16 mt-6">
    <div class="max-w-md mx-auto px-7 sm:max-w-3xl lg:max-w-7xl">
      <div class="relative px-6 py-10 overflow-hidden shadow-xl bg-[var(--color-brand-500)] rounded-2xl sm:px-12 sm:py-20">
        <div aria-hidden="true" class="absolute inset-0 -mt-72 sm:-mt-32 md:mt-0">
          <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1463 360">
            <path class="text-[var(--color-brand-600)] opacity-40" fill="currentColor" d="M-82.673 72l1761.849 472.086-134.327 501.315-1761.85-472.086z" />
            <path class="text-[var(--color-brand-600)] opacity-40" fill="currentColor" d="M-217.088 544.086L1544.761 72l134.327 501.316-1761.849 472.086z" />
          </svg>
        </div>
        <div class="relative">
          <div class="sm:text-center">
            <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Inscrivez-vous à notre liste de diffusion
            </h2>
            <MarkdownBody v-if="intro" :text="intro" class="max-w-2xl mx-auto mt-6 text-lg text-[var(--color-brand-100)]!" />
          </div>
          <form class="mt-12 sm:mx-auto sm:flex sm:max-w-lg" @submit.prevent="onSubmit">
            <input v-model="trap" type="text" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="flex-1 min-w-0">
              <label for="newsletter-email" class="sr-only">Adresse email</label>
              <input
                id="newsletter-email"
                v-model="email"
                type="email"
                required
                placeholder="Entrez votre email"
                class="block w-full px-5 py-3 text-base text-gray-900 bg-white placeholder-gray-500 border border-transparent rounded-md shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--color-brand-500)]"
              >
            </div>
            <div class="mt-4 sm:mt-0 sm:ml-3">
              <button
                type="submit"
                :disabled="sending"
                class="block w-full px-5 py-3 text-base font-medium text-white bg-gray-900 border border-transparent rounded-md shadow hover:bg-black focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--color-brand-500)] disabled:opacity-70 sm:px-10"
              >
                {{ sending ? 'Envoi…' : 'Inscrivez-moi !' }}
              </button>
            </div>
          </form>
          <p v-if="message" role="status" class="mt-6 text-lg font-medium text-white sm:text-center">{{ message }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
