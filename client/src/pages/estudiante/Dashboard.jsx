import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const SEMANAS = Array.from({ length: 13 }, (_, i) => i + 1)

export default function EstudianteDashboard() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [confirmando, setConfirmando] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/asistencia/mi-asistencia')
      setDatos(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando tu información')
    } finally {
      setCargando(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/') }

  const confirmar = async (semana) => {
    setMensaje(''); setError(''); setConfirmando(semana)
    try {
      const res = await api.post(
        `/asistencia/asignacion/${datos.id_asignacion}/semana/${semana}/estudiante`
      )
      setMensaje(res.data.mensaje)
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al confirmar asistencia')
    } finally {
      setConfirmando(null) }
  }

  const getSemana = (num) => datos?.asistencia?.find(a => a.semana === num)

  const semanaActual = (() => {
    if (!datos?.fecha_inicio) return 1
    // Parsear sin desfase de zona horaria
    const partes = datos.fecha_inicio.substring(0, 10).split('-')
    const inicio = new Date(
      parseInt(partes[0]),
      parseInt(partes[1]) - 1,
      parseInt(partes[2])
    )
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const diff = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 0
    return Math.min(Math.floor(diff / 7) + 1, 13)
  })()

  const validadas = datos?.asistencia?.filter(
    a => a.confirmacion_docente && a.confirmacion_estudiante
  ).length || 0

  // ── Loading ────────────────────────────────────────────────────────────────
  if (cargando) return (
    <div style={styles.fullCenter}>
      <div style={styles.card}>
        <p style={{ color: 'var(--texto-muted)', fontSize: '16px', textAlign: 'center' }}>
          Cargando tu información...
        </p>
      </div>
    </div>
  )

  // ── Sin asignación ────────────────────────────────────────────────────────
  if (error && !datos) return (
    <div style={styles.fullCenter}>
      <div style={{ ...styles.card, textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📋</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--verde-oscuro)', marginBottom: '8px' }}>
          Sin asesor asignado
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--texto-muted)', marginBottom: '1.5rem' }}>
          Aún no tienes un docente asesor asignado para este periodo. Acude a coordinación de estadías.
        </p>
        <button onClick={handleLogout} style={styles.btnLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>
            Dual<span style={{ color: 'var(--naranja)' }}>Check</span>
          </span>
          <span style={styles.headerSub}>Estadías UTCAD</span>
        </div>
        <button onClick={handleLogout} style={styles.btnLogoutHeader}>
          Salir
        </button>
      </header>

      {/* Bienvenida */}
      <div style={styles.bienvenida}>
        <p style={styles.bienvenidaLabel}>Bienvenido</p>
        <h1 style={styles.bienvenidaNombre}>{usuario?.correo}</h1>
      </div>

      <div style={styles.content}>
        {/* Alertas */}
        {mensaje && (
          <div className="alerta-exito" style={styles.alerta}>
            ✓ {mensaje}
          </div>
        )}
        {error && datos && (
          <div className="alerta-error" style={styles.alerta}>
            {error}
          </div>
        )}

        {/* Estado del docente sin validar */}
        {datos && !datos.validada_por_docente && (
          <div style={styles.alertaDocente}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <div>
              <p style={{ fontWeight: '700', fontSize: '15px', color: '#92400e' }}>
                Tu asesor aún no ha validado tu asignación
              </p>
              <p style={{ fontSize: '13px', color: '#b45309', marginTop: '4px' }}>
                Podrás confirmar tu asistencia una vez que tu docente asesor valide que te corresponde.
              </p>
            </div>
          </div>
        )}

        {/* Tarjetas de estadísticas */}
        <div style={styles.statsGrid}>
          {[
            { label: 'Semana actual', valor: semanaActual, color: 'var(--verde)' },
            { label: 'Asistencias validadas', valor: `${validadas}/13`, color: 'var(--naranja)' },
            { label: 'Pendientes', valor: 13 - validadas, color: validadas < 13 ? '#dc2626' : 'var(--verde)' },
          ].map(s => (
            <div key={s.label} style={{ ...styles.statCard, borderTopColor: s.color }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: s.color }}>{s.valor}</div>
              <div style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid de semanas */}
        {datos && (
          <div style={styles.semanasContainer}>
            <h2 style={styles.semanasTitle}>Registro de asistencia — 13 semanas</h2>

            {/* Leyenda */}
            <div style={styles.leyenda}>
              {[
                { color: 'var(--verde)', label: 'Completada' },
                { color: 'var(--naranja)', label: 'Pendiente tu confirmación' },
                { color: '#e5e7eb', label: 'Sin registro del docente' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--texto-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>

            <div style={styles.semanasGrid}>
              {SEMANAS.map(num => {
                const sem = getSemana(num)
                const tieneDocente = !!sem?.confirmacion_docente
                const tieneEstudiante = !!sem?.confirmacion_estudiante
                const completa = tieneDocente && tieneEstudiante
                const esFutura = num > semanaActual
                const esActual = num === semanaActual
                const puedoConfirmar = tieneDocente && !tieneEstudiante && !esFutura && datos.validada_por_docente

                let borderColor = 'var(--borde)'
                let bgColor = '#fff'
                if (completa) { borderColor = 'var(--verde)'; bgColor = '#f0fdf4' }
                else if (tieneDocente) { borderColor = 'var(--naranja)'; bgColor = '#fff7ed' }

                return (
                  <div key={num} style={{
                    ...styles.semanaCard,
                    borderColor,
                    background: bgColor,
                    opacity: esFutura ? 0.4 : 1,
                  }}>
                    {/* Número de semana */}
                    <div style={styles.semanaHeader}>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
                        Semana {num}
                      </span>
                      {esActual && !esFutura && (
                        <span style={styles.badgeActual}>Actual</span>
                      )}
                    </div>

                    {/* Indicadores */}
                    <div style={styles.indicadores}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: tieneDocente ? 'var(--verde)' : '#e5e7eb'
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>Docente</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: tieneEstudiante ? 'var(--verde)' : '#e5e7eb'
                        }} />
                        <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>Tú</span>
                      </div>
                    </div>

                    {/* Acción */}
                    {completa ? (
                      <div style={styles.badgeCompleta}>✓ Validada</div>
                    ) : puedoConfirmar ? (
                      <button
                        onClick={() => confirmar(num)}
                        disabled={confirmando === num}
                        style={styles.btnConfirmar}
                      >
                        {confirmando === num ? 'Confirmando...' : 'Confirmar asistencia'}
                      </button>
                    ) : esFutura ? (
                      <p style={styles.textoEstado}>🔒 Semana futura</p>
                    ) : !tieneDocente ? (
                      <p style={styles.textoEstado}>Esperando al docente</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--fondo)',
    display: 'flex',
    flexDirection: 'column',
  },
  fullCenter: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--fondo)',
    padding: '1rem',
  },
  header: {
    background: 'var(--verde)',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '3px solid var(--dorado)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: '-0.5px',
  },
  headerSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
  },
  btnLogoutHeader: {
    padding: '6px 16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  bienvenida: {
    background: 'var(--verde-oscuro)',
    padding: '1.25rem 1.5rem',
  },
  bienvenidaLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  bienvenidaNombre: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fff',
    margin: '4px 0 0',
  },
  content: {
    flex: 1,
    padding: '1.25rem',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
  },
  alerta: {
    marginBottom: '1rem',
    fontSize: '14px',
  },
  alertaDocente: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: '#fefce8',
    border: '1px solid #fde047',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '1rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '1.25rem',
  },
  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1rem',
    borderTop: '3px solid',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  semanasContainer: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  semanasTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--verde-oscuro)',
    marginBottom: '10px',
  },
  leyenda: {
    display: 'flex',
    gap: '16px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  semanasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '10px',
  },
  semanaCard: {
    border: '2px solid',
    borderRadius: '10px',
    padding: '12px',
    transition: 'all .15s',
  },
  semanaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  badgeActual: {
    fontSize: '10px',
    background: 'var(--naranja)',
    color: '#fff',
    padding: '2px 7px',
    borderRadius: '99px',
    fontWeight: '500',
  },
  indicadores: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  badgeCompleta: {
    fontSize: '12px',
    color: 'var(--verde)',
    fontWeight: '600',
    textAlign: 'center',
    padding: '4px 0',
  },
  btnConfirmar: {
    width: '100%',
    padding: '8px',
    background: 'var(--naranja)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background .15s',
  },
  textoEstado: {
    fontSize: '11px',
    color: 'var(--texto-muted)',
    textAlign: 'center',
    margin: 0,
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  btnLogout: {
    padding: '10px 24px',
    background: 'var(--verde)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
}