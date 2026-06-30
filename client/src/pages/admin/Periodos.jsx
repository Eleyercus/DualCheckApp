import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function Periodos() {
  const [periodos, setPeriodos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '' })

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/periodos')
      setPeriodos(res.data)
    } catch { setError('Error cargando periodos') }
    finally { setCargando(false) }
  }

  const limpiar = () => { setMensaje(''); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiar(); setGuardando(true)
    try {
      await api.post('/periodos', form)
      setMensaje('Periodo creado correctamente')
      setForm({ nombre: '', fecha_inicio: '', fecha_fin: '' })
      setMostrarForm(false)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el periodo')
    } finally { setGuardando(false) }
  }

  const activarPeriodo = async (id) => {
    if (!confirm('Este será el único periodo activo para nuevas asignaciones. ¿Continuar?')) return
    limpiar()
    try {
      await api.patch(`/periodos/${id}/estatus`, { activo: true })
      setMensaje('Periodo activado correctamente')
      cargar()
    } catch { setError('Error activando el periodo') }
  }

  const desactivarPeriodo = async (id) => {
    limpiar()
    try {
      await api.patch(`/periodos/${id}/estatus`, { activo: false })
      setMensaje('Periodo desactivado')
      cargar()
    } catch { setError('Error desactivando el periodo') }
  }

  const calcularSemanas = (inicio, fin) => {
    const dias = (new Date(fin) - new Date(inicio)) / (1000 * 60 * 60 * 24)
    return Math.round(dias / 7)
  }

  const periodoActivo = periodos.find(p => p.activo)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            Periodos de estadía
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            Define los cuatrimestres y sus fechas exactas de inicio y fin
          </p>
        </div>
        <button className="btn-primario" onClick={() => { setMostrarForm(!mostrarForm); limpiar() }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo periodo'}
        </button>
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {/* Periodo activo destacado */}
      {periodoActivo ? (
        <div className="card" style={{ borderTop: '3px solid var(--verde)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--verde)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Periodo activo
              </span>
              <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--verde-oscuro)', marginTop: '4px' }}>
                {periodoActivo.nombre}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
                {new Date(periodoActivo.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                {' — '}
                {new Date(periodoActivo.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                {' · '}{calcularSemanas(periodoActivo.fecha_inicio, periodoActivo.fecha_fin)} semanas aprox.
              </p>
            </div>
            <span className="badge-activo">Usándose para nuevas asignaciones</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b' }}>
            No hay ningún periodo activo
          </p>
          <p style={{ fontSize: '12px', color: '#c2410c', marginTop: '4px' }}>
            La carga masiva y las asignaciones nuevas necesitan un periodo activo seleccionado.
          </p>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="card" style={{ borderTop: '3px solid var(--naranja)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
            Nuevo periodo
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-campo" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nombre del periodo *</label>
                <input
                  className="form-input"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Mayo - Agosto 2026"
                  required
                />
              </div>
              <div className="form-campo">
                <label className="form-label">Fecha de inicio *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="form-campo">
                <label className="form-label">Fecha de fin *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => setForm({ ...form, fecha_fin: e.target.value })}
                  required
                />
              </div>
            </div>
            {form.fecha_inicio && form.fecha_fin && (
              <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '10px' }}>
                Duración aproximada: <strong>{calcularSemanas(form.fecha_inicio, form.fecha_fin)} semanas</strong>
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario" onClick={() => setMostrarForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primario" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Crear periodo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de periodos */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
        ) : periodos.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            No hay periodos registrados aún. Crea el primero para empezar a operar.
          </p>
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  {['Nombre', 'Inicio', 'Fin', 'Semanas', 'Asignaciones', 'Estatus', 'Acciones'].map(c => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodos.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: '500' }}>{p.nombre}</td>
                    <td>{new Date(p.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{new Date(p.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{calcularSemanas(p.fecha_inicio, p.fecha_fin)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: p.total_asignaciones > 0 ? '#dbeafe' : '#f3f4f6',
                        color: p.total_asignaciones > 0 ? '#1e40af' : '#6b7280',
                        padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '500'
                      }}>
                        {p.total_asignaciones}
                      </span>
                    </td>
                    <td>
                      <span className={p.activo ? 'badge-activo' : 'badge-baja'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      {p.activo ? (
                        <button className="btn-secundario" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => desactivarPeriodo(p.id)}>
                          Desactivar
                        </button>
                      ) : (
                        <button className="btn-primario" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => activarPeriodo(p.id)}>
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}