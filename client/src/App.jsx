import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import DocenteDashboard from './pages/docente/Dashboard'
import EstudianteDashboard from './pages/estudiante/Dashboard'

// Protege rutas según perfil
const RutaProtegida = ({ children, perfil }) => {
  const { usuario, cargando } = useAuth()
  if (cargando) return <p>Cargando...</p>
  if (!usuario) return <Navigate to="/" />
  if (usuario.perfil !== perfil) return <Navigate to="/" />
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={
            <RutaProtegida perfil="administrador">
              <AdminDashboard />
            </RutaProtegida>
          } />
          <Route path="/docente" element={
            <RutaProtegida perfil="docente">
              <DocenteDashboard />
            </RutaProtegida>
          } />
          <Route path="/estudiante" element={
            <RutaProtegida perfil="estudiante">
              <EstudianteDashboard />
            </RutaProtegida>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App