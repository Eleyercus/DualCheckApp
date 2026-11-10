const db = require('../config/db')
const bcrypt = require('bcryptjs')
const xlsx = require('xlsx')
const ExcelJS = require('exceljs')
const { responderError, CORREO_VALIDO, recortar } = require('../utils/errores')

// ── Carga masiva: columnas aceptadas ────────────────────────────────────────
// Por campo, los nombres de columna aceptados. El primero es el de la plantilla
// que descarga la app; los demás cubren variantes y el formato institucional.
const COLUMNAS_CARGA = {
  abrev_carrera: ['Abrev. carrera', 'AbrevCarrera'],
  generacion: ['GEN', 'Generación'],
  matricula: ['Matrícula'],
  carrera: ['Carrera'],
  grupo: ['Grupo'],
  apellido_p: ['Apellido Paterno', 'Apellido P', 'ApellidoP'],
  apellido_m: ['Apellido Materno', 'Apellido M', 'ApellidoM'],
  nombre: ['Nombre(s)', 'Nombre', 'Nombres'],
  req_datos_estadia: ['Datos Estadías'],
  req_carta_no_adeudo: ['Carta N/A o Convenio'],
  req_carta_servicios: ['Carta Servicios Escolares'],
  telefono_casa: ['Tel. Casa', 'TelCasa'],
  telefono_celular: ['Tel. Celular', 'TelCelular'],
  correo_personal: ['Correo Personal', 'Correo Electrónico', 'Correo'],
  direccion: ['Dirección (Calle y Número)', 'Dirección'],
  colonia: ['Colonia'],
  cp: ['C.P.', 'CP'],
  sexo: ['Sexo', 'SEXO ALUMNO'],
  programa: ['Programa', 'Programa educativo'],
}

