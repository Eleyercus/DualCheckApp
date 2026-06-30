import { useState, useEffect } from 'react'
import api from '../../services/api'

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
function DetalleEstudiante({ estudiante: e, onVolver, onActualizarRequisitos, onBaja, mensaje, error }) {
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

        {/* Zona de riesgo */}
        {e.estatus ? (
          <div className="card" style={{ gridColumn: '1 / -1', borderTop: '3px solid #dc2626' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '10px' }}>
              Zona de riesgo
            </h3>
            <button className="btn-peligro" onClick={() => onBaja(e.id)}>
              Dar de baja al estudiante
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [vista, setVista] = useState('lista')
  const [tabForm, setTabForm] = useState('datos')
  const [estudianteDetalle, setEstudianteDetalle] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [form, setForm] = useState({ ...FORM_INICIAL })

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/estudiantes')
      setEstudiantes(res.data)
    } catch { setError('Error cargando estudiantes') }
    finally { setCargando(false) }
  }

  const limpiar = () => { setMensaje(''); setError('') }

  const resetForm = () => { setForm({ ...FORM_INICIAL }); setTabForm('datos') }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiar()
    try {
      await api.post('/estudiantes', form)
      setMensaje('Estudiante registrado correctamente')
      resetForm()
      setVista('lista')
      cargar()
    } catch (err) { setError(err.response?.data?.error || 'Error al registrar') }
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
    } catch { setError('Error procesando el archivo') }
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

  const abrirDetalle = async (id) => {
    try {
      const res = await api.get(`/estudiantes/${id}`)
      setEstudianteDetalle(res.data)
      setVista('detalle')
      limpiar()
    } catch { setError('Error cargando detalle') }
  }

  const cumpleRequisitos = (e) => e.req_datos_estadia && e.req_carta_no_adeudo && e.req_carta_servicios
  const activos = estudiantes.filter(e => e.estatus && e.estatus_especial === 'activo').length
  const sinRequisitos = estudiantes.filter(e => e.estatus && !cumpleRequisitos(e)).length

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
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
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
              <button type="button" className="btn-primario" onClick={() => setTabForm('requisitos')}>
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
        <button className="btn-primario" onClick={() => { setVista('nuevo'); limpiar() }}>
          + Nuevo estudiante
        </button>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total registrados', valor: estudiantes.length, color: 'var(--verde)' },
          { label: 'Activos', valor: activos, color: 'var(--naranja)' },
          { label: 'Sin requisitos completos', valor: sinRequisitos, color: sinRequisitos > 0 ? '#dc2626' : 'var(--texto-muted)' },
          { label: 'Con baja', valor: estudiantes.filter(e => e.estatus_especial?.includes('baja')).length, color: 'var(--dorado)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {/* Carga masiva */}
      <div className="card">
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '6px' }}>
          Carga masiva desde Excel
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginBottom: '10px' }}>
          Columnas: <strong>Matrícula, Nombre, Apellido P, Apellido M, Correo Personal, Grupo, GEN, Abrev. carrera, Carrera, Tel. Celular, Datos Estadías, Carta N/A o Convenio, Carta Servicios Escolares</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.csv"
            onChange={e => setArchivo(e.target.files[0])}
            style={{ fontSize: '12px', color: 'var(--texto-muted)' }} />
          <button className="btn-secundario" onClick={handleCargaMasiva} disabled={cargandoArchivo}>
            {cargandoArchivo ? 'Procesando...' : 'Cargar archivo'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {cargando ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>Cargando...</p>
        ) : estudiantes.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--texto-muted)' }}>
            No hay estudiantes registrados aún.
          </p>
        ) : (
          <div className="tabla-wrapper">
            <table className="tabla">
              <thead>
                <tr>
                  {['Matrícula', 'Nombre', 'Carrera', 'Grupo', 'Requisitos', 'Estatus', 'Acciones'].map(c => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estudiantes.map(e => {
                  const reqs = [e.req_datos_estadia, e.req_carta_no_adeudo, e.req_carta_servicios]
                  const completados = reqs.filter(Boolean).length
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: '500' }}>{e.matricula}</td>
                      <td>{e.nombre} {e.apellido_p} {e.apellido_m}</td>
                      <td>{e.carrera || e.programa || '—'}</td>
                      <td>{e.grupo || '—'}</td>
                      <td>
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
                      </td>
                      <td>
                        <span className={BADGE_ESTATUS[e.estatus_especial]?.clase || 'badge-activo'}>
                          {BADGE_ESTATUS[e.estatus_especial]?.label || 'Activo'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => abrirDetalle(e.id)} style={{
                          padding: '4px 12px', background: 'transparent',
                          border: '1px solid var(--verde)', borderRadius: '4px',
                          color: 'var(--verde)', fontSize: '12px', cursor: 'pointer'
                        }}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}