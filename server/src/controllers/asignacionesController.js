const db = require('../config/db')

const getAsignaciones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id, a.fecha_asignacion, a.activa,
        e.id AS id_estudiante, e.matricula,
        e.nombre AS est_nombre, e.apellido_p AS est_apellido_p, e.apellido_m AS est_apellido_m,
        e.grupo,
        d.id AS id_docente,
        d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p, d.apellido_m AS doc_apellido_m
      FROM asignaciones a
      JOIN estudiantes e ON a.id_estudiante = e.id
      JOIN docentes d ON a.id_docente = d.id
      ORDER BY a.fecha_asignacion DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo asignaciones:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getEstudiantesSinAsesor = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.matricula, e.nombre, e.apellido_p, e.apellido_m, e.grupo, e.programa
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      WHERE u.estatus = 1
        AND e.id NOT IN (
          SELECT id_estudiante FROM asignaciones WHERE activa = 1
        )
      ORDER BY e.apellido_p, e.nombre
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo estudiantes sin asesor:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getDocentesActivos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.nombre, d.apellido_p, d.apellido_m, d.programa_educativo,
             COUNT(a.id) AS estudiantes_asignados
      FROM docentes d
      JOIN usuarios u ON d.id_usuario = u.id
      LEFT JOIN asignaciones a ON a.id_docente = d.id AND a.activa = 1
      WHERE u.estatus = 1
      GROUP BY d.id
      ORDER BY d.apellido_p, d.nombre
    `)
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

    const [yaAsignado] = await db.query(
      'SELECT id FROM asignaciones WHERE id_estudiante = ? AND activa = 1',
      [id_estudiante]
    )
    if (yaAsignado.length > 0) {
      return res.status(400).json({ error: 'El estudiante ya tiene un asesor asignado' })
    }

    await db.query(
      'INSERT INTO asignaciones (id_estudiante, id_docente) VALUES (?, ?)',
      [id_estudiante, id_docente]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CREAR_ASIGNACION', 'asignaciones',
        `Estudiante ${id_estudiante} asignado a docente ${id_docente}`]
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

    await db.query('UPDATE asignaciones SET activa = 0 WHERE id = ?', [id])

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

module.exports = {
  getAsignaciones,
  getEstudiantesSinAsesor,
  getDocentesActivos,
  crearAsignacion,
  cancelarAsignacion
}