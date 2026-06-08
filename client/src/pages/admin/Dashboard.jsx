import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboard() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Panel Administrador</h1>
      <p>Bienvenido, {usuario?.correo}</p>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  )
}