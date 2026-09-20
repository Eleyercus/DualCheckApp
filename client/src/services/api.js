import axios from 'axios'

// En desarrollo usa localhost. En producción, define VITE_API_URL en un
// archivo .env.production (ver .env.example) con la IP real del servidor,
// por ejemplo: VITE_API_URL=http://192.168.1.10:3001/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      const esLoginRoute = error.config.url.includes('/auth/login')
      if (!esLoginRoute) {
        localStorage.removeItem('token')
        localStorage.removeItem('perfil')
        localStorage.removeItem('correo')
        alert('Tu sesión ha expirado. Por favor inicia sesión de nuevo.')
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api