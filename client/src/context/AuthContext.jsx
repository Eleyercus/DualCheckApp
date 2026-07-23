import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import ModalCambioPassword from '../components/ModalCambioPassword'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [requiereCambio, setRequiereCambio] = useState(false)

  const verificarCambio = async (perfil) => {
    if (perfil === 'administrador') return
    try {
      const res = await api.get('/auth/requiere-cambio')
      setRequiereCambio(res.data.requiere_cambio)
    } catch { }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const perfil = localStorage.getItem('perfil')
    const correo = localStorage.getItem('correo')

    if (token && perfil) {
      setUsuario({ token, perfil, correo })
      verificarCambio(perfil)
    }
    setCargando(false)
  }, [])

  const login = async (token, perfil, correo) => {
    localStorage.setItem('token', token)
    localStorage.setItem('perfil', perfil)
    localStorage.setItem('correo', correo)
    setUsuario({ token, perfil, correo })
    await verificarCambio(perfil)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('perfil')
    localStorage.removeItem('correo')
    setUsuario(null)
    setRequiereCambio(false)
  }

  const handleCambiado = () => setRequiereCambio(false)

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
      {usuario && requiereCambio && (
        <ModalCambioPassword onCambiado={handleCambiado} />
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)