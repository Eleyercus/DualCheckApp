import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useFiltro } from '../../hooks/useFiltro'
import BarraFiltros, { SinResultadosFiltro } from '../../components/BarraFiltros'
import TablaDatos from '../../components/TablaDatos'

const ESTATUS_ASIGNACION = { activa: 'Activa', concluida: 'Concluida', cancelada: 'Cancelada' }

const TABS = ['datos', 'requisitos', 'empresa']
const TAB_LABELS = { datos: 'Datos personales', requisitos: 'Requisitos', empresa: 'Datos de estadía' }

const REQUISITOS = [
  { key: 'req_datos_estadia', label: 'Datos de Estadía' },
  { key: 'req_carta_no_adeudo', label: 'Carta de No Adeudo o Convenio de Pago' },
  { key: 'req_carta_servicios', label: 'Carta de Servicios Escolares' },
]

const BADGE_ESTATUS = {
  activo: { label: 'Activo', clase: 'badge-activo' },
  baja: { label: 'Baja', clase: 'badge-baja' },
  baja_reprobacion: { label: 'Baja Reprobación', clase: 'badge-baja' },
  reincorporado: { label: 'Reincorporado', clase: 'badge-activo' },
}

const FORM_INICIAL = {
  matricula: '', nombre: '', apellido_p: '', apellido_m: '',
  grupo: '', generacion: '', abrev_carrera: '', carrera: '',
  programa: '', telefono_celular: '', telefono_casa: '',
  direccion: '', colonia: '', cp: '', sexo: '', correo_personal: '',
  req_datos_estadia: false, req_carta_no_adeudo: false, req_carta_servicitos: false,
  nombre_estadia: '', nombre_empresa: '', rfc: '', nombre_responsable: '',
  puesto_responsable: '', emp_direccion: '', emp_colonia: '', emp_cp: '',
  emp_telefono: '', emp_correo: '', giro: '', tamano: '', regimen_juridico: ''
}

