import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useFiltro } from '../../hooks/useFiltro'
import BarraFiltros, { SinResultadosFiltro } from '../../components/BarraFiltros'

const BADGE_SOLICITUD = {
  PENDIENTE: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
  APROBADA: { label: 'Aprobada', bg: '#dcfce7', color: '#166534' },
  RECHAZADA: { label: 'Rechazada', bg: '#fee2e2', color: '#991b1b' },
}

export default function Correcciones() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)
  const [modalRechazo, setModalRechazo] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [enviandoRechazo, setEnviandoRechazo] = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/asistencia/solicitudes-pendientes')
      setSolicitudes(res.data)
    } catch { setError('Error cargando solicitudes de corrección') }
    finally { setCargando(false) }
  }

  const limpiarAlertas = () => { setMensaje(''); setError('') }

  const aprobar = async (id) => {
    if (!confirm('¿Aprobar esta corrección? La asistencia de esa semana quedará registrada de forma retroactiva.')) return
    limpiarAlertas(); setProcesando(id)
    try {
      const res = await api.patch(`/asistencia/solicitudes/${id}/aprobar`)
      setMensaje(res.data.mensaje)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al aprobar la solicitud')
    } finally { setProcesando(null) }
  }

  const abrirRechazo = (id) => {
    limpiarAlertas()
    setModalRechazo(id)
    setMotivoRechazo('')
  }

  const confirmarRechazo = async () => {
    setEnviandoRechazo(true); setError('')
    try {
      const res = await api.patch(`/asistencia/solicitudes/${modalRechazo}/rechazar`, {
        motivo_rechazo: motivoRechazo
      })
      setMensaje(res.data.mensaje)
      setModalRechazo(null)
      setMotivoRechazo('')
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al rechazar la solicitud')
    } finally { setEnviandoRechazo(false) }
  }

  const pendientes = solicitudes.filter(s => s.estatus === 'PENDIENTE').length
  const aprobadas = solicitudes.filter(s => s.estatus === 'APROBADA').length
  const rechazadas = solicitudes.filter(s => s.estatus === 'RECHAZADA').length

  // ── Búsqueda y filtros ────────────────────────────────────────────────────
  const docentesEnTabla = Array.from(new Set(
    solicitudes.map(s => s.docente).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es'))

  const {
    query, setQuery, valoresFiltro, setFiltro, limpiar: limpiarFiltros,
    resultado: solicitudesFiltradas, hayFiltrosActivos, total, totalFiltrado
  } = useFiltro(solicitudes, {
    buscarEn: s => `${s.docente} ${s.estudiante} ${s.motivo} semana ${s.semana}`,
    filtros: {
      estatus: (s, v) => s.estatus === v,
      docente: (s, v) => s.docente === v,
    }
  })

  const definicionFiltros = [
    {
      clave: 'estatus', label: 'Estatus', opciones: [
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'APROBADA', label: 'Aprobada' },
        { value: 'RECHAZADA', label: 'Rechazada' },
      ]
    },
    { clave: 'docente', label: 'Docente', opciones: docentesEnTabla.map(d => ({ value: d, label: d })) },
  ]

  const formatearFecha = (fecha) => new Date(fecha).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (cargando) return (
    <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
  )

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
          Correcciones de asistencia
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
          Revisa las solicitudes que los docentes envían para registrar semanas pasadas
        </p>
      </div>

      {/* Estadísticas — también funcionan como accesos rápidos de filtro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Pendientes de revisión', valor: pendientes, color: pendientes > 0 ? '#dc2626' : 'var(--texto-muted)', clave: 'PENDIENTE' },
          { label: 'Aprobadas', valor: aprobadas, color: 'var(--verde)', clave: 'APROBADA' },
          { label: 'Rechazadas', valor: rechazadas, color: 'var(--dorado)', clave: 'RECHAZADA' },
        ].map(s => (
          <div key={s.label}
            className={`card stat-card-clicable ${valoresFiltro.estatus === s.clave ? 'activa' : ''}`}
            style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}
            onClick={() => setFiltro('estatus', s.clave)}
            title="Clic para filtrar la tabla">
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {pendientes > 0 && (
        <div className="card" style={{ borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0', marginBottom: '1rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b' }}>
            {pendientes} solicitud{pendientes > 1 ? 'es' : ''} de corrección pendiente{pendientes > 1 ? 's' : ''} de revisión
          </p>
        </div>
      )}

      {/* Búsqueda y filtros */}
      {solicitudes.length > 0 && (
        <BarraFiltros
          query={query} onQuery={setQuery}
          placeholder="Buscar por docente, estudiante o motivo..."
          filtros={definicionFiltros}
          valoresFiltro={valoresFiltro} onFiltro={setFiltro}
          onLimpiar={limpiarFiltros} hayFiltrosActivos={hayFiltrosActivos}
          total={total} totalFiltrado={totalFiltrado}
        />
      )}

      {/* Tabla */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {solicitudes.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            No hay solicitudes de corrección registradas.
          </p>
        ) : solicitudesFiltradas.length === 0 ? (
          <SinResultadosFiltro onLimpiar={limpiarFiltros} />
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  {['Solicitada', 'Docente', 'Estudiante', 'Semana', 'Motivo', 'Estatus', 'Acciones'].map(c => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solicitudesFiltradas.map(s => {
                  const badge = BADGE_SOLICITUD[s.estatus] || BADGE_SOLICITUD.PENDIENTE
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--texto-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatearFecha(s.fecha_solicitud || s.fecha_hora)}
                      </td>
                      <td style={{ fontWeight: '500' }}>{s.docente}</td>
                      <td>{s.estudiante}</td>
                      <td style={{ textAlign: 'center' }}>{s.semana}</td>
                      <td style={{ maxWidth: '260px', whiteSpace: 'normal', fontSize: '12px', color: 'var(--texto-muted)' }}>
                        {s.motivo}
                        {s.estatus === 'RECHAZADA' && s.motivo_rechazo && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#991b1b' }}>
                            <strong>Motivo del rechazo:</strong> {s.motivo_rechazo}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '99px',
                          background: badge.bg, color: badge.color
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        {s.estatus === 'PENDIENTE' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-secundario" style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => aprobar(s.id)} disabled={procesando === s.id}>
                              {procesando === s.id ? 'Procesando...' : 'Aprobar'}
                            </button>
                            <button className="btn-peligro" onClick={() => abrirRechazo(s.id)} disabled={procesando === s.id}>
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>
                            {s.estatus === 'APROBADA' ? s.aprobada_por : s.rechazada_por}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de rechazo */}
      {modalRechazo && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            width: '100%', maxWidth: '480px', margin: '1rem'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--verde-oscuro)', marginBottom: '8px' }}>
              Rechazar solicitud de corrección
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginBottom: '1rem' }}>
              El docente no podrá registrar esa semana con esta solicitud. Puedes indicar el motivo del rechazo (opcional, se guarda en el historial).
            </p>
            <div className="form-campo" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Motivo del rechazo</label>
              <textarea
                className="form-input"
                rows={3}
                value={motivoRechazo}
                onChange={e => setMotivoRechazo(e.target.value)}
                placeholder="Ej. La fecha no coincide con el registro de la empresa..."
                style={{ resize: 'vertical', minHeight: '70px' }}
              />
            </div>
            {error && <div className="alerta-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secundario" onClick={() => { setModalRechazo(null); setMotivoRechazo(''); setError('') }}>
                Cancelar
              </button>
              <button className="btn-peligro" onClick={confirmarRechazo} disabled={enviandoRechazo}
                style={{ padding: '8px 16px' }}>
                {enviandoRechazo ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}