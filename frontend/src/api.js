import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('nexusops_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally - redirect to login (except when already on login/register or auth requests)
api.interceptors.response.use(
  response => response,
  error => {
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register')
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
    if (error.response?.status === 401 && !isAuthEndpoint && !isAuthPage) {
      localStorage.removeItem('nexusops_token')
      localStorage.removeItem('nexusops_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

