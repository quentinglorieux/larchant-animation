import { createDirectus, rest, authentication, readMe } from '@directus/sdk'

let singletonClient = null
const AUTH_STORAGE_KEY = 'larchant-studio-auth'

const normalizeStoredAuth = (value) => {
  if (!value || typeof value !== 'object') return null
  if (!value.access_token && !value.refresh_token) return null
  return value
}

const clearStoredAuth = () => {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(AUTH_STORAGE_KEY) } catch { /* ignore */ }
}

const hasStoredAuth = () => {
  if (typeof window === 'undefined') return false
  try {
    const val = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return !!(val && normalizeStoredAuth(JSON.parse(val)))
  } catch { return false }
}

const createDirectusClient = (directusUrl) => {
  const defaultStorage = typeof window !== 'undefined'
    ? {
        get: () => {
          try {
            const val = window.localStorage.getItem(AUTH_STORAGE_KEY)
            return val ? normalizeStoredAuth(JSON.parse(val)) : null
          } catch { return null }
        },
        set: (value) => {
          const normalizedValue = normalizeStoredAuth(value)
          if (normalizedValue) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedValue))
          else clearStoredAuth()
        }
      }
    : undefined

  return createDirectus(directusUrl)
    .with(authentication('json', { storage: defaultStorage }))
    .with(rest())
}

export const useDirectusAuth = () => {
  // Proxy Nuxt local pour éviter les soucis de CORS.
  const directusUrl = typeof window !== 'undefined'
    ? window.location.origin + '/api/directus'
    : 'http://localhost:13011/api/directus'

  if (!singletonClient) singletonClient = createDirectusClient(directusUrl)

  const client = ref(singletonClient)
  const resetClient = () => {
    singletonClient = createDirectusClient(directusUrl)
    client.value = singletonClient
  }

  const user = useState('directus-user', () => null)
  const isAuthenticated = computed(() => !!user.value)

  const login = async (email, password) => {
    try {
      await client.value.login({ email, password })
      await fetchUser()
      return true
    } catch (e) {
      console.error('Login failed', e)
      clearStoredAuth(); user.value = null; resetClient()
      return false
    }
  }

  const logout = async () => {
    try { await client.value.logout() } catch (e) { console.error(e) }
    clearStoredAuth(); user.value = null; resetClient()
    if (typeof window !== 'undefined') { window.location.replace('/login'); return }
    navigateTo('/login')
  }

  const fetchUser = async () => {
    try {
      user.value = await client.value.request(readMe({ fields: ['id', 'first_name', 'last_name', 'email', 'avatar'] }))
    } catch (e) {
      console.error('fetchUser failed', e)
      clearStoredAuth(); user.value = null; resetClient()
    }
  }

  return { client, user, isAuthenticated, hasStoredAuth, login, logout, fetchUser }
}
