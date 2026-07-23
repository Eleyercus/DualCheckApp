import { useState } from 'react'
import api from '../services/api'

export default function ModalCambioPassword({ onCambiado }) {
  const [form, setForm] = useState({
    password_actual: '',
    password_nueva: '',
    password_confirmacion: ''
  })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password_nueva !== form.password_confirmacion) {
      return setError('La nueva contraseña y su confirmación no coinciden')
    }
    if (form.password_nueva.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres')
    }
    if (form.password_nueva === form.password_actual) {
      return setError('La nueva contraseña debe ser diferente a la actual')
    }

    setGuardando(true)
    try {
      await api.post('/auth/cambiar-password', form)
      onCambiado()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña')
    } finally {
      setGuardando(false)
    }
  }

  const campos = [
    { key: 'password_actual', label: 'Contraseña actual' },
    { key: 'password_nueva', label: 'Nueva contraseña' },
    { key: 'password_confirmacion', label: 'Confirmar nueva contraseña' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px',
        width: '100%', maxWidth: '440px', margin: '1rem',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--verde)', padding: '1.5rem',
          borderBottom: '3px solid var(--dorado)'
        }}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
            Cambio de contraseña requerido
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '6px' }}>
            Por seguridad debes establecer una contraseña personal antes de continuar. No podrás acceder al sistema hasta completar este paso.
          </p>
        </div>

        {/* Formulario */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div className="alerta-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {campos.map(({ key, label }) => (
                <div key={key} className="form-campo">
                  <label className="form-label">{label} *</label>
                  <input
                    className="form-input"
                    type="password"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              ))}
            </div>

            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: '6px', padding: '10px 14px', margin: '1rem 0'
            }}>
              <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
                La contraseña debe tener al menos 6 caracteres y ser diferente a la contraseña inicial.
              </p>
            </div>

            <button
              type="submit"
              className="btn-primario"
              disabled={guardando}
              style={{ width: '100%', padding: '11px', fontSize: '14px' }}
            >
              {guardando ? 'Guardando...' : 'Establecer nueva contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}