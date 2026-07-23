import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const res = await api.post('/auth/login', { correo, password })
      await login(res.data.token, res.data.perfil, correo)
      if (res.data.perfil === 'administrador') navigate('/admin')
      else if (res.data.perfil === 'docente') navigate('/docente')
      else if (res.data.perfil === 'estudiante') navigate('/estudiante')
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F6F4' }}>
      {/* Panel izquierdo verde */}
      <div style={{
        width: '42%', background: 'var(--verde)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '3rem 2rem', position: 'relative'
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '3px',
          background: 'linear-gradient(to bottom, var(--dorado), var(--plateado), var(--dorado))'
        }} />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '800', color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>
            Dual<span style={{ color: 'var(--naranja)' }}>Check</span>
          </h1>
          <div style={{ width: '50px', height: '2px', background: 'var(--dorado)', margin: '16px auto' }} />
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.6 }}>
            Sistema de Validación<br />de Estadías
          </p>
          <p style={{ color: 'var(--dorado)', fontSize: '12px', marginTop: '8px', fontWeight: '500', letterSpacing: '1px' }}>
            UTCAD · 2026
          </p>
        </div>
      </div>

      {/* Panel derecho formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--verde-oscuro)', marginBottom: '6px' }}>
            Bienvenido
          </h2>
          <p style={{ color: 'var(--texto-muted)', fontSize: '13px', marginBottom: '2rem' }}>
            Ingresa con tu cuenta institucional
          </p>

          {error && <div className="alerta-error">{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-campo">
              <label className="form-label">Correo institucional</label>
              <input
                className="form-input"
                type="email"
                placeholder="usuario@utcadereyta.edu.mx"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                required
              />
            </div>
            <div className="form-campo">
              <label className="form-label">Contraseña</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn-primario" type="submit" disabled={cargando}
              style={{ marginTop: '0.5rem', padding: '11px', fontSize: '14px' }}>
              {cargando ? 'Verificando...' : 'Entrar al sistema'}
            </button>
          </form>
          <p style={{ color: '#9ca3af', fontSize: '11px', textAlign: 'center', marginTop: '1.5rem' }}>
            ¿Problemas para acceder? Contacta a coordinación de estadías
          </p>
        </div>
      </div>
    </div>
  )
}