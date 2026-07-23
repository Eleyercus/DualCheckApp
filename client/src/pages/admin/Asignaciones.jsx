import { useState, useEffect } from 'react'
import api from '../../services/api'

const BADGE = {
  activa: { label: 'Activa', bg: '#dcfce7', color: '#166534' },
  cancelada: { label: 'Cancelada', bg: '#fee2e2', color: '#991b1b' },
}

export default function Asignaciones() {
  const [periodo, setPeriodo] = useState(null)
  const [asignaciones, setAsignaciones] = useState([])
  const [sinAsesor, setSinAsesor] = useState([])
  const [docentes, setDocentes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState({ id_estudiante: '', id_docente: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    try {
      setCargando(true)
      const [resA, resSin, resD, resPer] = await Promise.all([
        api.get('/asignaciones'),
        api.get('/asignaciones/sin-asesor'),
        api.get('/asignaciones/docentes-activos'),
        api.get('/periodos/activo').catch(() => ({ data: null })),
      ])
      setAsignaciones(resA.data)
      setSinAsesor(resSin.data)
      setDocentes(resD.data)
      setPeriodo(resPer.data)
    } catch { setError('Error cargando datos de asignaciones') }
    finally { setCargando(false) }
  }

  const limpiar = () => { setMensaje(''); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiar(); setGuardando(true)
    try {
      await api.post('/asignaciones', form)
      setMensaje('Asignación creada correctamente')
      setForm({ id_estudiante: '', id_docente: '' })
      setMostrarForm(false)
      cargarTodo()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear asignación')
    } finally { setGuardando(false) }
  }
  const handleConcluir = async (id) => {
    if (!confirm('¿Marcar esta asignación como concluida? El estudiante terminó su estadía en este periodo.')) return
    limpiar()
    try {
      await api.patch(`/asignaciones/${id}/concluir`)
      setMensaje('Asignación marcada como concluida')
      cargarTodo()
    } catch { setError('Error al concluir asignación') }
  }
  const handleCancelar = async (id) => {
    if (!confirm('¿Cancelar esta asignación? El estudiante quedará sin asesor.')) return
    limpiar()
    try {
      await api.patch(`/asignaciones/${id}/cancelar`)
      setMensaje('Asignación cancelada correctamente')
      cargarTodo()
    } catch { setError('Error al cancelar asignación') }
  }

  const activas = asignaciones.filter(a => a.activa).length
  const docenteSeleccionado = docentes.find(d => String(d.id) === String(form.id_docente))

  if (cargando) return (
    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
  )

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            Asignación de asesores
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            Vincula cada estudiante con su docente asesor de estadía
          </p>
        </div>
        {sinAsesor.length > 0 && (
          <button className="btn-primario" onClick={() => { setMostrarForm(!mostrarForm); limpiar() }}>
            {mostrarForm ? 'Cancelar' : '+ Nueva asignación'}
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Asignaciones activas', valor: activas, color: 'var(--verde)' },
          { label: 'Pendientes de asignar', valor: sinAsesor.length, color: sinAsesor.length > 0 ? '#dc2626' : 'var(--texto-muted)' },
          { label: 'Docentes participando', valor: docentes.filter(d => d.estudiantes_asignados > 0).length, color: 'var(--dorado)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Banner periodo activo */}
      {periodo ? (
        <div style={{
          background: 'var(--verde)', borderRadius: '8px',
          padding: '10px 16px', marginBottom: '1.25rem',
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '8px'
        }}>
          <div>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Asignando al periodo
            </span>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '2px 0 0' }}>
              {periodo.nombre}
            </p>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            {new Date(periodo.fecha_inicio.substring(0,10)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' — '}
            {new Date(periodo.fecha_fin.substring(0,10)).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      ) : (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b' }}>
            No hay periodo activo — las asignaciones nuevas requieren un periodo activo.
          </p>
        </div>
      )}

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {/* Alerta estudiantes sin asesor */}
      {sinAsesor.length > 0 && !mostrarForm && (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '6px' }}>
                {sinAsesor.length} estudiante{sinAsesor.length > 1 ? 's' : ''} sin asesor asignado
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {sinAsesor.map(e => (
                  <span key={e.id} style={{
                    fontSize: '11px', background: '#fee2e2', color: '#991b1b',
                    padding: '2px 8px', borderRadius: '99px'
                  }}>
                    {e.matricula} — {e.nombre} {e.apellido_p}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn-primario" style={{ flexShrink: 0, marginLeft: '1rem' }}
              onClick={() => { setMostrarForm(true); limpiar() }}>
              Asignar ahora
            </button>
          </div>
        </div>
      )}

      {sinAsesor.length === 0 && asignaciones.length > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--verde)', borderRadius: '0 8px 8px 0', marginBottom: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--verde-oscuro)', fontWeight: '500' }}>
            ✓ Todos los estudiantes activos tienen asesor asignado
          </p>
        </div>
      )}

      {/* Formulario nueva asignación */}
      {mostrarForm && (
        <div className="card" style={{ borderTop: '3px solid var(--naranja)', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
            Nueva asignación
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-campo">
                <label className="form-label">Estudiante *</label>
                <select className="form-input" value={form.id_estudiante}
                  onChange={e => setForm({ ...form, id_estudiante: e.target.value })} required>
                  <option value="">Selecciona un estudiante</option>
                  {sinAsesor.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.matricula} — {e.nombre} {e.apellido_p} {e.apellido_m} ({e.grupo || 'sin grupo'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-campo">
                <label className="form-label">Docente asesor *</label>
                <select className="form-input" value={form.id_docente}
                  onChange={e => setForm({ ...form, id_docente: e.target.value })} required>
                  <option value="">Selecciona un docente</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nombre} {d.apellido_p} {d.apellido_m} — {d.estudiantes_asignados} alumno{d.estudiantes_asignados !== 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview de la asignación */}
            {form.id_estudiante && form.id_docente && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '6px', padding: '10px 14px', marginTop: '12px'
              }}>
                <p style={{ fontSize: '12px', color: '#166534', fontWeight: '500' }}>
                  Confirmas asignar a{' '}
                  <strong>
                    {sinAsesor.find(e => String(e.id) === String(form.id_estudiante))?.nombre}{' '}
                    {sinAsesor.find(e => String(e.id) === String(form.id_estudiante))?.apellido_p}
                  </strong>
                  {' '}con el docente{' '}
                  <strong>
                    {docenteSeleccionado?.nombre} {docenteSeleccionado?.apellido_p}
                  </strong>
                  {docenteSeleccionado && ` (actualmente tiene ${docenteSeleccionado.estudiantes_asignados} alumno${docenteSeleccionado.estudiantes_asignados !== 1 ? 's' : ''})`}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario"
                onClick={() => { setMostrarForm(false); setForm({ id_estudiante: '', id_docente: '' }); limpiar() }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primario" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Confirmar asignación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de asignaciones */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {asignaciones.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            No hay asignaciones registradas aún.
          </p>
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  {['Estudiante', 'Matrícula', 'Grupo', 'Docente asesor', 'Periodo', 'Fecha', 'Estatus', 'Acciones'].map(c => (
                  <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asignaciones.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: '500' }}>
                      {a.est_nombre} {a.est_apellido_p} {a.est_apellido_m}
                    </td>
                    <td>{a.matricula}</td>
                    <td>{a.grupo || '—'}</td>
                    <td>{a.doc_nombre} {a.doc_apellido_p}</td>
<td style=          {{ fontSize: '11px', color: 'var(--texto-muted)' }}>{a.periodo_nombre}</td>
                    <td style={{ color: 'var(--texto-muted)', fontSize: '12px' }}>
                      {new Date(a.fecha_asignacion).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '99px',
                        background: a.estatus === 'activa' ? '#dcfce7' : a.estatus === 'concluida' ? '#dbeafe' : '#fee2e2',
                        color: a.estatus === 'activa' ? '#166534' : a.estatus === 'concluida' ? '#1e40af' : '#991b1b'
                        }}>
                        {a.estatus === 'activa' ? 'Activa' : a.estatus === 'concluida' ? 'Concluida' : 'Cancelada'}
                      </span>
                    </td>
                    <td>
                      {a.estatus === 'activa' ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-secundario" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => handleConcluir(a.id)}>
                          Concluir
                        </button>
                        <button className="btn-peligro" onClick={() => handleCancelar(a.id)}>
                          Cancelar
                        </button>
                      </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista de carga de docentes */}
      {docentes.length > 0 && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '10px' }}>
            Carga por docente
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {docentes.map(d => (
              <div key={d.id} style={{
                padding: '10px 12px', borderRadius: '6px',
                border: '0.5px solid var(--borde)', background: '#fff'
              }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '2px' }}>
                  {d.nombre} {d.apellido_p}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>
                  {d.programa_educativo || 'Sin programa'}
                </p>
                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: '700',
                    color: d.estudiantes_asignados > 0 ? 'var(--verde)' : 'var(--texto-muted)'
                  }}>
                    {d.estudiantes_asignados}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>
                    alumno{d.estudiantes_asignados !== 1 ? 's' : ''} asignado{d.estudiantes_asignados !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}