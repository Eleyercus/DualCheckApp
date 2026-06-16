import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const SEMANAS = Array.from({ length: 13 }, (_, i) => i + 1)

function PanelAsistencia({ asignacion, onVolver }) {
  const [asistencia, setAsistencia] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [registrando, setRegistrando] = useState(null)
  const [modalCorreccion, setModalCorreccion] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)

  const semanaActual = (() => {
    const ahora = new Date()
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1)
    const semanaAnio = Math.ceil((ahora - inicioAnio) / (7 * 24 * 60 * 60 * 1000))
    return Math.min(Math.max(1, semanaAnio % 13 || 13), 13)
  })()

  useEffect(() => { cargarAsistencia() }, [])

  const cargarAsistencia = async () => {
    try {
      setCargando(true)
      const res = await api.get(`/asistencia/asignacion/${asignacion.id_asignacion}`)
      setAsistencia(res.data)
    } catch { setError('Error cargando asistencia') }
    finally { setCargando(false) }
  }

  const registrar = async (semana) => {
    setMensaje(''); setError(''); setRegistrando(semana)
    try {
      const res = await api.post(`/asistencia/asignacion/${asignacion.id_asignacion}/semana/${semana}/docente`)
      setMensaje(res.data.mensaje)
      cargarAsistencia()
    } catch (err) {
      const data = err.response?.data
      if (data?.requiere_solicitud) {
        setModalCorreccion(data.semana)
      } else {
        setError(data?.error || 'Error al registrar')
      }
    } finally { setRegistrando(null) }
  }

  const enviarSolicitud = async () => {
    if (!motivo.trim() || motivo.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres')
      return
    }
    setEnviandoSolicitud(true); setError('')
    try {
      const res = await api.post(
        `/asistencia/asignacion/${asignacion.id_asignacion}/semana/${modalCorreccion}/solicitar-correccion`,
        { motivo }
      )
      setMensaje(res.data.mensaje)
      setModalCorreccion(null)
      setMotivo('')
    } catch (err) {
      setError(err.response?.data?.error || 'Error enviando solicitud')
    } finally { setEnviandoSolicitud(false) }
  }

  const getSemana = (num) => asistencia.find(a => a.semana === num)
  const validadas = asistencia.filter(a => a.confirmacion_docente && a.confirmacion_estudiante).length
  const porDocente = asistencia.filter(a => a.confirmacion_docente).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <button onClick={onVolver}
          style={{ background: 'none', border: 'none', color: 'var(--verde)', cursor: 'pointer', fontSize: '13px' }}>
          ← Volver
        </button>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            {asignacion.nombre} {asignacion.apellido_p} {asignacion.apellido_m}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            {asignacion.matricula} · {asignacion.grupo || 'Sin grupo'} · {asignacion.carrera || ''}
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Semanas registradas', valor: porDocente, color: 'var(--verde)', total: '/13' },
          { label: 'Doble validación completa', valor: validadas, color: 'var(--naranja)', total: '/13' },
          { label: 'Pendientes', valor: 13 - porDocente, color: 13 - porDocente > 0 ? '#dc2626' : 'var(--texto-muted)', total: '' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>
              {s.valor}<span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--texto-muted)' }}>{s.total}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--verde)', label: 'Doble validación completa' },
          { color: 'var(--naranja)', label: 'Solo docente registró' },
          { color: '#e5e7eb', label: 'Sin registro' },
          { color: '#9ca3af', label: 'Semana futura (bloqueada)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color }} />
            <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid de semanas */}
      <div className="card">
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
          Registro de asistencia — 13 semanas
        </h3>
        {cargando ? (
          <p style={{ textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {SEMANAS.map(num => {
              const sem = getSemana(num)
              const tieneDocente = sem?.confirmacion_docente
              const tieneEstudiante = sem?.confirmacion_estudiante
              const ambos = tieneDocente && tieneEstudiante
              const esFutura = num > semanaActual
              const esPasada = num < semanaActual
              const esActual = num === semanaActual

              let borderColor = 'var(--borde)'
              let bgColor = '#fff'
              if (ambos) { borderColor = 'var(--verde)'; bgColor = '#f0fdf4' }
              else if (tieneDocente) { borderColor = 'var(--naranja)'; bgColor = '#fff7ed' }
              else if (esFutura) { borderColor = '#e5e7eb'; bgColor = '#fafafa' }

              return (
                <div key={num} style={{
                  padding: '12px 14px', borderRadius: '8px',
                  border: `1.5px solid ${borderColor}`,
                  background: bgColor,
                  opacity: esFutura ? 0.45 : 1
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>
                      Semana {num}
                    </span>
                    {esActual && (
                      <span style={{ fontSize: '10px', background: 'var(--naranja)', color: '#fff', padding: '1px 6px', borderRadius: '99px' }}>
                        Actual
                      </span>
                    )}
                    {esPasada && !tieneDocente && (
                      <span style={{ fontSize: '10px', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '99px' }}>
                        Pasada
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tieneDocente ? 'var(--verde)' : '#e5e7eb' }} />
                      <span style={{ fontSize: '10px', color: 'var(--texto-muted)' }}>Docente</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tieneEstudiante ? 'var(--verde)' : '#e5e7eb' }} />
                      <span style={{ fontSize: '10px', color: 'var(--texto-muted)' }}>Estudiante</span>
                    </div>
                  </div>

                  {/* Acciones según estado */}
                  {esFutura ? (
                    <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>
                      🔒 Semana futura
                    </p>
                  ) : ambos ? (
                    <p style={{ fontSize: '10px', color: 'var(--verde)', margin: 0, fontWeight: '500' }}>
                      ✓ Validación completa
                    </p>
                  ) : tieneDocente && !tieneEstudiante ? (
                    <p style={{ fontSize: '10px', color: '#d97706', margin: 0 }}>
                      Esperando confirmación del estudiante
                    </p>
                  ) : esActual ? (
                    <button onClick={() => registrar(num)}
                      disabled={registrando === num}
                      style={{
                        width: '100%', padding: '5px', fontSize: '11px', fontWeight: '500',
                        background: 'var(--verde)', color: '#fff', border: 'none',
                        borderRadius: '4px', cursor: 'pointer'
                      }}>
                      {registrando === num ? 'Guardando...' : 'Registrar asistencia'}
                    </button>
                  ) : esPasada && !tieneDocente ? (
                    <button onClick={() => setModalCorreccion(num)}
                      style={{
                        width: '100%', padding: '5px', fontSize: '11px', fontWeight: '500',
                        background: 'transparent', color: '#dc2626',
                        border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer'
                      }}>
                      Solicitar corrección
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de solicitud de corrección */}
      {modalCorreccion && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '1.5rem',
            width: '100%', maxWidth: '480px', margin: '1rem'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--verde-oscuro)', marginBottom: '8px' }}>
              Solicitud de corrección — Semana {modalCorreccion}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginBottom: '1rem' }}>
              La semana {modalCorreccion} ya pasó. Tu solicitud será enviada al administrador para su revisión y aprobación. Explica el motivo por el que no se registró a tiempo.
            </p>
            <div className="form-campo" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Motivo de la corrección *</label>
              <textarea
                className="form-input"
                rows={4}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Describe por qué no se registró la asistencia en la semana correspondiente..."
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
              <span style={{ fontSize: '11px', color: motivo.length < 10 ? '#dc2626' : 'var(--texto-muted)' }}>
                {motivo.length} caracteres (mínimo 10)
              </span>
            </div>
            {error && <div className="alerta-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-secundario"
                onClick={() => { setModalCorreccion(null); setMotivo(''); setError('') }}>
                Cancelar
              </button>
              <button className="btn-primario" onClick={enviarSolicitud} disabled={enviandoSolicitud}>
                {enviandoSolicitud ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DocenteDashboard() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [estudiantes, setEstudiantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estudianteActivo, setEstudianteActivo] = useState(null)
  const [validando, setValidando] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/asistencia/mis-estudiantes')
      setEstudiantes(res.data)
    } catch { setError('Error cargando tus estudiantes') }
    finally { setCargando(false) }
  }

  const handleLogout = () => { logout(); navigate('/') }

  const validarAsignacion = async (id_asignacion) => {
    setMensaje(''); setError(''); setValidando(id_asignacion)
    try {
      await api.patch(`/asistencia/asignacion/${id_asignacion}/validar`)
      setMensaje('Asignación validada correctamente')
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al validar')
    } finally { setValidando(null) }
  }

  const noValidadas = estudiantes.filter(e => !e.validada_por_docente).length

  if (estudianteActivo) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F6F4' }}>
      <aside style={{ width: '220px', background: 'var(--verde)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Dual<span style={{ color: 'var(--naranja)' }}>Check</span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Panel Docente</div>
        </div>
        <div style={{ flex: 1, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Registrando asistencia:</p>
          <p style={{ fontSize: '12px', color: '#fff', fontWeight: '600' }}>
            {estudianteActivo.nombre} {estudianteActivo.apellido_p}
          </p>
        </div>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', wordBreak: 'break-all' }}>{usuario?.correo}</p>
          <button onClick={handleLogout} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(168,169,173,0.4)', borderRadius: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '52px', background: '#fff', borderBottom: '1px solid var(--borde)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>Asistencia estudiantil</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--verde)', border: '1px solid var(--dorado)', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.8px' }}>UTCAD</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--verde)', border: '2px solid var(--dorado)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--dorado)' }}>UT</div>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <PanelAsistencia
            asignacion={estudianteActivo}
            onVolver={() => { setEstudianteActivo(null); setMensaje(''); setError('') }}
          />
        </main>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F6F4' }}>
      <aside style={{ width: '220px', background: 'var(--verde)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Dual<span style={{ color: 'var(--naranja)' }}>Check</span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Panel Docente</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 1.25rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderLeft: '3px solid var(--naranja)', color: '#fff', fontSize: '13px' }}>
            <i className="ti ti-users" style={{ fontSize: '16px' }} aria-hidden="true" />
            Mis estudiantes
          </div>
        </nav>
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', wordBreak: 'break-all' }}>{usuario?.correo}</p>
          <button onClick={handleLogout} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid rgba(168,169,173,0.4)', borderRadius: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: '52px', background: '#fff', borderBottom: '1px solid var(--borde)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>Mis estudiantes asignados</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--verde)', border: '1px solid var(--dorado)', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.8px' }}>UTCAD</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--verde)', border: '2px solid var(--dorado)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: 'var(--dorado)' }}>UT</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
              Mis estudiantes
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
              Valida tus asignaciones y registra la asistencia semanal
            </p>
          </div>

          {/* Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
            {[
              { label: 'Estudiantes asignados', valor: estudiantes.length, color: 'var(--verde)' },
              { label: 'Asignaciones validadas', valor: estudiantes.filter(e => e.validada_por_docente).length, color: 'var(--naranja)' },
              { label: 'Pendientes de validar', valor: noValidadas, color: noValidadas > 0 ? '#dc2626' : 'var(--texto-muted)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
                <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {mensaje && <div className="alerta-exito">{mensaje}</div>}
          {error && <div className="alerta-error">{error}</div>}

          {noValidadas > 0 && (
            <div className="card" style={{ borderLeft: '4px solid #dc2626', borderRadius: '0 8px 8px 0', marginBottom: '1rem' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b' }}>
                Tienes {noValidadas} asignación{noValidadas > 1 ? 'es' : ''} pendiente{noValidadas > 1 ? 's' : ''} de validar
              </p>
              <p style={{ fontSize: '12px', color: '#c2410c', marginTop: '4px' }}>
                Debes validar que los estudiantes te corresponden antes de registrar asistencia.
              </p>
            </div>
          )}

          {cargando ? (
            <p style={{ textAlign: 'center', color: 'var(--texto-muted)', padding: '2rem' }}>Cargando...</p>
          ) : estudiantes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <i className="ti ti-users" style={{ fontSize: '48px', color: 'var(--texto-muted)', display: 'block', marginBottom: '1rem' }} aria-hidden="true" />
              <p style={{ color: 'var(--texto-muted)', fontSize: '14px' }}>No tienes estudiantes asignados aún.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {estudiantes.map(est => (
                <div key={est.id_asignacion} className="card" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderLeft: `4px solid ${est.validada_por_docente ? 'var(--verde)' : 'var(--dorado)'}`,
                  borderRadius: '0 10px 10px 0', gap: '1rem', flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>
                        {est.nombre} {est.apellido_p} {est.apellido_m}
                      </p>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '99px', fontWeight: '500',
                        background: est.validada_por_docente ? '#dcfce7' : '#fef3c7',
                        color: est.validada_por_docente ? '#166534' : '#92400e'
                      }}>
                        {est.validada_por_docente ? '✓ Validada' : 'Pendiente validación'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--texto-muted)' }}>
                      {est.matricula} · {est.grupo || 'Sin grupo'} · {est.carrera || 'Sin carrera'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{est.correo}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!est.validada_por_docente && (
                      <button className="btn-secundario"
                        onClick={() => validarAsignacion(est.id_asignacion)}
                        disabled={validando === est.id_asignacion}
                        style={{ fontSize: '12px', padding: '6px 14px' }}>
                        {validando === est.id_asignacion ? 'Validando...' : 'Validar asignación'}
                      </button>
                    )}
                    <button className="btn-primario"
                      onClick={() => setEstudianteActivo(est)}
                      disabled={!est.validada_por_docente}
                      style={{ fontSize: '12px', padding: '6px 14px', opacity: est.validada_por_docente ? 1 : 0.5 }}
                      title={!est.validada_por_docente ? 'Valida la asignación primero' : ''}>
                      Registrar asistencia
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}