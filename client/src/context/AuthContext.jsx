import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const perfil = localStorage.getItem('perfil')
    const correo = localStorage.getItem('correo')

    if (token && perfil) {
      setUsuario({ token, perfil, correo })
    }
    setCargando(false)
  }, [])

  const login = (token, perfil, correo) => {
    localStorage.setItem('token', token)
    localStorage.setItem('perfil', perfil)
    localStorage.setItem('correo', correo)
    setUsuario({ token, perfil, correo })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('perfil')
    localStorage.removeItem('correo')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)