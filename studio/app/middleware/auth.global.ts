export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return // Auth côté client pour ce dashboard

  const { fetchUser, hasStoredAuth, isAuthenticated, user } = useDirectusAuth()

  if (!hasStoredAuth()) {
    user.value = null
    if (to.path !== '/login') return navigateTo('/login')
    return
  }

  await fetchUser()

  if (!isAuthenticated.value && to.path !== '/login') return navigateTo('/login')
  if (isAuthenticated.value && to.path === '/login') return navigateTo('/')
})
