const db = require('../config/db')

const getAsignaciones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id, a.fecha_asignacion, a.estatus, a.validada_por_docente,
        e.id AS id_estudiante, e.matricula,
        e.nombre AS est_nombre, e.apellido_p AS est_apellido_p, e.apellido_m AS est_apellido_m,
        e.grupo,
        d.id AS id_docente,
        d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p, d.apellido_m AS doc_apellido_m,
        p.id AS id_periodo, p.nombre AS periodo_nombre
      FROM asignaciones a
      JOIN estudiantes e ON a.id_estudiante = e.id
      JOIN docentes d ON a.id_docente = d.id
      JOIN periodos p ON a.id_periodo = p.id
      ORDER BY a.fecha_asignacion DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Estudiantes sin asesor DENTRO del periodo activo
const getEstudiantesSinAsesor = async (req, res) => {
  try {
    const [periodoActivo] = await db.query('SELECT id FROM periodos WHERE activo = 1 LIMIT 1')
    if (periodoActivo.length === 0) {
      return res.status(400).json({ error: 'No hay un periodo activo configurado' })
    }
    const idPeriodo = periodoActivo[0].id

    const [rows] = await db.query(`
      SELECT e.id, e.matricula, e.nombre, e.apellido_p, e.apellido_m, e.grupo, e.programa
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      WHERE u.estatus = 1
        AND e.id NOT IN (
          SELECT id_estudiante FROM asignaciones 
          WHERE id_periodo = ? AND estatus = 'activa'
        )
      ORDER BY e.apellido_p, e.nombre
    `, [idPeriodo])
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo estudiantes sin asesor:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Docentes con su carga DENTRO del periodo activo
const getDocentesActivos = async (req, res) => {
  try {
    const [periodoActivo] = await db.query('SELECT id FROM periodos WHERE activo = 1 LIMIT 1')
    if (periodoActivo.length === 0) {
      return res.status(400).json({ error: 'No hay un periodo activo configurado' })
    }
    const idPeriodo = periodoActivo[0].id

    const [rows] = await db.query(`
      SELECT d.id, d.nombre, d.apellido_p, d.apellido_m, d.programa_educativo,
             COUNT(a.id) AS estudiantes_asignados
      FROM docentes d
      JOIN usuarios u ON d.id_usuario = u.id
      LEFT JOIN asignaciones a ON a.id_docente = d.id AND a.id_periodo = ? AND a.estatus = 'activa'
      WHERE u.estatus = 1
      GROUP BY d.id
      ORDER BY d.apellido_p, d.nombre
    `, [idPeriodo])
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo docentes activos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const crearAsignacion = async (req, res) => {
  const { id_estudiante, id_docente } = req.body

  if (!id_estudiante || !id_docente) {
    return res.status(400).json({ error: 'Estudiante y docente son requeridos' })
  }

  try {
    const [periodoActivo] = await db.query('SELECT id, nombre FROM periodos WHERE activo = 1 LIMIT 1')
    if (periodoActivo.length === 0) {
      return res.status(400).json({ error: 'No hay un periodo activo. Crea o activa un periodo antes de asignar.' })
    }
    const idPeriodo = periodoActivo[0].id

    const [est] = await db.query(
      'SELECT req_datos_estadia, req_carta_no_adeudo, req_carta_servicios, nombre, apellido_p FROM estudiantes WHERE id = ?',
      [id_estudiante]
    )
    if (est.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

    const { req_datos_estadia, req_carta_no_adeudo, req_carta_servicios, nombre, apellido_p } = est[0]

    if (!req_datos_estadia || !req_carta_no_adeudo || !req_carta_servicios) {
      const faltantes = []
      if (!req_datos_estadia) faltantes.push('Datos de Estadía')
      if (!req_carta_no_adeudo) faltantes.push('Carta de No Adeudo o Convenio de Pago')
      if (!req_carta_servicios) faltantes.push('Carta de Servicios Escolares')
      return res.status(400).json({
        error: `${nombre} ${apellido_p} no puede ser asignado. Faltan: ${faltantes.join(', ')}.`
      })
    }

    // Verificar que no tenga ya una asignación activa EN ESTE periodo
    const [yaAsignado] = await db.query(
      'SELECT id FROM asignaciones WHERE id_estudiante = ? AND id_periodo = ? AND estatus = ?',
      [id_estudiante, idPeriodo, 'activa']
    )
    if (yaAsignado.length > 0) {
      return res.status(400).json({ error: `El estudiante ya tiene un asesor asignado en el periodo ${periodoActivo[0].nombre}` })
    }

    await db.query(
      'INSERT INTO asignaciones (id_estudiante, id_docente, id_periodo) VALUES (?, ?, ?)',
      [id_estudiante, id_docente, idPeriodo]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CREAR_ASIGNACION', 'asignaciones',
        `Estudiante ${id_estudiante} asignado a docente ${id_docente} en periodo ${periodoActivo[0].nombre}`]
    )

    res.status(201).json({ mensaje: 'Asignación creada correctamente' })
  } catch (error) {
    console.error('Error creando asignación:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const cancelarAsignacion = async (req, res) => {
  const { id } = req.params
  try {
    const [asignacion] = await db.query('SELECT id FROM asignaciones WHERE id = ?', [id])
    if (asignacion.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' })
    }

    await db.query('UPDATE asignaciones SET estatus = ? WHERE id = ?', ['cancelada', id])

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CANCELAR_ASIGNACION', 'asignaciones', `Asignación ${id} cancelada`]
    )

    res.json({ mensaje: 'Asignación cancelada correctamente' })
  } catch (error) {
    console.error('Error cancelando asignación:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Marcar una asignación como concluida (estudiante terminó su estadía en ese periodo)
const concluirAsignacion = async (req, res) => {
  const { id } = req.params
  try {
    const [asignacion] = await db.query('SELECT id FROM asignaciones WHERE id = ? AND estatus = ?', [id, 'activa'])
    if (asignacion.length === 0) {
      return res.status(404).json({ error: 'Asignación activa no encontrada' })
    }

    await db.query('UPDATE asignaciones SET estatus = ? WHERE id = ?', ['concluida', id])

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CONCLUIR_ASIGNACION', 'asignaciones', `Asignación ${id} marcada como concluida`]
    )

    res.json({ mensaje: 'Asignación marcada como concluida. El historial queda conservado.' })
  } catch (error) {
    console.error('Error concluyendo asignación:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = {
  getAsignaciones,
  getEstudiantesSinAsesor,
  getDocentesActivos,
  crearAsignacion,
  cancelarAsignacion,
  concluirAsignacion
}