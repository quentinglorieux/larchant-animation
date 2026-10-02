<script setup>
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const { login } = useDirectusAuth()

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  const success = await login(email.value, password.value)
  loading.value = false
  if (success) navigateTo('/')
  else error.value = 'Email ou mot de passe invalide.'
}

definePageMeta({ layout: 'auth' })
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <div class="text-3xl mb-1">🐋</div>
          <h2 class="text-2xl font-bold">Studio · Larchant Animation</h2>
          <p class="mt-2 text-sm text-gray-500">Connectez-vous avec votre compte Directus</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <UFormField label="Email" name="email">
          <UInput v-model="email" type="email" placeholder="vous@larchantanimation.fr" icon="i-lucide-mail" class="w-full" required autofocus />
        </UFormField>
        <UFormField label="Mot de passe" name="password">
          <UInput v-model="password" type="password" placeholder="••••••••" icon="i-lucide-lock" class="w-full" required />
        </UFormField>
        <UAlert v-if="error" color="error" variant="subtle" :title="error" icon="i-lucide-alert-circle" />
        <UButton type="submit" color="primary" class="w-full justify-center" :loading="loading">Se connecter</UButton>
      </form>
    </UCard>
  </div>
</template>