// ─── Componente Detalle (separado para poder usar hooks) ────────────────────
function DetalleEstudiante({ estudiante: e, onVolver, onActualizarRequisitos, onBaja, onCambiarEstatus, mensaje, error }) {
  const [estatusLocal, setEstatusLocal] = useState(e.estatus_especial || 'activo')
  const [reqLocal, setReqLocal] = useState({
    req_datos_estadia: !!e.req_datos_estadia,
    req_carta_no_adeudo: !!e.req_carta_no_adeudo,
    req_carta_servicios: !!e.req_carta_servicios,
  })

  const toggleReq = (key) => setReqLocal(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <button onClick={onVolver}
          style={{ background: 'none', border: 'none', color: 'var(--verde)', cursor: 'pointer', fontSize: '13px' }}>
          ← Volver
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
          {e.nombre} {e.apellido_p} {e.apellido_m}
        </h2>
        <span className={BADGE_ESTATUS[e.estatus_especial]?.clase || 'badge-activo'}>
          {BADGE_ESTATUS[e.estatus_especial]?.label || 'Activo'}
        </span>
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Datos personales */}
        <div className="card">
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '12px' }}>
            Datos personales
          </h3>
          {[
            ['Matrícula', e.matricula],
            ['Correo personal', e.correo_personal || e.correo],
            ['Carrera', e.carrera || '—'],
            ['Grupo', e.grupo || '—'],
            ['Generación', e.generacion || '—'],
            ['Tel. celular', e.telefono_celular || '—'],
            ['Tel. casa', e.telefono_casa || '—'],
            ['Dirección', e.direccion ? `${e.direccion}, ${e.colonia}, C.P. ${e.cp}` : '—'],
            ['Sexo', e.sexo === 'M' ? 'Masculino' : e.sexo === 'F' ? 'Femenino' : '—'],
          ].map(([label, valor]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid #f3f4f6' }}>
              <span style={{ fontSize: '12px', color: 'var(--texto-muted)' }}>{label}</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--texto)', textAlign: 'right', maxWidth: '60%' }}>{valor}</span>
            </div>
          ))}
        </div>

        {/* Requisitos */}
        <div className="card">
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '12px' }}>
            Requisitos para asignación
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REQUISITOS.map(({ key, label }) => (
              <div key={key} onClick={() => toggleReq(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${reqLocal[key] ? 'var(--verde)' : 'var(--borde)'}`,
                  background: reqLocal[key] ? '#f0fdf4' : '#fff', transition: 'all .15s'
                }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                  background: reqLocal[key] ? 'var(--verde)' : '#fff',
                  border: `2px solid ${reqLocal[key] ? 'var(--verde)' : 'var(--borde)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {reqLocal[key] && <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>}
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '500', color: reqLocal[key] ? 'var(--verde-oscuro)' : 'var(--texto)' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '1px' }}>
                    {reqLocal[key] ? 'Entregado' : 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primario" style={{ width: '100%', marginTop: '12px' }}
            onClick={() => onActualizarRequisitos(e.id, reqLocal)}>
            Guardar requisitos
          </button>
        </div>

        {/* Datos empresa */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '12px' }}>
            Datos de la empresa / estadía
          </h3>
          {e.nombre_empresa ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                ['Nombre estadía', e.nombre_estadia],
                ['Empresa', e.nombre_empresa],
                ['RFC', e.rfc],
                ['Responsable', e.nombre_responsable],
                ['Puesto', e.puesto_responsable],
                ['Giro', e.giro],
                ['Tamaño', e.tamano],
                ['Régimen', e.regimen_juridico],
                ['Tel. empresa', e.emp_telefono],
                ['Correo empresa', e.emp_correo],
              ].filter(([, valor]) => valor).map(([label, valor]) => (
                <div key={label} style={{ padding: '6px 0' }}>
                  <div style={{ fontSize: '10px', color: 'var(--texto-muted)' }}>{label}</div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{valor}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--texto-muted)' }}>
              No hay datos de empresa registrados aún.
            </p>
          )}
        </div>

        {/* Estatus: las bajas quitan el acceso y cancelan la asignación; reincorporar lo restaura */}
        <div className="card" style={{ gridColumn: '1 / -1', borderTop: '3px solid var(--dorado)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '10px' }}>
            Estatus del estudiante
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select className="filtro-select" value={estatusLocal} onChange={ev => setEstatusLocal(ev.target.value)}
              aria-label="Estatus del estudiante">
              {Object.entries(BADGE_ESTATUS).map(([valor, { label }]) => (
                <option key={valor} value={valor}>{label}</option>
              ))}
            </select>
            <button className="btn-secundario" style={{ fontSize: '12px' }}
              disabled={estatusLocal === (e.estatus_especial || 'activo')}
              onClick={() => onCambiarEstatus(e.id, estatusLocal)}>
              Guardar estatus
            </button>
            {e.estatus ? (
              <button className="btn-peligro" onClick={() => onBaja(e.id)}>
                Dar de baja al estudiante
              </button>
            ) : null}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '8px' }}>
            Baja y Baja por reprobación quitan el acceso y cancelan su asignación activa. Activo y Reincorporado restauran el acceso; el reincorporado queda pendiente de asignar asesor.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function Estudiantes({ periodoInicial = 'activo' }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [periodoVista, setPeriodoVista] = useState(String(periodoInicial))
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [vista, setVista] = useState('lista')
  const [tabForm, setTabForm] = useState('datos')
  const [estudianteDetalle, setEstudianteDetalle] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [form, setForm] = useState({ ...FORM_INICIAL })

  useEffect(() => {
    api.get('/periodos').then(res => setPeriodos(res.data)).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [periodoVista])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/estudiantes', { params: { periodo: periodoVista } })
      setEstudiantes(res.data)
    } catch { setError('Error cargando estudiantes') }
    finally { setCargando(false) }
  }

  const periodoActivo = periodos.find(p => p.activo)
  const periodoConsultado = periodos.find(p => String(p.id) === periodoVista)
  const esPeriodoAnterior = !!periodoConsultado && !periodoConsultado.activo

  const handleDescargarPlantilla = async () => {
    limpiar()
    try {
      const res = await api.get('/estudiantes/plantilla', { responseType: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(res.data)
      link.download = 'plantilla_carga_estudiantes.xlsx'
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { setError('Error descargando la plantilla') }
  }

  const limpiar = () => { setMensaje(''); setError('') }

  const resetForm = () => { setForm({ ...FORM_INICIAL }); setTabForm('datos') }

  // Paso 1 del alta: obligatorios y formato del correo antes de avanzar
  const validarDatosPersonales = () => {
    const faltan = [['matricula', 'Matrícula'], ['correo_personal', 'Correo personal'], ['nombre', 'Nombre(s)'], ['apellido_p', 'Apellido paterno']]
      .filter(([k]) => !String(form[k] || '').trim()).map(([, label]) => label)
    if (faltan.length > 0) { setError(`Completa los campos obligatorios: ${faltan.join(', ')}`); return false }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo_personal.trim())) { setError('El correo personal no tiene un formato válido'); return false }
    setError('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiar()
    try {
      await api.post('/estudiantes', form)
      setMensaje('Estudiante registrado correctamente')
      resetForm()
      setVista('lista')
      cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar')
      document.getElementById('encabezado-nuevo-estudiante')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleCargaMasiva = async () => {
    if (!archivo) return setError('Selecciona un archivo primero')
    limpiar(); setCargandoArchivo(true)
    try {
      const fd = new FormData(); fd.append('archivo', archivo)
      const res = await api.post('/estudiantes/carga-masiva', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMensaje(res.data.mensaje)
      if (res.data.errores?.length > 0)
        setError(`Errores: ${res.data.errores.map(e => `Fila ${e.fila}: ${e.mensaje}`).join(' | ')}`)
      setArchivo(null); cargar()
    } catch (err) { setError(err.response?.data?.error || 'Error procesando el archivo') }
    finally { setCargandoArchivo(false) }
  }

  const handleActualizarRequisitos = async (id, reqs) => {
    limpiar()
    try {
      await api.patch(`/estudiantes/${id}/requisitos`, reqs)
      setMensaje('Requisitos actualizados correctamente')
      cargar()
    } catch { setError('Error actualizando requisitos') }
  }

  const handleBaja = async (id) => {
    if (!confirm('¿Confirmas dar de baja a este estudiante?')) return
    limpiar()
    try {
      await api.patch(`/estudiantes/${id}/baja`)
      setMensaje('Estudiante dado de baja')
      cargar()
      setEstudianteDetalle(null)
      setVista('lista')
    } catch { setError('Error al dar de baja') }
  }

  const handleCambiarEstatus = async (id, estatus) => {
    if ((estatus === 'baja' || estatus === 'baja_reprobacion') &&
      !confirm('El estudiante perderá el acceso y se cancelará su asignación activa. ¿Continuar?')) return
    limpiar()
    try {
      const res = await api.patch(`/estudiantes/${id}/estatus-especial`, { estatus_especial: estatus })
      await abrirDetalle(id)
      setMensaje(res.data.mensaje)
      cargar()
    } catch (err) { setError(err.response?.data?.error || 'Error al actualizar el estatus') }
  }

  const abrirDetalle = async (id) => {
    try {
      const res = await api.get(`/estudiantes/${id}`)
      setEstudianteDetalle(res.data)
      setVista('detalle')
      limpiar()
    } catch { setError('Error cargando detalle') }
  }

  const cumpleRequisitos = (e) => e.req_datos_estadia && e.req_carta_no_adeudo && e.req_carta_servicios
  const activos = estudiantes.filter(e => e.estatus && ['activo', 'reincorporado'].includes(e.estatus_especial)).length
  const sinRequisitos = estudiantes.filter(e => e.estatus && !cumpleRequisitos(e)).length

  // ── Búsqueda y filtros de la tabla ──────────────────────────────────────
  const carrerasUnicas = Array.from(new Set(
    estudiantes.map(e => e.carrera || e.programa).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es'))
  const gruposUnicos = Array.from(new Set(
    estudiantes.map(e => e.grupo).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'es'))

  const {
    query, setQuery, valoresFiltro, setFiltro, limpiar: limpiarFiltros,
    resultado: estudiantesFiltrados, hayFiltrosActivos, total, totalFiltrado
  } = useFiltro(estudiantes, {
    buscarEn: e => `${e.matricula} ${e.nombre} ${e.apellido_p} ${e.apellido_m} ${e.correo_personal || e.correo || ''} ${e.carrera || e.programa || ''} ${e.grupo || ''} ${e.asesor || ''}`,
    filtros: {
      carrera: (e, v) => (e.carrera || e.programa) === v,
      grupo: (e, v) => e.grupo === v,
      estatus: (e, v) => (e.estatus_especial || 'activo') === v,
      requisitos: (e, v) => v === 'completos' ? cumpleRequisitos(e) : !cumpleRequisitos(e),
    }
  })

  const definicionFiltros = [
    { clave: 'carrera', label: 'Carrera', opciones: carrerasUnicas.map(c => ({ value: c, label: c })) },
    { clave: 'grupo', label: 'Grupo', opciones: gruposUnicos.map(g => ({ value: g, label: g })) },
    {
      clave: 'estatus', label: 'Estatus', opciones: [
        { value: 'activo', label: 'Activo' },
        { value: 'baja', label: 'Baja' },
        { value: 'baja_reprobacion', label: 'Baja por reprobación' },
        { value: 'reincorporado', label: 'Reincorporado' },
      ]
    },
    {
      clave: 'requisitos', label: 'Requisitos', opciones: [
        { value: 'completos', label: 'Completos' },
        { value: 'incompletos', label: 'Incompletos' },
      ]
    },
  ]

  // ── Vista: detalle ────────────────────────────────────────────────────────
  if (vista === 'detalle' && estudianteDetalle) {
    return (
      <DetalleEstudiante
        estudiante={estudianteDetalle}
        mensaje={mensaje}
        error={error}
        onVolver={() => { setVista('lista'); setEstudianteDetalle(null); limpiar() }}
        onActualizarRequisitos={handleActualizarRequisitos}
        onBaja={handleBaja}
        onCambiarEstatus={handleCambiarEstatus}
      />
    )
  }

  // ── Vista: nuevo estudiante ───────────────────────────────────────────────
  if (vista === 'nuevo') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
        <button onClick={() => { setVista('lista'); resetForm(); limpiar() }}
          style={{ background: 'none', border: 'none', color: 'var(--verde)', cursor: 'pointer', fontSize: '13px' }}>
          ← Volver
        </button>
        <h2 id="encabezado-nuevo-estudiante" style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
          Registrar nuevo estudiante
        </h2>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '1.25rem', borderBottom: '2px solid var(--borde)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setTabForm(tab)} style={{
            padding: '8px 20px', background: 'none', border: 'none',
            borderBottom: tabForm === tab ? '2px solid var(--naranja)' : '2px solid transparent',
            color: tabForm === tab ? 'var(--naranja)' : 'var(--texto-muted)',
            fontWeight: tabForm === tab ? '600' : '400',
            fontSize: '13px', cursor: 'pointer', marginBottom: '-2px'
          }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* Tab: Datos personales */}
        {tabForm === 'datos' && (
          <div className="card">
            <div className="form-grid">
              {[
                { key: 'matricula', label: 'Matrícula *', req: true },
                { key: 'correo_personal', label: 'Correo personal *', req: true },
                { key: 'nombre', label: 'Nombre(s) *', req: true },
                { key: 'apellido_p', label: 'Apellido paterno *', req: true },
                { key: 'apellido_m', label: 'Apellido materno' },
                { key: 'grupo', label: 'Grupo' },
                { key: 'generacion', label: 'Generación' },
                { key: 'abrev_carrera', label: 'Abrev. carrera' },
                { key: 'carrera', label: 'Carrera', full: true },
                { key: 'programa', label: 'Programa educativo', full: true },
                { key: 'telefono_celular', label: 'Tel. celular' },
                { key: 'telefono_casa', label: 'Tel. casa' },
                { key: 'direccion', label: 'Dirección', full: true },
                { key: 'colonia', label: 'Colonia' },
                { key: 'cp', label: 'C.P.' },
              ].map(({ key, label, req, full }) => (
                <div key={key} className="form-campo" style={full ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={key === 'correo_personal' ? 'alumno@gmail.com' : ''}
                    required={!!req} />
                </div>
              ))}
              <div className="form-campo">
                <label className="form-label">Sexo</label>
                <select className="form-input" value={form.sexo}
                  onChange={e => setForm({ ...form, sexo: e.target.value })}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn-primario" onClick={() => validarDatosPersonales() && setTabForm('requisitos')}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Tab: Requisitos */}
        {tabForm === 'requisitos' && (
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--texto-muted)', marginBottom: '1.25rem' }}>
              Los 3 requisitos deben estar completos para poder asignar asesor al estudiante.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {REQUISITOS.map(({ key, label }) => (
                <div key={key} onClick={() => setForm({ ...form, [key]: !form[key] })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 16px', borderRadius: '8px', cursor: 'pointer',
                    border: `1.5px solid ${form[key] ? 'var(--verde)' : 'var(--borde)'}`,
                    background: form[key] ? '#f0fdf4' : '#fff', transition: 'all .15s'
                  }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: form[key] ? 'var(--verde)' : '#fff',
                    border: `2px solid ${form[key] ? 'var(--verde)' : 'var(--borde)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {form[key] && <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: form[key] ? 'var(--verde-oscuro)' : 'var(--texto)' }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>
                      {form[key] ? 'Entregado' : 'Pendiente'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {(!form.req_datos_estadia || !form.req_carta_no_adeudo || !form.req_carta_servicios) ? (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', padding: '10px 14px', marginTop: '1rem' }}>
                <p style={{ fontSize: '12px', color: '#9a3412' }}>
                  ⚠ El estudiante se registrará pero no podrá ser asignado a un asesor hasta completar los 3 requisitos.
                </p>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '10px 14px', marginTop: '1rem' }}>
                <p style={{ fontSize: '12px', color: '#166534' }}>
                  ✓ Requisitos completos. El estudiante podrá ser asignado a un asesor.
                </p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario" onClick={() => setTabForm('datos')}>← Anterior</button>
              <button type="button" className="btn-primario" onClick={() => setTabForm('empresa')}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* Tab: Datos de estadía */}
        {tabForm === 'empresa' && (
          <div className="card">
            <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginBottom: '1rem' }}>
              Opcional — se puede completar después cuando el alumno proporcione los datos de su empresa.
            </p>
            <div className="form-grid">
              {[
                { key: 'nombre_estadia', label: 'Nombre de la estadía', full: true },
                { key: 'nombre_empresa', label: 'Nombre de la empresa', full: true },
                { key: 'rfc', label: 'RFC de la empresa' },
                { key: 'nombre_responsable', label: 'Nombre del responsable' },
                { key: 'puesto_responsable', label: 'Puesto del responsable' },
                { key: 'giro', label: 'Giro' },
                { key: 'tamano', label: 'Tamaño' },
                { key: 'regimen_juridico', label: 'Régimen jurídico' },
                { key: 'emp_direccion', label: 'Dirección empresa', full: true },
                { key: 'emp_colonia', label: 'Colonia' },
                { key: 'emp_cp', label: 'C.P.' },
                { key: 'emp_telefono', label: 'Teléfono' },
                { key: 'emp_correo', label: 'Correo empresa' },
              ].map(({ key, label, full }) => (
                <div key={key} className="form-campo" style={full ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario" onClick={() => setTabForm('requisitos')}>← Anterior</button>
              <button type="submit" className="btn-primario">Guardar estudiante</button>
            </div>
          </div>
        )}
      </form>
    </div>
  )

  // ── Vista: lista ──────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            Gestión de estudiantes
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            Registro y administración de alumnos en estadía
          </p>
        </div>
        {!esPeriodoAnterior && (
          <button className="btn-primario" onClick={() => { setVista('nuevo'); limpiar() }}>
            + Nuevo estudiante
          </button>
        )}
      </div>

      {/* Periodo consultado: por defecto solo los estudiantes del periodo activo */}
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '10px 16px',
        borderLeft: `4px solid ${esPeriodoAnterior ? 'var(--dorado)' : 'var(--verde)'}`, borderRadius: '0 8px 8px 0'
      }}>
        <label htmlFor="periodo-vista" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>
          Mostrando:
        </label>
        <select id="periodo-vista" className="filtro-select" value={periodoVista}
          onChange={e => { setPeriodoVista(e.target.value); limpiar() }}>
          <option value="activo">
            {periodoActivo ? `Periodo activo — ${periodoActivo.nombre}` : 'Periodo activo (no hay ninguno)'}
          </option>
          {periodos.filter(p => !p.activo).map(p => (
            <option key={p.id} value={p.id}>Periodo anterior — {p.nombre}</option>
          ))}
          <option value="todos">Todos los registros</option>
        </select>
        <span style={{ fontSize: '12px', color: 'var(--texto-muted)' }}>
          {periodoVista === 'activo'
            ? 'Estudiantes con asignación en el periodo activo y pendientes de asignar.'
            : periodoVista === 'todos'
              ? 'Todos los estudiantes registrados en el sistema, de cualquier periodo.'
              : 'Consulta histórica: estudiantes que tuvieron asignación en este periodo.'}
        </span>
      </div>

      {/* Estadísticas — también funcionan como accesos rápidos de filtro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total en la vista', valor: estudiantes.length, color: 'var(--verde)', onClick: limpiarFiltros, activa: !hayFiltrosActivos },
          { label: 'Activos', valor: activos, color: 'var(--naranja)', onClick: () => setFiltro('estatus', 'activo'), activa: valoresFiltro.estatus === 'activo' },
          { label: 'Sin requisitos completos', valor: sinRequisitos, color: sinRequisitos > 0 ? '#dc2626' : 'var(--texto-muted)', onClick: () => setFiltro('requisitos', 'incompletos'), activa: valoresFiltro.requisitos === 'incompletos' },
          { label: 'Con baja', valor: estudiantes.filter(e => e.estatus_especial?.includes('baja')).length, color: 'var(--dorado)', onClick: () => setFiltro('estatus', 'baja'), activa: valoresFiltro.estatus === 'baja' },
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
      {error && <div className="alerta-error">{error}</div>}

      {/* Carga masiva */}
      {!esPeriodoAnterior && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '6px' }}>
                Carga masiva desde Excel
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginBottom: '10px' }}>
                Obligatorias: <strong>Matrícula, Apellido Paterno, Nombre(s) y Correo Personal</strong>. Requisitos: escribe "Sí" o "X" si ya se entregó.
              </p>
            </div>
            <button type="button" className="btn-secundario" style={{ fontSize: '12px' }} onClick={handleDescargarPlantilla}>
              <i className="ti ti-download" aria-hidden="true" /> Descargar plantilla
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input type="file" accept=".xlsx,.csv"
              onChange={e => setArchivo(e.target.files[0])}
              style={{ fontSize: '12px', color: 'var(--texto-muted)' }} />
            <button className="btn-secundario" onClick={handleCargaMasiva} disabled={cargandoArchivo}>
              {cargandoArchivo ? 'Procesando...' : 'Cargar archivo'}
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda y filtros */}
      {estudiantes.length > 0 && (
        <BarraFiltros
          query={query} onQuery={setQuery}
          placeholder="Buscar por nombre, matrícula, correo, carrera o grupo..."
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
        ) : estudiantes.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            {periodoVista === 'todos'
              ? 'No hay estudiantes registrados aún.'
              : 'No hay estudiantes en este periodo. Usa "Todos los registros" para ver a los de otros periodos.'}
          </p>
        ) : estudiantesFiltrados.length === 0 ? (
          <SinResultadosFiltro onLimpiar={limpiarFiltros} />
        ) : (
          <TablaDatos
            filas={estudiantesFiltrados}
            claveFila={e => e.id}
            ordenInicial={{ clave: 'nombre', dir: 'asc' }}
            columnas={[
              { clave: 'matricula', titulo: 'Matrícula', ordenable: true, estilo: { fontWeight: '500' } },
              {
                clave: 'nombre', titulo: 'Nombre', ordenable: true,
                valor: e => `${e.apellido_p} ${e.apellido_m || ''} ${e.nombre}`,
                render: e => `${e.apellido_p} ${e.apellido_m || ''}, ${e.nombre}`,
              },
              { clave: 'carrera', titulo: 'Carrera', ordenable: true, valor: e => e.carrera || e.programa || '', render: e => e.carrera || e.programa || '—' },
              { clave: 'grupo', titulo: 'Grupo', ordenable: true, render: e => e.grupo || '—' },
              {
                clave: 'asesor', titulo: 'Asesor', ordenable: true, valor: e => e.asesor || '',
                render: e => e.asesor ? (
                  <span>
                    {e.asesor}
                    {e.asignacion_estatus !== 'activa' && (
                      <span style={{ fontSize: '11px', color: 'var(--texto-muted)' }}> ({ESTATUS_ASIGNACION[e.asignacion_estatus]?.toLowerCase()})</span>
                    )}
                  </span>
                ) : <span style={{ color: 'var(--texto-muted)' }}>Sin asesor</span>,
              },
              {
                clave: 'requisitos', titulo: 'Requisitos', ordenable: true,
                valor: e => [e.req_datos_estadia, e.req_carta_no_adeudo, e.req_carta_servicios].filter(Boolean).length,
                render: e => {
                  const reqs = [e.req_datos_estadia, e.req_carta_no_adeudo, e.req_carta_servicios]
                  const completados = reqs.filter(Boolean).length
                  return (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {reqs.map((r, i) => (
                        <div key={i} style={{
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: r ? 'var(--verde)' : '#e5e7eb'
                        }} title={REQUISITOS[i]?.label} />
                      ))}
                      <span style={{ fontSize: '11px', color: completados === 3 ? 'var(--verde)' : '#dc2626', marginLeft: '4px', fontWeight: '500' }}>
                        {completados}/3
                      </span>
                    </div>
                  )
                },
              },
              {
                clave: 'estatus', titulo: 'Estatus', ordenable: true,
                valor: e => BADGE_ESTATUS[e.estatus_especial]?.label || 'Activo',
                render: e => (
                  <span className={BADGE_ESTATUS[e.estatus_especial]?.clase || 'badge-activo'}>
                    {BADGE_ESTATUS[e.estatus_especial]?.label || 'Activo'}
                  </span>
                ),
              },
              {
                clave: 'acciones', titulo: 'Acciones',
                render: e => (
                  <button onClick={() => abrirDetalle(e.id)} style={{
                    padding: '4px 12px', background: 'transparent',
                    border: '1px solid var(--verde)', borderRadius: '4px',
                    color: 'var(--verde)', fontSize: '12px', cursor: 'pointer'
                  }}>
                    Ver detalle
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}