const db = require('../config/db')
const bcrypt = require('bcryptjs')

const getDocentes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.nombre, d.apellido_p, d.apellido_m,
             d.programa_educativo, u.correo, u.estatus,
             COUNT(a.id) AS estudiantes_asignados
      FROM docentes d
      JOIN usuarios u ON d.id_usuario = u.id
      LEFT JOIN asignaciones a ON a.id_docente = d.id AND a.estatus = 'activa'
      GROUP BY d.id
      ORDER BY d.apellido_p, d.nombre
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo docentes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const crearDocente = async (req, res) => {
  const { nombre, apellido_p, apellido_m, programa_educativo, correo } = req.body

  if (!nombre || !apellido_p || !correo) {
    return res.status(400).json({ error: 'Nombre, apellido paterno y correo son requeridos' })
  }

  try {
    const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' })
    }

    // Contraseña inicial = apellido paterno en minúsculas + 123
    const passwordInicial = `${apellido_p.toLowerCase()}123`
    const password_hash = await bcrypt.hash(passwordInicial, 10)

    const conn = await db.getConnection()
    await conn.beginTransaction()

    try {
      const [usuarioResult] = await conn.query(
      'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
      [correo, password_hash, 'docente', 1]
    )

      await conn.query(
        'INSERT INTO docentes (id_usuario, nombre, apellido_p, apellido_m, programa_educativo) VALUES (?, ?, ?, ?, ?)',
        [usuarioResult.insertId, nombre, apellido_p, apellido_m || null, programa_educativo || null]
      )

      await conn.commit()
      conn.release()

      res.status(201).json({
        mensaje: 'Docente registrado correctamente',
        passwordInicial
      })
    } catch (err) {
      await conn.rollback()
      conn.release()
      throw err
    }
  } catch (error) {
    console.error('Error creando docente:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const bajaDocente = async (req, res) => {
  const { id } = req.params
  try {
    const [docente] = await db.query('SELECT id_usuario FROM docentes WHERE id = ?', [id])
    if (docente.length === 0) {
      return res.status(404).json({ error: 'Docente no encontrado' })
    }

    await db.query('UPDATE usuarios SET estatus = 0 WHERE id = ?', [docente[0].id_usuario])

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'BAJA_DOCENTE', 'docentes', `Baja del docente con id ${id}`]
    )

    res.json({ mensaje: 'Docente dado de baja correctamente' })
  } catch (error) {
    console.error('Error dando de baja docente:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getDocentes, crearDocente, bajaDocente }