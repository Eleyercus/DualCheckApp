const db = require('../config/db')

// Listar todos los periodos
const getPeriodos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM asignaciones a WHERE a.id_periodo = p.id) AS total_asignaciones
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

  if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
    return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' })
  }

  try {
    await db.query(
      'INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, creado_por) VALUES (?, ?, ?, ?)',
      [nombre, fecha_inicio, fecha_fin, req.usuario.id]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CREAR_PERIODO', 'periodos', `Periodo "${nombre}" creado (${fecha_inicio} a ${fecha_fin})`]
    )

    res.status(201).json({ mensaje: 'Periodo creado correctamente' })
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
    if (activo) {
      // Desactivar todos los demás periodos antes de activar este
      await db.query('UPDATE periodos SET activo = 0')
    }

    await db.query('UPDATE periodos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id])

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

module.exports = { getPeriodos, getPeriodoActivo, crearPeriodo, cambiarEstatusPeriodo }