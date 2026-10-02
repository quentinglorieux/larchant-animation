<script setup lang="ts">
import { readUsers, createUser, updateUser, readRoles } from '@directus/sdk'

const { client, canManageUsers, checkAdmin } = useDirectusAuth()
const { toast } = useStudio()
if (canManageUsers.value === null) await checkAdmin()
if (canManageUsers.value !== true) await navigateTo('/')

const roleId = ref<string | null>(null)
const users = ref<Record<string, any>[]>([])
const revealed = ref<{ email: string, password: string } | null>(null)
const draft = reactive({ first_name: '', last_name: '', email: '' })
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const genPassword = () => Array.from(crypto.getRandomValues(new Uint32Array(16)), n => ALPHABET[n % ALPHABET.length]).join('')

async function load() {
  const [role] = await client.value.request(readRoles({ filter: { name: { _eq: 'Éditeur' } }, fields: ['id'] })) as { id: string }[]
  roleId.value = role?.id ?? null
  users.value = roleId.value ? await client.value.request(readUsers({ filter: { role: { _eq: roleId.value } }, fields: ['id', 'first_name', 'last_name', 'email', 'status', 'last_access'] })) as Record<string, any>[] : []
}
async function addEditor() {
  if (!draft.email.trim()) return toast.add({ title: 'L’adresse email est requise', color: 'warning' })
  if (!roleId.value) return toast.add({ title: 'Rôle Éditeur introuvable : lancez les permissions (migration) avant de créer des comptes.', color: 'error' })
  const password = genPassword()
  try {
    await client.value.request(createUser({ ...draft, password, role: roleId.value }))
    revealed.value = { email: draft.email, password }
    Object.assign(draft, { first_name: '', last_name: '', email: '' })
    await load()
  } catch { toast.add({ title: 'Création impossible (email déjà utilisé ?)', color: 'error' }) }
}
async function resetPassword(u: Record<string, any>) {
  const password = genPassword()
  try {
    await client.value.request(updateUser(u.id, { password }))
    revealed.value = { email: u.email, password }
  } catch { toast.add({ title: 'Changement impossible', color: 'error' }) }
}
async function toggle(u: Record<string, any>) {
  const next = u.status === 'active' ? 'suspended' : 'active'
  if (next === 'suspended' && !confirm(`Désactiver le compte de ${u.email} ?`)) return
  try {
    await client.value.request(updateUser(u.id, { status: next }))
    await load()
  } catch { toast.add({ title: 'Modification impossible', color: 'error' }) }
}
async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); toast.add({ title: 'Copié', color: 'success' }) }
  catch { toast.add({ title: 'Copie impossible, sélectionnez le mot de passe à la main', color: 'warning' }) }
}
const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Jamais'
onMounted(load)
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold">Comptes</h1>
      <p class="text-sm text-gray-500 mt-1">Les éditeurs peuvent modifier le contenu du site, mais pas gérer les comptes.</p>
    </div>

    <div v-if="revealed" class="rounded-xl border border-primary-300 bg-primary-50 dark:bg-primary-950 p-4 flex flex-wrap items-center justify-between gap-3">
      <p>Mot de passe de {{ revealed.email }} : <code class="font-mono font-bold select-all">{{ revealed.password }}</code> (à transmettre, il ne sera plus affiché)</p>
      <div class="flex gap-2">
        <UButton icon="i-lucide-copy" variant="soft" @click="copy(revealed.password)">Copier</UButton>
        <UButton variant="ghost" color="neutral" @click="revealed = null">Fermer</UButton>
      </div>
    </div>

    <section>
      <h2 class="text-lg font-semibold mb-3">Ajouter un éditeur</h2>
      <form class="grid gap-3 sm:grid-cols-4 items-end" @submit.prevent="addEditor">
        <UFormField label="Prénom"><UInput v-model="draft.first_name" class="w-full" /></UFormField>
        <UFormField label="Nom"><UInput v-model="draft.last_name" class="w-full" /></UFormField>
        <UFormField label="Email"><UInput v-model="draft.email" type="email" class="w-full" /></UFormField>
        <UButton type="submit" icon="i-lucide-user-plus">Ajouter</UButton>
      </form>
    </section>

    <section>
      <h2 class="text-lg font-semibold mb-3">Éditeurs</h2>
      <p v-if="!users.length" class="text-sm text-gray-500">Aucun éditeur pour le moment.</p>
      <div v-else class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <table class="w-full text-sm">
          <thead class="text-left text-gray-500">
            <tr><th class="px-4 py-2">Nom</th><th class="px-4 py-2">Email</th><th class="px-4 py-2">Dernière connexion</th><th class="px-4 py-2">Statut</th><th class="px-4 py-2" /></tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr v-for="u in users" :key="u.id">
              <td class="px-4 py-2">{{ u.first_name }} {{ u.last_name }}</td>
              <td class="px-4 py-2">{{ u.email }}</td>
              <td class="px-4 py-2">{{ fmt(u.last_access) }}</td>
              <td class="px-4 py-2"><UBadge :color="u.status === 'active' ? 'success' : 'neutral'" variant="soft">{{ u.status === 'active' ? 'Actif' : 'Désactivé' }}</UBadge></td>
              <td class="px-4 py-2 flex gap-2 justify-end">
                <UButton size="sm" variant="soft" @click="resetPassword(u)">Nouveau mot de passe</UButton>
                <UButton size="sm" variant="ghost" :color="u.status === 'active' ? 'error' : 'neutral'" @click="toggle(u)">{{ u.status === 'active' ? 'Désactiver' : 'Réactiver' }}</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