// Minúsculas, sin acentos y sin espacios repetidos, para comparar encabezados
const normalizarTexto = (t) => String(t ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim()

// Un requisito solo cuenta como entregado con un valor afirmativo explícito;
// "No", "Pendiente" o una celda vacía cuentan como no entregado
const VALORES_ENTREGADO = ['si', 'x', '1', 'entregado', 'entregada', 'ok', 'true', '✓', '✔']
const requisitoEntregado = (v) => VALORES_ENTREGADO.includes(normalizarTexto(v)) ? 1 : 0

// Plantilla oficial de carga masiva (Excel con los encabezados que lee la app)
const descargarPlantilla = async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'DualCheck UT'
    const ws = wb.addWorksheet('Estudiantes', { views: [{ state: 'frozen', ySplit: 1 }] })
    const encabezados = Object.values(COLUMNAS_CARGA).map(nombres => nombres[0])
    ws.addRow(encabezados)
    ws.getRow(1).eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C2E' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
    ws.getRow(1).height = 30
    ws.columns.forEach((col, i) => { col.width = Math.max(12, encabezados[i].length + 4) })

    const ins = wb.addWorksheet('Instrucciones')
    ins.columns = [{ width: 110 }]
    ;[
      'Instrucciones para la carga masiva de estudiantes — DualCheck UT',
      '',
      'Llena una fila por estudiante en la hoja "Estudiantes", a partir de la fila 2. No cambies los encabezados.',
      'Columnas obligatorias: Matrícula, Apellido Paterno, Nombre(s) y Correo Personal.',
      'Requisitos (Datos Estadías, Carta N/A o Convenio, Carta Servicios Escolares): escribe "Sí" o "X" si ya se entregó; déjalo vacío o escribe "No" si está pendiente.',
      'Sexo: M o F.',
      'La contraseña inicial de cada estudiante es su matrícula; el sistema le pedirá cambiarla en su primer acceso.',
      'Si el correo o la matrícula ya existen, esa fila se omite y se informa con su número de fila.',
      'Se aceptan archivos con filas de título antes de los encabezados y con columnas adicionales (se ignoran).',
    ].forEach((t, i) => {
      ins.addRow([t])
      if (i === 0) ins.getRow(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF1F5C2E' } }
    })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_carga_estudiantes.xlsx"')
    await wb.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error('Error generando plantilla:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Listado por periodo: ?periodo=activo (por defecto), ?periodo=<id> o ?periodo=todos.
// Los estudiantes no tienen periodo propio; pertenecen a un periodo por su asignación.
// - activo: los que tienen asignación en el periodo activo, más los pendientes de
//   asignar (sin asignaciones válidas en ningún periodo; las canceladas no cuentan).
// - <id>: los que tuvieron asignación en ese periodo (consulta de periodos anteriores).
// - todos: todos los registros.
const getEstudiantes = async (req, res) => {
  const periodo = req.query.periodo || 'activo'
  try {
    let idPeriodo = null
    if (periodo === 'activo') {
      const [activos] = await db.query('SELECT id FROM periodos WHERE activo = 1 ORDER BY fecha_inicio DESC LIMIT 1')
      idPeriodo = activos[0]?.id ?? null
    } else if (periodo !== 'todos') {
      idPeriodo = parseInt(periodo)
      if (Number.isNaN(idPeriodo)) return res.status(400).json({ error: 'Periodo no válido' })
    }

    // Asignación de referencia: la del periodo consultado (o la más reciente si no hay
    // periodo), priorizando las que no están canceladas
    // Mismo criterio que "pendientes de asignar" en asignacionesController
    const pendientes = `NOT EXISTS (SELECT 1 FROM asignaciones x WHERE x.id_estudiante = e.id AND x.estatus <> 'cancelada')`
    let where = ''
    if (periodo === 'activo') where = idPeriodo ? `WHERE (a.id IS NOT NULL OR ${pendientes})` : `WHERE ${pendientes}`
    else if (idPeriodo) where = 'WHERE a.id IS NOT NULL'

    const [rows] = await db.query(`
      SELECT e.*, u.correo, u.estatus,
        emp.nombre_empresa, emp.nombre_estadia,
        a.estatus AS asignacion_estatus,
        CONCAT(d.nombre, ' ', d.apellido_p) AS asesor,
        p.nombre AS asignacion_periodo
      FROM estudiantes e
      JOIN usuarios u ON e.id_usuario = u.id
      LEFT JOIN empresas_estadia emp ON emp.id_estudiante = e.id
      LEFT JOIN asignaciones a ON a.id = (
        SELECT a2.id FROM asignaciones a2
        WHERE a2.id_estudiante = e.id ${idPeriodo ? 'AND a2.id_periodo = ?' : ''}
        ORDER BY a2.estatus = 'cancelada', a2.fecha_asignacion DESC, a2.id DESC
        LIMIT 1
      )
      LEFT JOIN docentes d ON d.id = a.id_docente
      LEFT JOIN periodos p ON p.id = a.id_periodo
      ${where}
      ORDER BY e.apellido_p, e.apellido_m, e.nombre
    `, idPeriodo ? [idPeriodo] : [])
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
    direccion, colonia, cp, sexo, correo_personal,
    req_datos_estadia, req_carta_no_adeudo, req_carta_servicios,
    nombre_estadia, nombre_empresa, rfc, nombre_responsable,
    puesto_responsable, emp_direccion, emp_colonia, emp_cp,
    emp_telefono, emp_correo, giro, tamano, regimen_juridico
  } = recortar(req.body)

  if (!matricula || !nombre || !apellido_p || !correo_personal) {
    return res.status(400).json({ error: 'Matrícula, nombre, apellido paterno y correo personal son requeridos' })
  }
  if (!CORREO_VALIDO.test(correo_personal)) {
    return res.status(400).json({ error: 'El correo personal no tiene un formato válido' })
  }
  if (sexo && !['M', 'F'].includes(sexo)) {
    return res.status(400).json({ error: 'El sexo debe ser M o F' })
  }

  try {
    const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo_personal])
    if (existe.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' })
    const [matriculaExiste] = await db.query('SELECT id FROM estudiantes WHERE matricula = ?', [matricula])
    if (matriculaExiste.length > 0) return res.status(400).json({ error: `La matrícula ${matricula} ya está registrada` })

    const password_hash = await bcrypt.hash(matricula, 10)
    const conn = await db.getConnection()
    await conn.beginTransaction()

    try {
      const [usuarioResult] = await conn.query(
        'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
        [correo_personal, password_hash, 'estudiante', 1]
      )

      const [estResult] = await conn.query(`
        INSERT INTO estudiantes 
          (id_usuario, matricula, nombre, apellido_p, apellido_m, correo_personal, grupo, generacion,
           abrev_carrera, carrera, programa, telefono_celular, telefono_casa,
           direccion, colonia, cp, sexo,
           req_datos_estadia, req_carta_no_adeudo, req_carta_servicios)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null, correo_personal,
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
    responderError(res, error, 'creando estudiante')
  }
}

const actualizarRequisitos = async (req, res) => {
  const { id } = req.params
  const { req_datos_estadia, req_carta_no_adeudo, req_carta_servicios } = req.body

  try {
    const [resultado] = await db.query(`
      UPDATE estudiantes 
      SET req_datos_estadia = ?, req_carta_no_adeudo = ?, req_carta_servicios = ?
      WHERE id = ?
    `, [req_datos_estadia ? 1 : 0, req_carta_no_adeudo ? 1 : 0, req_carta_servicios ? 1 : 0, id])
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

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
  } = recortar(req.body)

  try {
    const [estudiante] = await db.query('SELECT id FROM estudiantes WHERE id = ?', [id])
    if (estudiante.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

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
    responderError(res, error, 'actualizando empresa')
  }
}

// Cambia el estatus especial y lo mantiene coherente con el acceso al sistema:
// baja y baja por reprobación quitan el acceso y cancelan la asignación activa;
// activo y reincorporado lo restauran (el reincorporado vuelve a quedar
// pendiente de asignar porque su asignación anterior quedó cancelada).
const ESTATUS_ESPECIALES = ['activo', 'baja', 'baja_reprobacion', 'reincorporado']
const ES_BAJA = e => e === 'baja' || e === 'baja_reprobacion'

const aplicarEstatus = async (idEstudiante, estatus, idAdmin) => {
  const [estudiante] = await db.query('SELECT id_usuario, matricula FROM estudiantes WHERE id = ?', [idEstudiante])
  if (estudiante.length === 0) return null

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('UPDATE estudiantes SET estatus_especial = ? WHERE id = ?', [estatus, idEstudiante])
    await conn.query('UPDATE usuarios SET estatus = ? WHERE id = ?', [ES_BAJA(estatus) ? 0 : 1, estudiante[0].id_usuario])
    let canceladas = 0
    if (ES_BAJA(estatus)) {
      const [r] = await conn.query("UPDATE asignaciones SET estatus = 'cancelada' WHERE id_estudiante = ? AND estatus = 'activa'", [idEstudiante])
      canceladas = r.affectedRows
    }
    await conn.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [idAdmin, ES_BAJA(estatus) ? 'BAJA_ESTUDIANTE' : 'CAMBIO_ESTATUS', 'estudiantes',
        `Estudiante ${estudiante[0].matricula}: estatus ${estatus}${canceladas ? `, ${canceladas} asignación cancelada` : ''}`]
    )
    await conn.commit()
    return { canceladas }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

const MENSAJE_ESTATUS = {
  activo: 'Estatus actualizado: el estudiante está activo y puede iniciar sesión.',
  reincorporado: 'Estudiante reincorporado: puede iniciar sesión y queda pendiente de asignar asesor.',
  baja: 'Estudiante dado de baja: ya no puede iniciar sesión.',
  baja_reprobacion: 'Baja por reprobación registrada: el estudiante ya no puede iniciar sesión.',
}

const actualizarEstatusEspecial = async (req, res) => {
  const { id } = req.params
  const { estatus_especial } = req.body

  if (!ESTATUS_ESPECIALES.includes(estatus_especial)) {
    return res.status(400).json({ error: 'Estatus no válido' })
  }

  try {
    const resultado = await aplicarEstatus(id, estatus_especial, req.usuario.id)
    if (!resultado) return res.status(404).json({ error: 'Estudiante no encontrado' })
    res.json({
      mensaje: MENSAJE_ESTATUS[estatus_especial] +
        (resultado.canceladas ? ' Su asignación activa se canceló.' : '')
    })
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
    const filas = xlsx.utils.sheet_to_json(hoja, { header: 1, defval: '' })

    // El encabezado puede no estar en la primera fila (el formato institucional
    // tiene filas de título): se toma la primera fila que tenga "Matrícula"
    const filaEncabezado = filas.slice(0, 20).findIndex(f => f.some(c => normalizarTexto(c) === 'matricula'))
    if (filaEncabezado === -1) {
      return res.status(400).json({ error: 'No se encontró la fila de encabezados: falta la columna "Matrícula". Descarga la plantilla para ver el formato.' })
    }

    // Índice de columna por campo (si un nombre se repite, se usa la primera aparición:
    // en el formato institucional, los datos del alumno van antes que los de la empresa)
    const encabezados = filas[filaEncabezado].map(normalizarTexto)
    const indice = {}
    for (const [campo, nombres] of Object.entries(COLUMNAS_CARGA)) {
      const aceptados = nombres.map(normalizarTexto)
      const i = encabezados.findIndex(h => aceptados.includes(h))
      if (i !== -1) indice[campo] = i
    }
    const faltantes = ['matricula', 'nombre', 'apellido_p', 'correo_personal'].filter(c => indice[c] === undefined)
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: `Al archivo le faltan las columnas: ${faltantes.map(c => COLUMNAS_CARGA[c][0]).join(', ')}. Descarga la plantilla para ver el formato.`
      })
    }

    const datos = filas.slice(filaEncabezado + 1)
    const valor = (f, campo) => indice[campo] === undefined ? '' : String(f[indice[campo]] ?? '').trim()
    const resultados = { exitosos: 0, errores: [] }

    for (let i = 0; i < datos.length; i++) {
      const f = datos[i]
      const numFila = filaEncabezado + i + 2 // fila tal como se ve en Excel
      if (f.every(c => String(c).trim() === '')) continue

      const matricula = valor(f, 'matricula')
      const nombre = valor(f, 'nombre')
      const apellido_p = valor(f, 'apellido_p')
      const apellido_m = valor(f, 'apellido_m')
      const correo_personal = valor(f, 'correo_personal')
      const grupo = valor(f, 'grupo')
      const generacion = valor(f, 'generacion')
      const abrev_carrera = valor(f, 'abrev_carrera')
      const carrera = valor(f, 'carrera')
      const programa = valor(f, 'programa')
      const telefono_celular = valor(f, 'telefono_celular')
      const telefono_casa = valor(f, 'telefono_casa')
      const direccion = valor(f, 'direccion')
      const colonia = valor(f, 'colonia')
      const cp = valor(f, 'cp')
      const sexo = valor(f, 'sexo').toUpperCase()
      const req_datos_estadia = requisitoEntregado(valor(f, 'req_datos_estadia'))
      const req_carta_no_adeudo = requisitoEntregado(valor(f, 'req_carta_no_adeudo'))
      const req_carta_servicios = requisitoEntregado(valor(f, 'req_carta_servicios'))

      if (!matricula || !nombre || !apellido_p || !correo_personal) {
        resultados.errores.push({ fila: numFila, mensaje: 'Faltan campos requeridos (Matrícula, Nombre(s), Apellido Paterno, Correo Personal)' })
        continue
      }

      try {
        const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo_personal])
        if (existe.length > 0) {
          resultados.errores.push({ fila: numFila, mensaje: `Correo ${correo_personal} ya registrado` })
          continue
        }

        const password_hash = await bcrypt.hash(matricula, 10)
        const conn = await db.getConnection()
        await conn.beginTransaction()

        try {
          const [usuarioResult] = await conn.query(
            'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
            [correo_personal, password_hash, 'estudiante', 1]
          )

          await conn.query(`
            INSERT INTO estudiantes
              (id_usuario, matricula, nombre, apellido_p, apellido_m, correo_personal, grupo, generacion,
               abrev_carrera, carrera, programa, telefono_celular, telefono_casa,
               direccion, colonia, cp, sexo,
               req_datos_estadia, req_carta_no_adeudo, req_carta_servicios)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            usuarioResult.insertId, matricula, nombre, apellido_p, apellido_m || null, correo_personal,
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
          resultados.errores.push({
            fila: numFila,
            mensaje: err.code === 'ER_DUP_ENTRY' ? `Matrícula ${matricula} ya registrada` : 'Error insertando registro'
          })
        }
      } catch {
        resultados.errores.push({ fila: numFila, mensaje: 'Error procesando fila' })
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
    const resultado = await aplicarEstatus(id, 'baja', req.usuario.id)
    if (!resultado) return res.status(404).json({ error: 'Estudiante no encontrado' })
    res.json({
      mensaje: 'Estudiante dado de baja correctamente' +
        (resultado.canceladas ? '. Su asignación activa se canceló.' : '')
    })
  } catch (error) {
    console.error('Error dando de baja:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = {
  getEstudiantes, getEstudiante, crearEstudiante,
  actualizarRequisitos, actualizarEmpresa, actualizarEstatusEspecial,
  cargaMasiva, bajaEstudiante, descargarPlantilla
}
