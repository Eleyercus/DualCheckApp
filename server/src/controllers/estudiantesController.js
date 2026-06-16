const db = require('../config/db')
const bcrypt = require('bcryptjs')
const xlsx = require('xlsx')

const getEstudiantes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, u.correo, u.estatus,
        emp.nombre_empresa, emp.nombre_estadia
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      LEFT JOIN empresas_estadia emp ON emp.id_estudiante = e.id
      ORDER BY e.apellido_p, e.apellido_m, e.nombre
    `)
    res.json(rows)
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getEstudiante = async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await db.query(`
      SELECT e.*, u.correo, u.estatus,
        emp.nombre_estadia, emp.nombre_empresa, emp.rfc,
        emp.nombre_responsable, emp.puesto_responsable,
        emp.direccion AS emp_direccion, emp.colonia AS emp_colonia,
        emp.cp AS emp_cp, emp.telefono AS emp_telefono,
        emp.correo AS emp_correo, emp.giro, emp.tamano, emp.regimen_juridico
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      LEFT JOIN empresas_estadia emp ON emp.id_estudiante = e.id
      WHERE e.id = ?
    `, [id])
    if (rows.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })
    res.json(rows[0])
  } catch (error) {
    console.error('Error obteniendo estudiante:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const crearEstudiante = async (req, res) => {
  const {
    matricula, nombre, apellido_p, apellido_m, grupo, generacion,
    abrev_carrera, carrera, programa, telefono_celular, telefono_casa,
    direccion, colonia, cp, sexo, correo,
    req_datos_estadia, req_carta_no_adeudo, req_carta_servicios,
    nombre_estadia, nombre_empresa, rfc, nombre_responsable,
    puesto_responsable, emp_direccion, emp_colonia, emp_cp,
    emp_telefono, emp_correo, giro, tamano, regimen_juridico
  } = req.body

  if (!matricula || !nombre || !apellido_p || !correo) {
    return res.status(400).json({ error: 'Matrícula, nombre, apellido paterno y correo son requeridos' })
  }

  try {
    const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
    if (existe.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' })

    const password_hash = await bcrypt.hash(matricula, 10)
    const conn = await db.getConnection()
    await conn.beginTransaction()

    try {
      const [usuarioResult] = await conn.query(
        'INSERT INTO usuarios (correo, password_hash, perfil) VALUES (?, ?, ?)',
        [correo, password_hash, 'estudiante']
      )

      const [estResult] = await conn.query(`
        INSERT INTO estudiantes 
          (id_usuario, matricula, nombre, apellido_p, apellido_m, grupo, generacion,
           abrev_carrera, carrera, programa, telefono_celular, telefono_casa,
           direccion, colonia, cp, sexo,
           req_datos_estadia, req_carta_no_adeudo, req_carta_servicios)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null,
        grupo || null, generacion || null, abrev_carrera || null, carrera || null,
        programa || null, telefono_celular || null, telefono_casa || null,
        direccion || null, colonia || null, cp || null, sexo || null,
        req_datos_estadia ? 1 : 0, req_carta_no_adeudo ? 1 : 0, req_carta_servicios ? 1 : 0
      ])

      // Guardar datos de empresa si se proporcionaron
      if (nombre_empresa || nombre_estadia) {
        await conn.query(`
          INSERT INTO empresas_estadia
            (id_estudiante, nombre_estadia, nombre_empresa, rfc, nombre_responsable,
             puesto_responsable, direccion, colonia, cp, telefono, correo,
             giro, tamano, regimen_juridico)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          estResult.insertId, nombre_estadia || null, nombre_empresa || null,
          rfc || null, nombre_responsable || null, puesto_responsable || null,
          emp_direccion || null, emp_colonia || null, emp_cp || null,
          emp_telefono || null, emp_correo || null, giro || null,
          tamano || null, regimen_juridico || null
        ])
      }

      await conn.commit()
      conn.release()
      res.status(201).json({ mensaje: 'Estudiante registrado correctamente' })
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

const actualizarRequisitos = async (req, res) => {
  const { id } = req.params
  const { req_datos_estadia, req_carta_no_adeudo, req_carta_servicios } = req.body

  try {
    await db.query(`
      UPDATE estudiantes 
      SET req_datos_estadia = ?, req_carta_no_adeudo = ?, req_carta_servicios = ?
      WHERE id = ?
    `, [req_datos_estadia ? 1 : 0, req_carta_no_adeudo ? 1 : 0, req_carta_servicios ? 1 : 0, id])

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'ACTUALIZAR_REQUISITOS', 'estudiantes', `Requisitos actualizados para estudiante ${id}`]
    )

    res.json({ mensaje: 'Requisitos actualizados correctamente' })
  } catch (error) {
    console.error('Error actualizando requisitos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const actualizarEmpresa = async (req, res) => {
  const { id } = req.params
  const {
    nombre_estadia, nombre_empresa, rfc, nombre_responsable, puesto_responsable,
    emp_direccion, emp_colonia, emp_cp, emp_telefono, emp_correo,
    giro, tamano, regimen_juridico
  } = req.body

  try {
    const [existe] = await db.query('SELECT id FROM empresas_estadia WHERE id_estudiante = ?', [id])

    if (existe.length > 0) {
      await db.query(`
        UPDATE empresas_estadia SET
          nombre_estadia = ?, nombre_empresa = ?, rfc = ?,
          nombre_responsable = ?, puesto_responsable = ?,
          direccion = ?, colonia = ?, cp = ?, telefono = ?, correo = ?,
          giro = ?, tamano = ?, regimen_juridico = ?
        WHERE id_estudiante = ?
      `, [
        nombre_estadia || null, nombre_empresa || null, rfc || null,
        nombre_responsable || null, puesto_responsable || null,
        emp_direccion || null, emp_colonia || null, emp_cp || null,
        emp_telefono || null, emp_correo || null,
        giro || null, tamano || null, regimen_juridico || null, id
      ])
    } else {
      await db.query(`
        INSERT INTO empresas_estadia
          (id_estudiante, nombre_estadia, nombre_empresa, rfc, nombre_responsable,
           puesto_responsable, direccion, colonia, cp, telefono, correo,
           giro, tamano, regimen_juridico)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, nombre_estadia || null, nombre_empresa || null, rfc || null,
        nombre_responsable || null, puesto_responsable || null,
        emp_direccion || null, emp_colonia || null, emp_cp || null,
        emp_telefono || null, emp_correo || null,
        giro || null, tamano || null, regimen_juridico || null
      ])
    }

    res.json({ mensaje: 'Datos de empresa actualizados correctamente' })
  } catch (error) {
    console.error('Error actualizando empresa:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const actualizarEstatusEspecial = async (req, res) => {
  const { id } = req.params
  const { estatus_especial } = req.body

  const estatusValidos = ['activo', 'baja', 'baja_reprobacion', 'reincorporado']
  if (!estatusValidos.includes(estatus_especial)) {
    return res.status(400).json({ error: 'Estatus no válido' })
  }

  try {
    await db.query('UPDATE estudiantes SET estatus_especial = ? WHERE id = ?', [estatus_especial, id])

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CAMBIO_ESTATUS', 'estudiantes', `Estatus cambiado a ${estatus_especial} para estudiante ${id}`]
    )

    res.json({ mensaje: 'Estatus actualizado correctamente' })
  } catch (error) {
    console.error('Error actualizando estatus:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const cargaMasiva = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const hoja = workbook.Sheets[workbook.SheetNames[0]]
    const datos = xlsx.utils.sheet_to_json(hoja)

    if (datos.length === 0) return res.status(400).json({ error: 'El archivo está vacío' })

    const resultados = { exitosos: 0, errores: [] }

    for (let i = 0; i < datos.length; i++) {
      const f = datos[i]

      const matricula = String(f['Matrícula'] || f['Matricula'] || '').trim()
      const nombre = String(f['Nombre'] || '').trim()
      const apellido_p = String(f['Apellido P'] || f['ApellidoP'] || '').trim()
      const apellido_m = String(f['Apellido M'] || f['ApellidoM'] || '').trim()
      const correo = String(f['Correo Electrónico'] || f['Correo'] || '').trim()
      const grupo = String(f['Grupo'] || '').trim()
      const generacion = String(f['GEN'] || f['Generacion'] || '').trim()
      const abrev_carrera = String(f['Abrev. carrera'] || f['AbrevCarrera'] || '').trim()
      const carrera = String(f['Carrera'] || '').trim()
      const programa = String(f['Programa'] || '').trim()
      const telefono_celular = String(f['Tel. Celular'] || f['TelCelular'] || '').trim()
      const telefono_casa = String(f['Tel. Casa'] || f['TelCasa'] || '').trim()
      const direccion = String(f['Dirección (Calle y Número)'] || f['Direccion'] || '').trim()
      const colonia = String(f['Colonia'] || '').trim()
      const cp = String(f['C.P.'] || f['CP'] || '').trim()
      const sexo = String(f['SEXO ALUMNO'] || f['Sexo'] || '').trim().toUpperCase()
      const req_datos_estadia = f['Datos Estadías'] ? 1 : 0
      const req_carta_no_adeudo = f['Carta N/A o Convenio'] ? 1 : 0
      const req_carta_servicios = f['Carta Servicios Escolares'] ? 1 : 0

      if (!matricula || !nombre || !apellido_p || !correo) {
        resultados.errores.push({ fila: i + 2, mensaje: 'Faltan campos requeridos (Matrícula, Nombre, Apellido P, Correo)' })
        continue
      }

      try {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
        if (existe.length > 0) {
          resultados.errores.push({ fila: i + 2, mensaje: `Correo ${correo} ya registrado` })
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

          await conn.query(`
            INSERT INTO estudiantes
              (id_usuario, matricula, nombre, apellido_p, apellido_m, grupo, generacion,
               abrev_carrera, carrera, programa, telefono_celular, telefono_casa,
               direccion, colonia, cp, sexo,
               req_datos_estadia, req_carta_no_adeudo, req_carta_servicios)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null,
            grupo || null, generacion || null, abrev_carrera || null, carrera || null,
            programa || null, telefono_celular || null, telefono_casa || null,
            direccion || null, colonia || null, cp || null,
            ['M', 'F'].includes(sexo) ? sexo : null,
            req_datos_estadia, req_carta_no_adeudo, req_carta_servicios
          ])

          await conn.commit()
          conn.release()
          resultados.exitosos++
        } catch (err) {
          await conn.rollback()
          conn.release()
          resultados.errores.push({ fila: i + 2, mensaje: 'Error insertando registro' })
        }
      } catch {
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

const bajaEstudiante = async (req, res) => {
  const { id } = req.params
  try {
    const [estudiante] = await db.query('SELECT id_usuario FROM estudiantes WHERE id = ?', [id])
    if (estudiante.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

    await db.query('UPDATE usuarios SET estatus = 0 WHERE id = ?', [estudiante[0].id_usuario])
    await db.query('UPDATE estudiantes SET estatus_especial = ? WHERE id = ?', ['baja', id])

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

module.exports = {
  getEstudiantes, getEstudiante, crearEstudiante,
  actualizarRequisitos, actualizarEmpresa, actualizarEstatusEspecial,
  cargaMasiva, bajaEstudiante
}