const db = require('../config/db')
const bcrypt = require('bcryptjs')
const xlsx = require('xlsx')

// Obtener todos los estudiantes
const getEstudiantes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, e.matricula, e.nombre, e.apellido_p, e.apellido_m, 
             e.grupo, e.programa, u.correo, u.estatus
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      ORDER BY e.apellido_p, e.apellido_m, e.nombre
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Crear estudiante individual
const crearEstudiante = async (req, res) => {
  const { matricula, nombre, apellido_p, apellido_m, grupo, programa, correo } = req.body

  if (!matricula || !nombre || !apellido_p || !correo) {
    return res.status(400).json({ error: 'Matrícula, nombre, apellido paterno y correo son requeridos' })
  }

  try {
    // Verificar que el correo no exista
    const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
    if (existe.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' })
    }

    // Contraseña inicial = matrícula
    const password_hash = await bcrypt.hash(matricula, 10)

    const conn = await db.getConnection()
    await conn.beginTransaction()

    try {
      const [usuarioResult] = await conn.query(
        'INSERT INTO usuarios (correo, password_hash, perfil) VALUES (?, ?, ?)',
        [correo, password_hash, 'estudiante']
      )

      await conn.query(
        'INSERT INTO estudiantes (id_usuario, matricula, nombre, apellido_p, apellido_m, grupo, programa) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null, grupo || null, programa || null]
      )

      await conn.commit()
      conn.release()

      res.status(201).json({ mensaje: 'Estudiante creado correctamente' })
    } catch (err) {
      await conn.rollback()
      conn.release()
      throw err
    }
  } catch (error) {
    console.error('Error creando estudiante:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Carga masiva desde Excel o CSV
const cargaMasiva = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' })
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const hoja = workbook.Sheets[workbook.SheetNames[0]]
    const datos = xlsx.utils.sheet_to_json(hoja)

    if (datos.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' })
    }

    const resultados = { exitosos: 0, errores: [] }

    for (let i = 0; i < datos.length; i++) {
      const fila = datos[i]
      const matricula = String(fila['Matricula'] || fila['Matrícula'] || '').trim()
      const nombre = String(fila['Nombre'] || '').trim()
      const apellido_p = String(fila['Apellido P'] || fila['ApellidoP'] || '').trim()
      const apellido_m = String(fila['Apellido M'] || fila['ApellidoM'] || '').trim()
      const grupo = String(fila['Grupo'] || '').trim()
      const programa = String(fila['Programa'] || '').trim()
      const correo = String(fila['Correo'] || '').trim()

      // Validar campos requeridos
      if (!matricula || !nombre || !apellido_p || !correo) {
        resultados.errores.push({ fila: i + 2, mensaje: 'Faltan campos requeridos (Matricula, Nombre, Apellido P, Correo)' })
        continue
      }

      try {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
        if (existe.length > 0) {
          resultados.errores.push({ fila: i + 2, mensaje: `El correo ${correo} ya está registrado` })
          continue
        }

        const password_hash = await bcrypt.hash(matricula, 10)
        const conn = await db.getConnection()
        await conn.beginTransaction()

        try {
          const [usuarioResult] = await conn.query(
            'INSERT INTO usuarios (correo, password_hash, perfil) VALUES (?, ?, ?)',
            [correo, password_hash, 'estudiante']
          )

          await conn.query(
            'INSERT INTO estudiantes (id_usuario, matricula, nombre, apellido_p, apellido_m, grupo, programa) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null, grupo || null, programa || null]
          )

          await conn.commit()
          conn.release()
          resultados.exitosos++
        } catch (err) {
          await conn.rollback()
          conn.release()
          resultados.errores.push({ fila: i + 2, mensaje: 'Error insertando registro' })
        }
      } catch (err) {
        resultados.errores.push({ fila: i + 2, mensaje: 'Error procesando fila' })
      }
    }

    res.json({
      mensaje: `Carga completada: ${resultados.exitosos} exitosos, ${resultados.errores.length} errores`,
      ...resultados
    })
  } catch (error) {
    console.error('Error en carga masiva:', error)
    res.status(500).json({ error: 'Error procesando el archivo' })
  }
}

// Dar de baja un estudiante
const bajaEstudiante = async (req, res) => {
  const { id } = req.params

  try {
    const [estudiante] = await db.query('SELECT id_usuario FROM estudiantes WHERE id = ?', [id])
    if (estudiante.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' })
    }

    await db.query('UPDATE usuarios SET estatus = 0 WHERE id = ?', [estudiante[0].id_usuario])

    // Registrar en bitácora
    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'BAJA_ESTUDIANTE', 'estudiantes', `Baja del estudiante con id ${id}`]
    )

    res.json({ mensaje: 'Estudiante dado de baja correctamente' })
  } catch (error) {
    console.error('Error dando de baja:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getEstudiantes, crearEstudiante, cargaMasiva, bajaEstudiante }