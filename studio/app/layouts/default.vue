<script setup>
const { logout, user, canManageUsers } = useDirectusAuth()
const colorMode = useColorMode()
const mobileNavOpen = ref(false)

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const items = computed(() => [
  [{ label: 'Tableau de bord', icon: 'i-lucide-layout-dashboard', to: '/' }],
  [
    { label: 'Contenu', type: 'label' },
    { label: 'Accueil du site', icon: 'i-lucide-house', to: '/accueil' },
    { label: 'Évènements', icon: 'i-lucide-party-popper', to: '/evenements' },
    { label: 'Articles', icon: 'i-lucide-newspaper', to: '/articles' },
    { label: 'Ateliers', icon: 'i-lucide-school', to: '/ateliers' },
    { label: 'Activités', icon: 'i-lucide-bike', to: '/activites' },
    { label: 'Newsletters', icon: 'i-lucide-mail', to: '/newsletters' },
    { label: 'Pages', icon: 'i-lucide-file-text', to: '/pages' }
  ],
  [
    { label: 'Réglages', type: 'label' },
    { label: 'Catégories', icon: 'i-lucide-tag', to: '/categories' },
    { label: 'Logo et coordonnées', icon: 'i-lucide-sliders-horizontal', to: '/settings' },
    ...(canManageUsers.value === true ? [{ label: 'Comptes', icon: 'i-lucide-users', to: '/comptes' }] : [])
  ]
])
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-col hidden sm:flex shrink-0">
      <div class="h-16 flex items-center gap-2 px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <span class="text-2xl">🐋</span>
        <h1 class="text-lg font-bold">Studio Larchant</h1>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-1">
        <UNavigationMenu :items="items" orientation="vertical" />
      </div>
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-3">
        <div class="flex items-center gap-3">
          <UAvatar :alt="user?.first_name" icon="i-lucide-user" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ user?.first_name }} {{ user?.last_name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ user?.email }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <UButton :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" variant="ghost" color="neutral" @click="toggleColorMode" />
          <UButton label="Déconnexion" icon="i-lucide-log-out" variant="soft" color="error" class="flex-1 justify-center" @click="logout" />
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="sm:hidden h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-4 shrink-0">
        <h1 class="text-lg font-bold">🐋 Studio Larchant</h1>
        <UButton icon="i-lucide-menu" variant="ghost" color="neutral" @click="mobileNavOpen = true" />
      </header>
      <main class="flex-1 overflow-y-auto p-6 md:p-10">
        <div class="max-w-5xl mx-auto">
          <slot />
        </div>
      </main>
    </div>

    <USlideover v-model:open="mobileNavOpen" side="left" title="Studio Larchant">
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" @select="mobileNavOpen = false" />
      </template>
    </USlideover>
  </div>
</template>
