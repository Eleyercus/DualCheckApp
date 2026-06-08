import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [archivo, setArchivo] = useState(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [form, setForm] = useState({
    matricula: '', nombre: '', apellido_p: '',
    apellido_m: '', grupo: '', programa: '', correo: ''
  })

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await api.get('/estudiantes')
      setEstudiantes(res.data)
    } catch { setError('Error cargando estudiantes') }
    finally { setCargando(false) }
  }

  const limpiarAlertas = () => { setMensaje(''); setError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); limpiarAlertas()
    try {
      await api.post('/estudiantes', form)
      setMensaje('Estudiante registrado correctamente')
      setForm({ matricula: '', nombre: '', apellido_p: '', apellido_m: '', grupo: '', programa: '', correo: '' })
      setMostrarForm(false)
      cargar()
    } catch (err) { setError(err.response?.data?.error || 'Error al registrar') }
  }

  const handleCargaMasiva = async () => {
    if (!archivo) return setError('Selecciona un archivo primero')
    limpiarAlertas(); setCargandoArchivo(true)
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

  const handleBaja = async (id) => {
    if (!confirm('¿Confirmas dar de baja a este estudiante?')) return
    limpiarAlertas()
    try {
      await api.patch(`/estudiantes/${id}/baja`)
      setMensaje('Estudiante dado de baja correctamente')
      cargar()
    } catch { setError('Error al dar de baja') }
  }

  const activos = estudiantes.filter(e => e.estatus).length
  const bajas = estudiantes.filter(e => !e.estatus).length

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
            Gestión de estudiantes
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
            Registro y administración de alumnos en estadía
          </p>
        </div>
        <button className="btn-primario" onClick={() => { setMostrarForm(!mostrarForm); limpiarAlertas() }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo estudiante'}
        </button>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total registrados', valor: estudiantes.length, color: 'var(--verde)' },
          { label: 'Activos', valor: activos, color: 'var(--naranja)' },
          { label: 'Dados de baja', valor: bajas, color: 'var(--dorado)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && <div className="alerta-exito">{mensaje}</div>}
      {error && <div className="alerta-error">{error}</div>}

      {/* Formulario */}
      {mostrarForm && (
        <div className="card" style={{ borderTop: '3px solid var(--naranja)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
            Nuevo estudiante
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {[
                { key: 'matricula', label: 'Matrícula *' },
                { key: 'nombre', label: 'Nombre(s) *' },
                { key: 'apellido_p', label: 'Apellido paterno *' },
                { key: 'apellido_m', label: 'Apellido materno' },
                { key: 'grupo', label: 'Grupo' },
                { key: 'programa', label: 'Programa educativo' },
                { key: 'correo', label: 'Correo institucional *' },
              ].map(({ key, label }) => (
                <div key={key} className="form-campo" style={key === 'correo' ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{label}</label>
                  <input
                    className="form-input"
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    required={label.includes('*')}
                    placeholder={key === 'correo' ? 'alumno@utcadereyta.edu.mx' : ''}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
              <button type="button" className="btn-secundario" onClick={() => setMostrarForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primario">Guardar estudiante</button>
            </div>
          </form>
        </div>
      )}

      {/* Carga masiva */}
      <div className="card">
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '6px' }}>
          Carga masiva desde Excel
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginBottom: '10px' }}>
          Columnas requeridas: <strong>Matricula, Nombre, Apellido P, Apellido M, Grupo, Programa, Correo</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.csv"
            onChange={e => setArchivo(e.target.files[0])}
            style={{ fontSize: '12px', color: 'var(--texto-muted)' }}
          />
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
                  {['Matrícula', 'Nombre completo', 'Grupo', 'Programa', 'Correo', 'Estatus', 'Acciones'].map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estudiantes.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: '500' }}>{e.matricula}</td>
                    <td>{e.nombre} {e.apellido_p} {e.apellido_m}</td>
                    <td>{e.grupo || '—'}</td>
                    <td>{e.programa || '—'}</td>
                    <td style={{ color: 'var(--texto-muted)' }}>{e.correo}</td>
                    <td>
                      <span className={e.estatus ? 'badge-activo' : 'badge-baja'}>
                        {e.estatus ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                    <td>
                      {e.estatus ? (
                        <button className="btn-peligro" onClick={() => handleBaja(e.id)}>
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