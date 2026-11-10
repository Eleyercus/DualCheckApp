const db = require('../config/db')

// Listar todos los periodos
const getPeriodos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM asignaciones a WHERE a.id_periodo = p.id) AS total_asignaciones,
        (SELECT COUNT(*) FROM asignaciones a WHERE a.id_periodo = p.id AND a.estatus = 'activa') AS asignaciones_activas
      FROM periodos p
      ORDER BY p.fecha_inicio DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo periodos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Obtener solo el periodo activo (el más reciente marcado como activo)
const getPeriodoActivo = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM periodos WHERE activo = 1 ORDER BY fecha_inicio DESC LIMIT 1'
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No hay un periodo activo configurado' })
    }
    res.json(rows[0])
  } catch (error) {
    console.error('Error obteniendo periodo activo:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear nuevo periodo
const crearPeriodo = async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin } = req.body

  if (!nombre || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Nombre, fecha de inicio y fecha de fin son requeridos' })
  }

  if (Number.isNaN(new Date(fecha_inicio).getTime()) || Number.isNaN(new Date(fecha_fin).getTime())) {
    return res.status(400).json({ error: 'Las fechas no tienen un formato válido' })
  }

  if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
    return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' })
  }

  try {
    // Solo puede haber un periodo activo. El nuevo se activa únicamente si no
    // hay ninguno; si ya existe uno, se crea inactivo y el admin lo activa
    // explícitamente (cambiarEstatusPeriodo desactiva los demás)
    const [activos] = await db.query('SELECT id FROM periodos WHERE activo = 1 LIMIT 1')
    const activar = activos.length === 0

    await db.query(
      'INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, activo, creado_por) VALUES (?, ?, ?, ?, ?)',
      [nombre, fecha_inicio, fecha_fin, activar ? 1 : 0, req.usuario.id]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CREAR_PERIODO', 'periodos',
        `Periodo "${nombre}" creado (${fecha_inicio} a ${fecha_fin}) como ${activar ? 'activo' : 'inactivo'}`]
    )

    res.status(201).json({
      mensaje: activar
        ? 'Periodo creado y activado correctamente'
        : 'Periodo creado como inactivo. Actívalo cuando deba usarse para nuevas asignaciones.'
    })
  } catch (error) {
    console.error('Error creando periodo:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Activar/desactivar un periodo (solo uno puede estar activo a la vez para nuevas asignaciones)
const cambiarEstatusPeriodo = async (req, res) => {
  const { id } = req.params
  const { activo } = req.body

  try {
    const [periodo] = await db.query('SELECT id FROM periodos WHERE id = ?', [id])
    if (periodo.length === 0) return res.status(404).json({ error: 'Periodo no encontrado' })

    // En una transacción: si algo falla, no se queda el sistema sin periodo activo
    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()
      if (activo) await conn.query('UPDATE periodos SET activo = 0')
      await conn.query('UPDATE periodos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id])
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CAMBIO_ESTATUS_PERIODO', 'periodos', `Periodo ${id} marcado como ${activo ? 'activo' : 'inactivo'}`]
    )

    res.json({ mensaje: 'Estatus del periodo actualizado' })
  } catch (error) {
    console.error('Error cambiando estatus de periodo:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Cerrar un periodo: concluye todas sus asignaciones activas y lo desactiva.
// No borra nada: los estudiantes dejan de aparecer en la vista del periodo activo,
// pero su historial sigue disponible al consultar ese periodo y en los reportes.
// Exige escribir el nombre exacto del periodo como confirmación.
const cerrarPeriodo = async (req, res) => {
  const { id } = req.params
  const { confirmacion } = req.body

  try {
    const [periodo] = await db.query('SELECT id, nombre FROM periodos WHERE id = ?', [id])
    if (periodo.length === 0) return res.status(404).json({ error: 'Periodo no encontrado' })

    if ((confirmacion || '').trim() !== periodo[0].nombre) {
      return res.status(400).json({ error: 'Para cerrar el periodo escribe su nombre exactamente como aparece.' })
    }

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()
      const [resultado] = await conn.query(
        "UPDATE asignaciones SET estatus = 'concluida' WHERE id_periodo = ? AND estatus = 'activa'",
        [id]
      )
      await conn.query('UPDATE periodos SET activo = 0 WHERE id = ?', [id])
      await conn.query(
        'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
        [req.usuario.id, 'CIERRE_PERIODO', 'periodos',
          `Periodo "${periodo[0].nombre}" cerrado: ${resultado.affectedRows} asignaciones concluidas`]
      )
      await conn.commit()
      res.json({
        mensaje: `Periodo "${periodo[0].nombre}" cerrado. Se concluyeron ${resultado.affectedRows} asignaciones; el historial queda disponible en la consulta del periodo.`
      })
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  } catch (error) {
    console.error('Error cerrando periodo:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getPeriodos, getPeriodoActivo, crearPeriodo, cambiarEstatusPeriodo, cerrarPeriodo }