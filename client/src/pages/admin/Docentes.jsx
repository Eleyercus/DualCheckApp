import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useFiltro } from '../../hooks/useFiltro'
import BarraFiltros, { SinResultadosFiltro } from '../../components/BarraFiltros'

export default function Docentes() {
  const [docentes, setDocentes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [passwordGenerada, setPasswordGenerada] = useState('')
  const [form, setForm] = useState({
    nombre: '', apellido_p: '', apellido_m: '',
    programa_educativo: '', correo: ''
  })

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/docentes')
      setDocentes(res.data)
    } catch { setError('Error cargando docentes') }
    finally { setCargando(false) }
  }

  const limpiarAlertas = () => { setMensaje(''); setError(''); setPasswordGenerada('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiarAlertas()
    try {
      const res = await api.post('/docentes', form)
      setMensaje(`Docente registrado correctamente.`)
      setPasswordGenerada(`Contraseña inicial: ${res.data.passwordInicial}`)
      setForm({ nombre: '', apellido_p: '', apellido_m: '', programa_educativo: '', correo: '' })
      setMostrarForm(false)
      cargar()
    } catch (err) { setError(err.response?.data?.error || 'Error al registrar') }
  }

  const handleBaja = async (id) => {
    if (!confirm('¿Confirmas dar de baja a este docente?')) return
    limpiarAlertas()
    try {
      await api.patch(`/docentes/${id}/baja`)
      setMensaje('Docente dado de baja correctamente')
      cargar()
    } catch { setError('Error al dar de baja') }
  }

  const activos = docentes.filter(d => d.estatus).length

  // ── Búsqueda y filtros de la tabla ──────────────────────────────────────
  const programasUnicos = Array.from(new Set(
    docentes.map(d => d.programa_educativo).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es'))

  const {
    query, setQuery, valoresFiltro, setFiltro, limpiar: limpiarFiltros,
    resultado: docentesFiltrados, hayFiltrosActivos, total, totalFiltrado
  } = useFiltro(docentes, {
    buscarEn: d => `${d.nombre} ${d.apellido_p} ${d.apellido_m} ${d.correo} ${d.programa_educativo || ''}`,
    filtros: {
      estatus: (d, v) => (v === 'activo' ? !!d.estatus : !d.estatus),
      programa: (d, v) => d.programa_educativo === v,
    }
  })

  const definicionFiltros = [
    {
      clave: 'estatus', label: 'Estatus', opciones: [
        { value: 'activo', label: 'Activo' },
        { value: 'baja', label: 'Baja' },
      ]
    },
    { clave: 'programa', label: 'Programa', opciones: programasUnicos.map(p => ({ value: p, label: p })) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            Gestión de docentes asesores
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            Registro y administración de asesores de estadía
          </p>
        </div>
        <button className="btn-primario" onClick={() => { setMostrarForm(!mostrarForm); limpiarAlertas() }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo docente'}
        </button>
      </div>

      {/* Estadísticas — también funcionan como accesos rápidos de filtro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total docentes', valor: docentes.length, color: 'var(--verde)', onClick: limpiarFiltros, activa: !hayFiltrosActivos },
          { label: 'Activos', valor: activos, color: 'var(--naranja)', onClick: () => setFiltro('estatus', 'activo'), activa: valoresFiltro.estatus === 'activo' },
          { label: 'Dados de baja', valor: docentes.length - activos, color: 'var(--dorado)', onClick: () => setFiltro('estatus', 'baja'), activa: valoresFiltro.estatus === 'baja' },
        ].map(s => (
          <div key={s.label}
            className={`card stat-card-clicable ${s.activa ? 'activa' : ''}`}
            style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}
            onClick={s.onClick}
            title="Clic para filtrar la tabla">
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {passwordGenerada && (
        <div style={{
          background: '#fefce8', border: '1px solid #fde047',
          padding: '10px 16px', borderRadius: '6px',
          fontSize: '13px', color: '#854d0e', marginBottom: '1rem'
        }}>
          <strong>Comparte esto con el docente — </strong>{passwordGenerada}
          <br /><span style={{ fontSize: '11px' }}>El docente deberá cambiarla en su primer ingreso.</span>
        </div>
      )}
      {error && <div className="alerta-error">{error}</div>}

      {/* Formulario */}
      {mostrarForm && (
        <div className="card" style={{ borderTop: '3px solid var(--naranja)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
            Nuevo docente asesor
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {[
                { key: 'nombre', label: 'Nombre(s) *' },
                { key: 'apellido_p', label: 'Apellido paterno *' },
                { key: 'apellido_m', label: 'Apellido materno' },
                { key: 'programa_educativo', label: 'Programa educativo' },
                { key: 'correo', label: 'Correo institucional *' },
              ].map(({ key, label }) => (
                <div key={key} className="form-campo"
                  style={key === 'correo' || key === 'programa_educativo' ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    required={label.includes('*')}
                    placeholder={key === 'correo' ? 'docente@utcadereyta.edu.mx' : ''}
                  />
                </div>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '10px' }}>
              La contraseña inicial se generará automáticamente como: apellido paterno + 123
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario" onClick={() => setMostrarForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primario">Guardar docente</button>
            </div>
          </form>
        </div>
      )}

      {/* Búsqueda y filtros */}
      {docentes.length > 0 && (
        <BarraFiltros
          query={query} onQuery={setQuery}
          placeholder="Buscar por nombre, correo o programa..."
          filtros={definicionFiltros}
          valoresFiltro={valoresFiltro} onFiltro={setFiltro}
          onLimpiar={limpiarFiltros} hayFiltrosActivos={hayFiltrosActivos}
          total={total} totalFiltrado={totalFiltrado}
        />
      )}

      {/* Tabla */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
        ) : docentes.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            No hay docentes registrados aún.
          </p>
        ) : docentesFiltrados.length === 0 ? (
          <SinResultadosFiltro onLimpiar={limpiarFiltros} />
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  {['Nombre completo', 'Programa', 'Correo', 'Alumnos asignados', 'Estatus', 'Acciones'].map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docentesFiltrados.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: '500' }}>{d.nombre} {d.apellido_p} {d.apellido_m}</td>
                    <td>{d.programa_educativo || '—'}</td>
                    <td style={{ color: 'var(--texto-muted)' }}>{d.correo}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: d.estudiantes_asignados > 0 ? '#dbeafe' : '#f3f4f6',
                        color: d.estudiantes_asignados > 0 ? '#1e40af' : '#6b7280',
                        padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '500'
                      }}>
                        {d.estudiantes_asignados}
                      </span>
                    </td>
                    <td>
                      <span className={d.estatus ? 'badge-activo' : 'badge-baja'}>
                        {d.estatus ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    <td>
                      {d.estatus ? (
                        <button className="btn-peligro" onClick={() => handleBaja(d.id)}>
                          Dar de baja
                        </button>
                      ) : '—'}
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