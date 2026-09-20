const db = require('../config/db')

const getMisEstudiantes = async (req, res) => {
  try {
    const [docente] = await db.query(
      'SELECT id FROM docentes WHERE id_usuario = ?',
      [req.usuario.id]
    )
    if (docente.length === 0) return res.status(404).json({ error: 'Docente no encontrado' })

    const [rows] = await db.query(`
      SELECT 
        a.id AS id_asignacion,
        a.validada_por_docente,
        e.id AS id_estudiante,
        e.matricula, e.nombre, e.apellido_p, e.apellido_m,
        e.grupo, e.carrera,
        u.correo,
        p.nombre AS periodo_nombre,
        p.fecha_inicio
      FROM asignaciones a
      JOIN estudiantes e ON a.id_estudiante = e.id
      JOIN usuarios u ON e.id_usuario = u.id
      JOIN periodos p ON a.id_periodo = p.id
      WHERE a.id_docente = ? AND a.estatus = 'activa'
      ORDER BY e.apellido_p, e.nombre
    `, [docente[0].id])

    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo estudiantes del docente:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getAsistencia = async (req, res) => {
  const { id_asignacion } = req.params
  try {
    const [rows] = await db.query(
      'SELECT * FROM asistencia WHERE id_asignacion = ? ORDER BY semana',
      [id_asignacion]
    )
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo asistencia:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const validarAsignacion = async (req, res) => {
  const { id_asignacion } = req.params
  try {
    const [docente] = await db.query(
      'SELECT id FROM docentes WHERE id_usuario = ?',
      [req.usuario.id]
    )

    const [asignacion] = await db.query(
      'SELECT id FROM asignaciones WHERE id = ? AND id_docente = ? AND estatus = ?',
      [id_asignacion, docente[0].id, 'activa']
    )
    if (asignacion.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para validar esta asignación' })
    }

    await db.query(
      'UPDATE asignaciones SET validada_por_docente = 1 WHERE id = ?',
      [id_asignacion]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'VALIDAR_ASIGNACION', 'asignaciones',
        `Asignación ${id_asignacion} validada por docente`]
    )

    res.json({ mensaje: 'Asignación validada correctamente' })
  } catch (error) {
    console.error('Error validando asignación:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Calcula la semana actual (1-13) del periodo al que pertenece una asignación,
// usando la fecha_inicio real del periodo configurado por el admin
const calcularSemanaActual = async (id_asignacion) => {
  const [rows] = await db.query(`
    SELECT p.fecha_inicio, p.fecha_fin
    FROM asignaciones a
    JOIN periodos p ON a.id_periodo = p.id
    WHERE a.id = ?
  `, [id_asignacion])

  if (rows.length === 0) return 1

  // Parsear fecha sin desfase de zona horaria
  const fechaStr = rows[0].fecha_inicio.toISOString
    ? rows[0].fecha_inicio.toISOString().substring(0, 10)
    : String(rows[0].fecha_inicio).substring(0, 10)

  const partes = fechaStr.split('-')
  const inicio = new Date(
    parseInt(partes[0]),
    parseInt(partes[1]) - 1,
    parseInt(partes[2])
  )

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const diffDias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return 0
  const semana = Math.floor(diffDias / 7) + 1
  return Math.min(semana, 13)
}

const registrarAsistenciaDocente = async (req, res) => {
  const { id_asignacion, semana } = req.params
  const semanaNum = parseInt(semana)
  const semanaActual = await calcularSemanaActual(id_asignacion)

  if (semanaActual === 0) {
    return res.status(400).json({ error: 'El periodo aún no ha iniciado.' })
  }

  // Bloquear semanas futuras
  if (semanaNum > semanaActual) {
    return res.status(400).json({
      error: `No puedes registrar la semana ${semanaNum}. Aún no ha llegado (semana actual: ${semanaActual}).`
    })
  }

  // Bloquear semanas pasadas — redirigir a solicitud de corrección
  if (semanaNum < semanaActual) {
    return res.status(400).json({
      error: `La semana ${semanaNum} ya pasó. Para registrarla debes enviar una solicitud de corrección al administrador.`,
      requiere_solicitud: true,
      semana: semanaNum
    })
  }

  try {
    const [docente] = await db.query(
      'SELECT id FROM docentes WHERE id_usuario = ?',
      [req.usuario.id]
    )

    const [asignacion] = await db.query(
      'SELECT id, validada_por_docente FROM asignaciones WHERE id = ? AND id_docente = ? AND estatus = ?',
      [id_asignacion, docente[0].id, 'activa']
    )
    if (asignacion.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para registrar esta asistencia' })
    }
    if (!asignacion[0].validada_por_docente) {
      return res.status(400).json({ error: 'Debes validar la asignación antes de registrar asistencia' })
    }

    const [existente] = await db.query(
      'SELECT id, confirmacion_docente FROM asistencia WHERE id_asignacion = ? AND semana = ?',
      [id_asignacion, semanaNum]
    )

    if (existente.length > 0 && existente[0].confirmacion_docente) {
      return res.status(400).json({ error: 'La asistencia de esta semana ya fue registrada' })
    }

    if (existente.length > 0) {
      await db.query(
        'UPDATE asistencia SET confirmacion_docente = 1, fecha_docente = NOW() WHERE id = ?',
        [existente[0].id]
      )
    } else {
      await db.query(
        'INSERT INTO asistencia (id_asignacion, semana, confirmacion_docente, fecha_docente) VALUES (?, ?, 1, NOW())',
        [id_asignacion, semanaNum]
      )
    }

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'REGISTRO_ASISTENCIA_DOCENTE', 'asistencia',
        `Docente registró asistencia semana ${semanaNum} para asignación ${id_asignacion}`]
    )

    res.json({ mensaje: `Asistencia de la semana ${semanaNum} registrada correctamente` })
  } catch (error) {
    console.error('Error registrando asistencia:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Solicitud de corrección para semanas pasadas
const solicitarCorreccion = async (req, res) => {
  const { id_asignacion, semana } = req.params
  const { motivo } = req.body
  const semanaNum = parseInt(semana)
  const semanaActual = await calcularSemanaActual(id_asignacion)

  if (semanaNum >= semanaActual) {
    return res.status(400).json({ error: 'Solo puedes solicitar corrección para semanas pasadas' })
  }

  if (!motivo || motivo.trim().length < 10) {
    return res.status(400).json({ error: 'Debes proporcionar un motivo de al menos 10 caracteres' })
  }

  try {
    const [docente] = await db.query(
      'SELECT d.id, d.nombre, d.apellido_p FROM docentes d WHERE d.id_usuario = ?',
      [req.usuario.id]
    )

    const [asignacion] = await db.query(`
      SELECT a.id, e.nombre AS est_nombre, e.apellido_p AS est_apellido_p, e.matricula
      FROM asignaciones a
      JOIN estudiantes e ON a.id_estudiante = e.id
      WHERE a.id = ? AND a.id_docente = ? AND a.estatus = 'activa'
    `, [id_asignacion, docente[0].id])

    if (asignacion.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para esta asignación' })
    }

    const est = asignacion[0]
    const detalle = JSON.stringify({
      tipo: 'SOLICITUD_CORRECCION_ASISTENCIA',
      semana: semanaNum,
      id_asignacion,
      docente: `${docente[0].nombre} ${docente[0].apellido_p}`,
      estudiante: `${est.est_nombre} ${est.est_apellido_p} (${est.matricula})`,
      motivo: motivo.trim(),
      fecha_solicitud: new Date().toISOString(),
      estatus: 'PENDIENTE'
    })

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'SOLICITUD_CORRECCION', 'asistencia', detalle]
    )

    res.json({
      mensaje: `Solicitud enviada correctamente. El administrador revisará el registro de la semana ${semanaNum} para ${est.est_nombre} ${est.est_apellido_p}.`
    })
  } catch (error) {
    console.error('Error enviando solicitud:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Aprobar solicitud de corrección (solo administrador)
const aprobarCorreccion = async (req, res) => {
  const { id_bitacora } = req.params

  try {
    const [registro] = await db.query(
      'SELECT * FROM bitacora WHERE id = ? AND accion = ?',
      [id_bitacora, 'SOLICITUD_CORRECCION']
    )

    if (registro.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    const datos = JSON.parse(registro[0].detalle)

    if (datos.estatus !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Esta solicitud ya fue procesada' })
    }

    // Registrar la asistencia retroactiva
    const [existente] = await db.query(
      'SELECT id FROM asistencia WHERE id_asignacion = ? AND semana = ?',
      [datos.id_asignacion, datos.semana]
    )

    if (existente.length > 0) {
      await db.query(
        'UPDATE asistencia SET confirmacion_docente = 1, fecha_docente = NOW() WHERE id = ?',
        [existente[0].id]
      )
    } else {
      await db.query(
        'INSERT INTO asistencia (id_asignacion, semana, confirmacion_docente, fecha_docente) VALUES (?, ?, 1, NOW())',
        [datos.id_asignacion, datos.semana]
      )
    }

    // Actualizar la solicitud en bitácora como aprobada
    datos.estatus = 'APROBADA'
    datos.aprobada_por = req.usuario.correo
    datos.fecha_aprobacion = new Date().toISOString()

    await db.query(
      'UPDATE bitacora SET detalle = ? WHERE id = ?',
      [JSON.stringify(datos), id_bitacora]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'APROBACION_CORRECCION', 'asistencia',
        `Corrección aprobada: semana ${datos.semana} para asignación ${datos.id_asignacion}. Motivo original: ${datos.motivo}`]
    )

    res.json({ mensaje: 'Corrección aprobada y asistencia registrada retroactivamente' })
  } catch (error) {
    console.error('Error aprobando corrección:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Rechazar solicitud de corrección (solo administrador)
const rechazarCorreccion = async (req, res) => {
  const { id_bitacora } = req.params
  const { motivo_rechazo } = req.body

  try {
    const [registro] = await db.query(
      'SELECT * FROM bitacora WHERE id = ? AND accion = ?',
      [id_bitacora, 'SOLICITUD_CORRECCION']
    )

    if (registro.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    const datos = JSON.parse(registro[0].detalle)

    if (datos.estatus !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Esta solicitud ya fue procesada' })
    }

    datos.estatus = 'RECHAZADA'
    datos.rechazada_por = req.usuario.correo
    datos.fecha_rechazo = new Date().toISOString()
    if (motivo_rechazo && motivo_rechazo.trim()) {
      datos.motivo_rechazo = motivo_rechazo.trim()
    }

    await db.query(
      'UPDATE bitacora SET detalle = ? WHERE id = ?',
      [JSON.stringify(datos), id_bitacora]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'RECHAZO_CORRECCION', 'asistencia',
        `Corrección rechazada: semana ${datos.semana} para asignación ${datos.id_asignacion}. Motivo original: ${datos.motivo}`]
    )

    res.json({ mensaje: 'Solicitud de corrección rechazada' })
  } catch (error) {
    console.error('Error rechazando corrección:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Obtener solicitudes de corrección pendientes (solo administrador)
const getSolicitudesPendientes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.id, b.id_usuario, b.fecha_hora, b.detalle,
             d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p
      FROM bitacora b
      JOIN usuarios u ON b.id_usuario = u.id
      JOIN docentes d ON d.id_usuario = u.id
      WHERE b.accion = 'SOLICITUD_CORRECCION'
      ORDER BY b.fecha_hora DESC
    `)

    const solicitudes = rows.map(r => ({
      id: r.id,
      fecha_hora: r.fecha_hora,
      docente: `${r.doc_nombre} ${r.doc_apellido_p}`,
      ...JSON.parse(r.detalle)
    }))

    res.json(solicitudes)
  } catch (error) {
    console.error('Error obteniendo solicitudes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getAsistenciaEstudiante = async (req, res) => {
  try {
    const [estudiante] = await db.query(
      'SELECT id FROM estudiantes WHERE id_usuario = ?',
      [req.usuario.id]
    )
    if (estudiante.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

    const [asignacion] = await db.query(`
      SELECT a.id, a.validada_por_docente, p.fecha_inicio, p.nombre AS periodo_nombre,
             d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p
      FROM asignaciones a
      JOIN periodos p ON a.id_periodo = p.id
      JOIN docentes d ON a.id_docente = d.id
      WHERE a.id_estudiante = ? AND a.estatus = 'activa'
    `, [estudiante[0].id])

    if (asignacion.length === 0) {
      return res.status(404).json({ error: 'No tienes asesor asignado en el periodo activo' })
    }

    const [asistencia] = await db.query(
      'SELECT * FROM asistencia WHERE id_asignacion = ? ORDER BY semana',
      [asignacion[0].id]
    )

    res.json({
      id_asignacion: asignacion[0].id,
      validada_por_docente: asignacion[0].validada_por_docente,
      fecha_inicio: asignacion[0].fecha_inicio,
      periodo_nombre: asignacion[0].periodo_nombre,
      docente: `${asignacion[0].doc_nombre} ${asignacion[0].doc_apellido_p}`,
      asistencia
    })
  } catch (error) {
    console.error('Error obteniendo asistencia del estudiante:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const confirmarAsistenciaEstudiante = async (req, res) => {
  const { id_asignacion, semana } = req.params
  const semanaNum = parseInt(semana)

  if (semanaNum < 1 || semanaNum > 13) {
    return res.status(400).json({ error: 'La semana debe estar entre 1 y 13' })
  }

  try {
    const [estudiante] = await db.query(
      'SELECT id FROM estudiantes WHERE id_usuario = ?',
      [req.usuario.id]
    )

    const [asignacion] = await db.query(
      'SELECT id FROM asignaciones WHERE id = ? AND id_estudiante = ? AND estatus = ?',
      [id_asignacion, estudiante[0].id, 'activa']
    )
    if (asignacion.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para confirmar esta asistencia' })
    }

    const [existente] = await db.query(
      'SELECT id, confirmacion_estudiante FROM asistencia WHERE id_asignacion = ? AND semana = ?',
      [id_asignacion, semanaNum]
    )

    if (existente.length === 0) {
      return res.status(400).json({ error: 'El docente aún no ha registrado la asistencia de esta semana' })
    }
    if (existente[0].confirmacion_estudiante) {
      return res.status(400).json({ error: 'Ya confirmaste tu asistencia esta semana' })
    }

    await db.query(
      'UPDATE asistencia SET confirmacion_estudiante = 1, fecha_estudiante = NOW() WHERE id = ?',
      [existente[0].id]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CONFIRMACION_ASISTENCIA_ESTUDIANTE', 'asistencia',
        `Estudiante confirmó asistencia semana ${semanaNum} para asignación ${id_asignacion}`]
    )

    res.json({ mensaje: `Asistencia de la semana ${semanaNum} confirmada correctamente` })
  } catch (error) {
    console.error('Error confirmando asistencia:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = {
  getMisEstudiantes,
  getAsistencia,
  validarAsignacion,
  registrarAsistenciaDocente,
  solicitarCorreccion,
  aprobarCorreccion,
  rechazarCorreccion,
  getSolicitudesPendientes,
  getAsistenciaEstudiante,
  confirmarAsistenciaEstudiante
}