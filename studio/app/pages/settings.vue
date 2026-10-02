<script setup lang="ts">
import { readSingleton, updateSingleton } from '@directus/sdk'

const { client } = useDirectusAuth()
const { assetUrl, triggerImageUpload, toast } = useStudio()

const loading = ref(true)
const saving = ref(false)
const site = reactive<Record<string, unknown>>({})
const infos = reactive<Record<string, unknown>>({})

onMounted(async () => {
  try {
    const s = await client.value.request(readSingleton('site_parameters')) as Record<string, unknown>
    const i = await client.value.request(readSingleton('infos_generales')) as Record<string, unknown>
    Object.assign(site, s)
    Object.assign(infos, i)
  } finally { loading.value = false }
})

const save = async () => {
  saving.value = true
  try {
    await client.value.request(updateSingleton('site_parameters', {
      site_title: site.site_title || null,
      hero_title: site.hero_title || null,
      hero_subtitle: site.hero_subtitle || null,
      logo: site.logo || null,
      logo_dark: site.logo_dark || null,
      hero_image: site.hero_image || null,
      facebook_url: site.facebook_url || null,
      instagram_url: site.instagram_url || null,
      youtube_url: site.youtube_url || null
    }))
    await client.value.request(updateSingleton('infos_generales', {
      adresse: infos.adresse || null,
      email: infos.email || null,
      telephone: infos.telephone || null,
      horaires: infos.horaires || null,
      president: infos.president || null,
      adhesion: infos.adhesion || null,
      helloasso_url: infos.helloasso_url || null,
      mentions_legales: infos.mentions_legales || null
    }))
    toast.add({ title: 'Paramètres enregistrés', color: 'success' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Échec de l’enregistrement', color: 'error' })
  } finally { saving.value = false }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Logo et coordonnées</h1>
      <UButton color="primary" :loading="saving" icon="i-lucide-save" @click="save">Enregistrer</UButton>
    </div>

    <div v-if="loading" class="flex justify-center p-16">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <div v-else class="space-y-8">
      <section class="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 class="font-semibold">Identité</h2>
        <div class="flex items-center gap-4">
          <img v-if="site.logo" :src="assetUrl(site.logo as string, { width: 96, height: 96, fit: 'contain' })!" class="h-16 w-16 rounded-full object-contain bg-gray-100">
          <span v-else class="text-3xl">🐋</span>
          <UButton variant="soft" icon="i-lucide-camera" @click="triggerImageUpload((id) => site.logo = id)">Logo (baleine)</UButton>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Titre du site"><UInput v-model="(site.site_title as string)" class="w-full" /></UFormField>
          <UFormField label="Titre du hero"><UInput v-model="(site.hero_title as string)" class="w-full" /></UFormField>
        </div>
        <UFormField label="Sous-titre du hero"><UTextarea v-model="(site.hero_subtitle as string)" :rows="2" class="w-full" /></UFormField>
        <div class="grid sm:grid-cols-3 gap-4">
          <UFormField label="Facebook"><UInput v-model="(site.facebook_url as string)" class="w-full" /></UFormField>
          <UFormField label="Instagram"><UInput v-model="(site.instagram_url as string)" class="w-full" /></UFormField>
          <UFormField label="YouTube"><UInput v-model="(site.youtube_url as string)" class="w-full" /></UFormField>
        </div>
      </section>

      <section class="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 class="font-semibold">Coordonnées & adhésion</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Email"><UInput v-model="(infos.email as string)" class="w-full" /></UFormField>
          <UFormField label="Téléphone"><UInput v-model="(infos.telephone as string)" class="w-full" /></UFormField>
          <UFormField label="Président·e"><UInput v-model="(infos.president as string)" class="w-full" /></UFormField>
          <UFormField label="Lien HelloAsso / adhésion"><UInput v-model="(infos.helloasso_url as string)" class="w-full" /></UFormField>
        </div>
        <UFormField label="Adresse"><UTextarea v-model="(infos.adresse as string)" :rows="2" class="w-full" /></UFormField>
        <UFormField label="Horaires"><UTextarea v-model="(infos.horaires as string)" :rows="2" class="w-full" /></UFormField>
        <UFormField label="Texte d’adhésion (markdown)"><UTextarea v-model="(infos.adhesion as string)" :rows="4" class="w-full font-mono text-sm" /></UFormField>
        <UFormField label="Mentions légales (markdown)"><UTextarea v-model="(infos.mentions_legales as string)" :rows="4" class="w-full font-mono text-sm" /></UFormField>
      </section>
    </div>
  </div>
</template>
