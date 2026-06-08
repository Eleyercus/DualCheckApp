import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
})

// Agregar el token automáticamente a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el token expira, regresar al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('perfil')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api