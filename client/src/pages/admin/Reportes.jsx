import { useState, useEffect } from 'react'
import api from '../../services/api'

const TIPOS = [
  { key: 'periodo', label: 'Reporte general del periodo', icon: '📊', desc: 'Todos los estudiantes del periodo con su progreso de asistencia' },
  { key: 'docente', label: 'Reporte por docente', icon: '👨‍🏫', desc: 'Todos los estudiantes asignados a un docente asesor' },
  { key: 'estudiante', label: 'Reporte por estudiante', icon: '🎓', desc: 'Historial completo de asistencia de un estudiante' },
]

export default function Reportes() {
  const [opciones, setOpciones] = useState({ periodos: [], docentes: [], estudiantes: [] })
  const [cargando, setCargando] = useState(true)
  const [tipo, setTipo] = useState('periodo')
  const [form, setForm] = useState({ id_periodo: '', id_docente: '', id_estudiante: '' })
  const [generando, setGenerando] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { cargarOpciones() }, [])

  const cargarOpciones = async () => {
    try {
      const res = await api.get('/reportes/opciones')
      setOpciones(res.data)
      if (res.data.periodos.length > 0) {
        setForm(f => ({ ...f, id_periodo: res.data.periodos[0].id }))
      }
    } catch { setError('Error cargando opciones') }
    finally { setCargando(false) }
  }

  const descargar = async (formato) => {
    setError('')
    if (!form.id_periodo) return setError('Selecciona un periodo')
    if (tipo === 'docente' && !form.id_docente) return setError('Selecciona un docente')
    if (tipo === 'estudiante' && !form.id_estudiante) return setError('Selecciona un estudiante')

    setGenerando(formato)
    try {
      let url = ''
      if (tipo === 'periodo') url = `/reportes/periodo/${form.id_periodo}/${formato}`
      if (tipo === 'docente') url = `/reportes/docente/${form.id_docente}/periodo/${form.id_periodo}/${formato}`
      if (tipo === 'estudiante') url = `/reportes/estudiante/${form.id_estudiante}/periodo/${form.id_periodo}/${formato}`

      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:3001/api${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const data = await res.json()
        return setError(data.error || 'Error generando el reporte')
      }

      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const ext = formato === 'pdf' ? 'pdf' : 'xlsx'
      const nombre = tipo === 'periodo' ? `reporte_periodo_${form.id_periodo}`
        : tipo === 'docente' ? `reporte_docente_${form.id_docente}`
        : `reporte_estudiante_${form.id_estudiante}`
      link.download = `${nombre}.${ext}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { setError('Error al descargar el reporte') }
    finally { setGenerando(null) }
  }

  if (cargando) return (
    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--texto-muted)' }}>Cargando...</p>
  )

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--verde-oscuro)' }}>
          Módulo de reportes
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--texto-muted)', marginTop: '2px' }}>
          Genera y descarga reportes de asistencia en PDF o Excel
        </p>
      </div>

      {error && <div className="alerta-error">{error}</div>}

      {/* Selector de tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {TIPOS.map(t => (
          <div key={t.key} onClick={() => { setTipo(t.key); setError('') }}
            style={{
              padding: '1rem', borderRadius: '10px', cursor: 'pointer',
              border: `2px solid ${tipo === t.key ? 'var(--naranja)' : 'var(--borde)'}`,
              background: tipo === t.key ? '#fff7ed' : '#fff',
              transition: 'all .15s'
            }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{t.icon}</div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: tipo === t.key ? 'var(--naranja)' : 'var(--verde-oscuro)', marginBottom: '4px' }}>
              {t.label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--texto-muted)' }}>{t.desc}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card">
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '1rem' }}>
          Configurar reporte
        </h3>
        <div className="form-grid">
          {/* Periodo siempre visible */}
          <div className="form-campo">
            <label className="form-label">Periodo *</label>
            <select className="form-input" value={form.id_periodo}
              onChange={e => setForm({ ...form, id_periodo: e.target.value })}>
              <option value="">Selecciona un periodo</option>
              {opciones.periodos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Docente — solo si tipo = docente */}
          {tipo === 'docente' && (
            <div className="form-campo">
              <label className="form-label">Docente *</label>
              <select className="form-input" value={form.id_docente}
                onChange={e => setForm({ ...form, id_docente: e.target.value })}>
                <option value="">Selecciona un docente</option>
                {opciones.docentes.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.nombre} {d.apellido_p} {d.apellido_m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Estudiante — solo si tipo = estudiante */}
          {tipo === 'estudiante' && (
            <div className="form-campo">
              <label className="form-label">Estudiante *</label>
              <select className="form-input" value={form.id_estudiante}
                onChange={e => setForm({ ...form, id_estudiante: e.target.value })}>
                <option value="">Selecciona un estudiante</option>
                {opciones.estudiantes.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.matricula} — {e.nombre} {e.apellido_p} ({e.grupo || 'sin grupo'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Botones de descarga */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn-primario" onClick={() => descargar('pdf')}
            disabled={!!generando}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            {generando === 'pdf' ? 'Generando...' : '⬇ Descargar PDF'}
          </button>
          <button className="btn-secundario" onClick={() => descargar('excel')}
            disabled={!!generando}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            {generando === 'excel' ? 'Generando...' : '⬇ Descargar Excel'}
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--texto-muted)', marginTop: '10px' }}>
          El archivo se descargará automáticamente en tu carpeta de descargas.
        </p>
      </div>

      {/* Info de los tipos */}
      <div className="card" style={{ borderTop: '3px solid var(--dorado)' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--verde-oscuro)', marginBottom: '8px' }}>
          ¿Qué incluye este reporte?
        </h3>
        {tipo === 'periodo' && (
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', lineHeight: 1.6 }}>
            Lista completa de todos los estudiantes del periodo seleccionado con su matrícula, grupo, carrera, docente asesor, número de semanas validadas, porcentaje de progreso y estatus de asignación.
          </p>
        )}
        {tipo === 'docente' && (
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', lineHeight: 1.6 }}>
            Todos los estudiantes asignados al docente seleccionado, con una columna por cada semana mostrando si el docente registró (✓), si está pendiente (·) o sin registro (-), y el total de semanas completadas.
          </p>
        )}
        {tipo === 'estudiante' && (
          <p style={{ fontSize: '12px', color: 'var(--texto-muted)', lineHeight: 1.6 }}>
            Historial completo de las 13 semanas del estudiante seleccionado, mostrando por cada semana si el docente registró y si el estudiante confirmó, con el estado final de cada semana.
          </p>
        )}
      </div>
    </div>
  )
}