/**
 * Script de siembra de datos de prueba para DualCheck UT.
 *
 * Crea un periodo activo (si no existe uno), 4 docentes, 14 estudiantes con
 * distintos estatus/requisitos, 10 asignaciones docente-estudiante, semanas
 * de asistencia ya registradas (para simular uso cotidiano), y 3 solicitudes
 * de corrección en distintos estados (PENDIENTE, APROBADA, RECHAZADA) para
 * poder probar de inmediato el panel de Correcciones sin tener que generarlas
 * a mano cambiando de usuario.
 *
 * Es seguro correrlo más de una vez: si un correo ya existe, ese docente o
 * estudiante se reutiliza (no se duplica) y solo se completa lo que falte.
 *
 * Uso (desde la carpeta server/):
 *   node scripts/seed_datos_prueba.js
 *
 * Todos los correos de prueba usan el dominio ficticio "seed.local", para
 * poder identificarlos y borrarlos fácilmente después. Ver limpiar_datos_prueba.sql
 * en esta misma carpeta para revertir todo lo que crea este script.
 *
 * NOTA: este script no usa acentos en nombres/apellidos de prueba a propósito,
 * para no arriesgarnos a repetir el problema de codificación (cp850 vs utf8mb4)
 * que ya tuvimos con mysqldump en Windows.
 */

const bcrypt = require('bcryptjs')
const db = require('../src/config/db')

const DOMINIO_SEED = 'seed.local'
const ADMIN_CORREO = process.env.SEED_ADMIN_CORREO || 'admin@dualcheck.edu'

// ─── Datos de prueba ─────────────────────────────────────────────────────────

const DOCENTES = [
  { nombre: 'Jose', apellido_p: 'Ramirez', apellido_m: 'Torres', programa_educativo: 'Ingenieria en Entornos Virtuales y Negocios Digitales' },
  { nombre: 'Maria Fernanda', apellido_p: 'Lopez', apellido_m: 'Garcia', programa_educativo: 'Ingenieria en Tecnologias de la Informacion' },
  { nombre: 'Carlos Alberto', apellido_p: 'Medina', apellido_m: 'Sanchez', programa_educativo: 'Ingenieria en Mantenimiento Industrial' },
  { nombre: 'Ana Lucia', apellido_p: 'Torres', apellido_m: 'Villanueva', programa_educativo: 'TSU en Desarrollo de Software Multiplataforma' },
]

// requisitos: true = cumplido. estatus_especial por defecto 'activo'.
const ESTUDIANTES = [
  { nombre: 'Juan', apellido_p: 'Perez', apellido_m: 'Hernandez', grupo: '23IEVND3N', carrera: 'Ingenieria en Entornos Virtuales y Negocios Digitales', abrev_carrera: 'IEVND', sexo: 'M', requisitos: true },
  { nombre: 'Sofia', apellido_p: 'Gonzalez', apellido_m: 'Ruiz', grupo: '23IEVND3N', carrera: 'Ingenieria en Entornos Virtuales y Negocios Digitales', abrev_carrera: 'IEVND', sexo: 'F', requisitos: true },
  { nombre: 'Luis Fernando', apellido_p: 'Castillo', apellido_m: 'Reyes', grupo: '23ITI4B', carrera: 'Ingenieria en Tecnologias de la Informacion', abrev_carrera: 'ITI', sexo: 'M', requisitos: true },
  { nombre: 'Valeria', apellido_p: 'Morales', apellido_m: 'Cruz', grupo: '23ITI4B', carrera: 'Ingenieria en Tecnologias de la Informacion', abrev_carrera: 'ITI', sexo: 'F', requisitos: true },
  { nombre: 'Andres Felipe', apellido_p: 'Rojas', apellido_m: 'Diaz', grupo: '24DSM1A', carrera: 'TSU en Desarrollo de Software Multiplataforma', abrev_carrera: 'DSM', sexo: 'M', requisitos: true },
  { nombre: 'Camila', apellido_p: 'Jimenez', apellido_m: 'Ortiz', grupo: '24DSM1A', carrera: 'TSU en Desarrollo de Software Multiplataforma', abrev_carrera: 'DSM', sexo: 'F', requisitos: true },
  { nombre: 'Ricardo', apellido_p: 'Vazquez', apellido_m: 'Mendoza', grupo: '24MI2A', carrera: 'Ingenieria en Mantenimiento Industrial', abrev_carrera: 'MI', sexo: 'M', requisitos: true },
  { nombre: 'Fernanda', apellido_p: 'Aguilar', apellido_m: 'Soto', grupo: '24MI2A', carrera: 'Ingenieria en Mantenimiento Industrial', abrev_carrera: 'MI', sexo: 'F', requisitos: true },
  { nombre: 'Jorge Luis', apellido_p: 'Ramos', apellido_m: 'Flores', grupo: '23IEVND3N', carrera: 'Ingenieria en Entornos Virtuales y Negocios Digitales', abrev_carrera: 'IEVND', sexo: 'M', requisitos: true },
  { nombre: 'Paola Beatriz', apellido_p: 'Herrera', apellido_m: 'Nunez', grupo: '23ITI4B', carrera: 'Ingenieria en Tecnologias de la Informacion', abrev_carrera: 'ITI', sexo: 'F', requisitos: true },
  // Requisitos incompletos a propósito -> prueba el filtro "Incompletos" y el bloqueo al asignar
  { nombre: 'Mauricio', apellido_p: 'Salazar', apellido_m: 'Pena', grupo: '24DSM1A', carrera: 'TSU en Desarrollo de Software Multiplataforma', abrev_carrera: 'DSM', sexo: 'M', requisitos: false },
  // Dado de baja a propósito -> prueba el filtro "Baja"
  { nombre: 'Karla Patricia', apellido_p: 'Guerrero', apellido_m: 'Leon', grupo: '24MI2A', carrera: 'Ingenieria en Mantenimiento Industrial', abrev_carrera: 'MI', sexo: 'F', requisitos: true, estatus_especial: 'baja' },
  // Reincorporado a propósito -> prueba el filtro "Reincorporado"
  { nombre: 'Emmanuel', apellido_p: 'Contreras', apellido_m: 'Rivas', grupo: '23IEVND3N', carrera: 'Ingenieria en Entornos Virtuales y Negocios Digitales', abrev_carrera: 'IEVND', sexo: 'M', requisitos: true, estatus_especial: 'reincorporado' },
  // Elegible pero sin asignar a propósito -> prueba "Pendientes de asignar"
  { nombre: 'Daniela', apellido_p: 'Ibarra', apellido_m: 'Campos', grupo: '23ITI4B', carrera: 'Ingenieria en Tecnologias de la Informacion', abrev_carrera: 'ITI', sexo: 'F', requisitos: true },
]

// índices (1-based, según el orden del arreglo ESTUDIANTES) por docente
const ASIGNACIONES_PLAN = [
  { docente: 0, estudiantes: [1, 5, 9] },
  { docente: 1, estudiantes: [2, 6, 13] },
  { docente: 2, estudiantes: [3, 7, 10] },
  { docente: 3, estudiantes: [4, 8] },
]

// Escenarios especiales por número de estudiante (1-based)
const NO_VALIDADOS = [5, 8]       // el docente aún no valida la asignación
const ESCENARIO_PENDIENTE = 3      // semana con solicitud de corrección PENDIENTE
const ESCENARIO_APROBADA = 4       // semana con solicitud ya APROBADA
const ESCENARIO_RECHAZADA = 6      // semana con solicitud ya RECHAZADA
const ESCENARIO_ESPERANDO_ESTUDIANTE = 7 // semana actual solo confirmada por el docente

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtFecha = (d) => d.toISOString().substring(0, 10)
const fmtFechaHora = (d) => d.toISOString().slice(0, 19).replace('T', ' ')

function sumarDias(fecha, dias) {
  const r = new Date(fecha)
  r.setDate(r.getDate() + dias)
  return r
}

// Misma fórmula que calcularSemanaActual() en asistenciaController.js
function calcularSemanaActual(fechaInicio) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const inicio = new Date(fechaInicio)
  inicio.setHours(0, 0, 0, 0)
  const diffDias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return 0
  return Math.min(Math.floor(diffDias / 7) + 1, 13)
}

async function obtenerOCrearPeriodoActivo(conn, idUsuarioCreador) {
  const [existentes] = await conn.query('SELECT id, nombre, fecha_inicio FROM periodos WHERE activo = 1 LIMIT 1')
  if (existentes.length > 0) {
    console.log(`→ Usando periodo activo existente: "${existentes[0].nombre}" (id ${existentes[0].id})`)
    return existentes[0]
  }

  const hoy = new Date()
  const inicio = sumarDias(hoy, -28) // arranca 4 semanas atrás, para tener semanas pasadas que corregir
  const fin = sumarDias(inicio, 90)
  const nombre = `Periodo de prueba ${fmtFecha(inicio)}`

  await conn.query('UPDATE periodos SET activo = 0')
  const [res] = await conn.query(
    'INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, activo, creado_por) VALUES (?, ?, ?, 1, ?)',
    [nombre, fmtFecha(inicio), fmtFecha(fin), idUsuarioCreador]
  )
  console.log(`→ Periodo creado y activado: "${nombre}" (id ${res.insertId})`)
  return { id: res.insertId, nombre, fecha_inicio: fmtFecha(inicio) }
}

async function obtenerOCrearDocente(conn, d) {
  const correo = `${d.nombre.split(' ')[0].toLowerCase()}.${d.apellido_p.toLowerCase()}@${DOMINIO_SEED}`

  const [existeUsuario] = await conn.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
  if (existeUsuario.length > 0) {
    const [docenteExistente] = await conn.query('SELECT id FROM docentes WHERE id_usuario = ?', [existeUsuario[0].id])
    if (docenteExistente.length > 0) return { id: docenteExistente[0].id, correo, esNuevo: false }
  }

  const passwordInicial = `${d.apellido_p.toLowerCase()}123`
  const passwordHash = await bcrypt.hash(passwordInicial, 10)

  const [usuarioResult] = await conn.query(
    'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
    [correo, passwordHash, 'docente', 0] // 0 = ya no pide cambio, para no interrumpir las pruebas
  )
  const [docenteResult] = await conn.query(
    'INSERT INTO docentes (id_usuario, nombre, apellido_p, apellido_m, programa_educativo) VALUES (?, ?, ?, ?, ?)',
    [usuarioResult.insertId, d.nombre, d.apellido_p, d.apellido_m, d.programa_educativo]
  )
  return { id: docenteResult.insertId, correo, passwordInicial, esNuevo: true }
}

async function obtenerOCrearEstudiante(conn, e, matricula) {
  const correo = `${e.nombre.split(' ')[0].toLowerCase()}.${e.apellido_p.toLowerCase()}@alumno.${DOMINIO_SEED}`

  const [existeUsuario] = await conn.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
  if (existeUsuario.length > 0) {
    const [estudianteExistente] = await conn.query('SELECT id FROM estudiantes WHERE id_usuario = ?', [existeUsuario[0].id])
    if (estudianteExistente.length > 0) return { id: estudianteExistente[0].id, id_usuario: existeUsuario[0].id, correo, esNuevo: false }
  }

  const passwordHash = await bcrypt.hash(matricula, 10)
  const [usuarioResult] = await conn.query(
    'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
    [correo, passwordHash, 'estudiante', 0]
  )
  const [estResult] = await conn.query(`
    INSERT INTO estudiantes
      (id_usuario, matricula, nombre, apellido_p, apellido_m, correo_personal, grupo,
       abrev_carrera, carrera, sexo,
       req_datos_estadia, req_carta_no_adeudo, req_carta_servicios, estatus_especial)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    usuarioResult.insertId, matricula, e.nombre, e.apellido_p, e.apellido_m, correo, e.grupo,
    e.abrev_carrera, e.carrera, e.sexo,
    e.requisitos ? 1 : 0, e.requisitos ? 1 : 0, e.requisitos ? 1 : 0,
    e.estatus_especial || 'activo'
  ])

  if (e.estatus_especial === 'baja') {
    await conn.query('UPDATE usuarios SET estatus = 0 WHERE id = ?', [usuarioResult.insertId])
  }

  return { id: estResult.insertId, id_usuario: usuarioResult.insertId, correo, matricula, esNuevo: true }
}

async function crearAsignacion(conn, idEstudiante, idDocente, idPeriodo, validada) {
  const [existente] = await conn.query(
    'SELECT id, validada_por_docente FROM asignaciones WHERE id_estudiante = ? AND id_docente = ? AND id_periodo = ?',
    [idEstudiante, idDocente, idPeriodo]
  )
  if (existente.length > 0) return existente[0].id

  const [res] = await conn.query(
    'INSERT INTO asignaciones (id_estudiante, id_docente, id_periodo, validada_por_docente, estatus) VALUES (?, ?, ?, ?, ?)',
    [idEstudiante, idDocente, idPeriodo, validada ? 1 : 0, 'activa']
  )
  return res.insertId
}

async function registrarSemanaCompleta(conn, idAsignacion, semana, fechaBase) {
  const [existente] = await conn.query(
    'SELECT id FROM asistencia WHERE id_asignacion = ? AND semana = ?', [idAsignacion, semana]
  )
  if (existente.length > 0) return
  const fechaDoc = fmtFechaHora(sumarDias(fechaBase, 1))
  const fechaEst = fmtFechaHora(sumarDias(fechaBase, 1))
  await conn.query(
    `INSERT INTO asistencia (id_asignacion, semana, confirmacion_docente, fecha_docente, confirmacion_estudiante, fecha_estudiante)
     VALUES (?, ?, 1, ?, 1, ?)`,
    [idAsignacion, semana, fechaDoc, fechaEst]
  )
}

async function registrarSoloDocente(conn, idAsignacion, semana, fechaBase) {
  const [existente] = await conn.query(
    'SELECT id FROM asistencia WHERE id_asignacion = ? AND semana = ?', [idAsignacion, semana]
  )
  if (existente.length > 0) return
  await conn.query(
    `INSERT INTO asistencia (id_asignacion, semana, confirmacion_docente, fecha_docente)
     VALUES (?, ?, 1, ?)`,
    [idAsignacion, semana, fmtFechaHora(fechaBase)]
  )
}

async function crearSolicitudCorreccion(conn, { idUsuarioDocente, idAsignacion, semana, docenteNombre, estudianteTexto, motivo, estatus, fechaBase }) {
  // Idempotencia: si ya existe una solicitud para esta asignación+semana, no duplicar
  const [existentes] = await conn.query(
    `SELECT detalle FROM bitacora WHERE accion = 'SOLICITUD_CORRECCION'`
  )
  const yaExiste = existentes.some(r => {
    try {
      const d = JSON.parse(r.detalle)
      return d.id_asignacion === idAsignacion && d.semana === semana
    } catch { return false }
  })
  if (yaExiste) return false

  const detalle = {
    tipo: 'SOLICITUD_CORRECCION_ASISTENCIA',
    semana,
    id_asignacion: idAsignacion,
    docente: docenteNombre,
    estudiante: estudianteTexto,
    motivo,
    fecha_solicitud: fmtFechaHora(fechaBase),
    estatus: 'PENDIENTE'
  }

  if (estatus === 'APROBADA') {
    detalle.estatus = 'APROBADA'
    detalle.aprobada_por = ADMIN_CORREO
    detalle.fecha_aprobacion = fmtFechaHora(sumarDias(fechaBase, 1))
  } else if (estatus === 'RECHAZADA') {
    detalle.estatus = 'RECHAZADA'
    detalle.rechazada_por = ADMIN_CORREO
    detalle.fecha_rechazo = fmtFechaHora(sumarDias(fechaBase, 1))
    detalle.motivo_rechazo = 'La fecha no coincide con el registro de asesorias. Favor de confirmar directamente con el estudiante.'
  }

  await conn.query(
    'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle, fecha_hora) VALUES (?, ?, ?, ?, ?)',
    [idUsuarioDocente, 'SOLICITUD_CORRECCION', 'asistencia', JSON.stringify(detalle), fmtFechaHora(fechaBase)]
  )

  if (estatus === 'APROBADA') {
    // Igual que aprobarCorreccion(): registra la asistencia retroactiva
    await conn.query(
      `INSERT INTO asistencia (id_asignacion, semana, confirmacion_docente, fecha_docente)
       VALUES (?, ?, 1, ?)`,
      [idAsignacion, semana, detalle.fecha_aprobacion]
    )
    await conn.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [idUsuarioDocente, 'APROBACION_CORRECCION', 'asistencia',
        `[SEED] Corrección aprobada: semana ${semana} para asignación ${idAsignacion}.`]
    )
  } else if (estatus === 'RECHAZADA') {
    await conn.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [idUsuarioDocente, 'RECHAZO_CORRECCION', 'asistencia',
        `[SEED] Corrección rechazada: semana ${semana} para asignación ${idAsignacion}.`]
    )
  }

  return true
}

// ─── Script principal ────────────────────────────────────────────────────────

async function main() {
  const conn = await db.getConnection()
  console.log('Sembrando datos de prueba en dualcheck_db...\n')

  try {
    const [admins] = await conn.query(
      "SELECT id FROM usuarios WHERE perfil = 'administrador' ORDER BY id LIMIT 1"
    )
    if (admins.length === 0) {
      throw new Error(
        'No hay ninguna cuenta con perfil "administrador" en la base de datos. ' +
        'El script necesita al menos un administrador ya existente (lo usa como "creado_por" del periodo). ' +
        'Crea uno primero (o restaura tu admin habitual) y vuelve a correr el script.'
      )
    }
    const idUsuarioCreador = admins[0].id

    const periodo = await obtenerOCrearPeriodoActivo(conn, idUsuarioCreador)
    const semanaActual = calcularSemanaActual(periodo.fecha_inicio)
    console.log(`→ Semana actual calculada del periodo: ${semanaActual}\n`)

    // Docentes
    console.log('Creando docentes...')
    const docentes = []
    for (const d of DOCENTES) {
      const r = await obtenerOCrearDocente(conn, d)
      docentes.push(r)
      console.log(`  ${r.esNuevo ? '✓ creado' : '· ya existía'} — ${d.nombre} ${d.apellido_p} (${r.correo})` +
        (r.esNuevo ? ` — password inicial: ${r.passwordInicial}` : ''))
    }

    // Estudiantes
    console.log('\nCreando estudiantes...')
    const estudiantes = []
    for (let i = 0; i < ESTUDIANTES.length; i++) {
      const e = ESTUDIANTES[i]
      const matricula = `SEED${String(i + 1).padStart(3, '0')}`
      const r = await obtenerOCrearEstudiante(conn, e, matricula)
      estudiantes.push(r)
      console.log(`  ${r.esNuevo ? '✓ creado' : '· ya existía'} — ${e.nombre} ${e.apellido_p} (matrícula ${matricula} = password)` +
        (e.estatus_especial ? ` [${e.estatus_especial}]` : '') +
        (!e.requisitos ? ' [requisitos incompletos]' : ''))
    }

    // Asignaciones
    console.log('\nCreando asignaciones...')
    const asignacionPorEstudiante = {} // índice 1-based -> { idAsignacion, idDocente, docenteNombre, estudianteTexto }
    for (const plan of ASIGNACIONES_PLAN) {
      const docente = docentes[plan.docente]
      const docenteData = DOCENTES[plan.docente]
      for (const numEst of plan.estudiantes) {
        const est = estudiantes[numEst - 1]
        const estData = ESTUDIANTES[numEst - 1]
        const validada = !NO_VALIDADOS.includes(numEst)
        const idAsignacion = await crearAsignacion(conn, est.id, docente.id, periodo.id, validada)
        asignacionPorEstudiante[numEst] = {
          idAsignacion,
          idUsuarioDocente: (await conn.query('SELECT id_usuario FROM docentes WHERE id = ?', [docente.id]))[0][0].id_usuario,
          docenteNombre: `${docenteData.nombre} ${docenteData.apellido_p}`,
          estudianteTexto: `${estData.nombre} ${estData.apellido_p} (SEED${String(numEst).padStart(3, '0')})`,
          validada
        }
        console.log(`  ${estData.nombre} ${estData.apellido_p} → ${docenteData.nombre} ${docenteData.apellido_p}` +
          (validada ? '' : ' [sin validar aún]'))
      }
    }

    // Asistencia — solo para asignaciones validadas
    console.log('\nRegistrando semanas de asistencia...')
    const inicioPeriodo = new Date(periodo.fecha_inicio)
    const semanasPasadas = Math.max(0, semanaActual - 1)

    for (const [numEstStr, info] of Object.entries(asignacionPorEstudiante)) {
      const numEst = parseInt(numEstStr)
      if (!info.validada) continue

      const fechaSemana = (s) => sumarDias(inicioPeriodo, (s - 1) * 7)

      for (let s = 1; s <= semanasPasadas; s++) {
        if (numEst === ESCENARIO_PENDIENTE && s === 2) {
          const creada = await crearSolicitudCorreccion(conn, {
            idUsuarioDocente: info.idUsuarioDocente,
            idAsignacion: info.idAsignacion,
            semana: s,
            docenteNombre: info.docenteNombre,
            estudianteTexto: info.estudianteTexto,
            motivo: 'Se me olvido registrar la asistencia ese dia. El estudiante si asistio a la asesoria en el horario habitual.',
            estatus: 'PENDIENTE',
            fechaBase: sumarDias(fechaSemana(s), 2)
          })
          console.log(creada
            ? `  [PENDIENTE] Solicitud de corrección creada — ${info.estudianteTexto}, semana ${s}`
            : `  [PENDIENTE] Solicitud de corrección ya existía — ${info.estudianteTexto}, semana ${s}`)
          continue
        }
        if (numEst === ESCENARIO_APROBADA && s === 3) {
          const creada = await crearSolicitudCorreccion(conn, {
            idUsuarioDocente: info.idUsuarioDocente,
            idAsignacion: info.idAsignacion,
            semana: s,
            docenteNombre: info.docenteNombre,
            estudianteTexto: info.estudianteTexto,
            motivo: 'Registre la semana equivocada por error de dedo, esta es la correccion.',
            estatus: 'APROBADA',
            fechaBase: sumarDias(fechaSemana(s), 2)
          })
          console.log(creada
            ? `  [APROBADA]  Solicitud de corrección ya resuelta — ${info.estudianteTexto}, semana ${s}`
            : `  [APROBADA]  Ya existía — ${info.estudianteTexto}, semana ${s}`)
          continue
        }
        if (numEst === ESCENARIO_RECHAZADA && s === 4) {
          const creada = await crearSolicitudCorreccion(conn, {
            idUsuarioDocente: info.idUsuarioDocente,
            idAsignacion: info.idAsignacion,
            semana: s,
            docenteNombre: info.docenteNombre,
            estudianteTexto: info.estudianteTexto,
            motivo: 'El estudiante me comento que asistio pero no alcance a registrarlo ese dia.',
            estatus: 'RECHAZADA',
            fechaBase: sumarDias(fechaSemana(s), 2)
          })
          console.log(creada
            ? `  [RECHAZADA] Solicitud de corrección ya resuelta — ${info.estudianteTexto}, semana ${s}`
            : `  [RECHAZADA] Ya existía — ${info.estudianteTexto}, semana ${s}`)
          continue
        }

        await registrarSemanaCompleta(conn, info.idAsignacion, s, fechaSemana(s))
      }

      // Semana actual: la mayoría queda sin registrar (aún no pasa la sesión de hoy),
      // salvo el escenario "esperando confirmación del estudiante"
      if (numEst === ESCENARIO_ESPERANDO_ESTUDIANTE && semanaActual >= 1) {
        await registrarSoloDocente(conn, info.idAsignacion, semanaActual, fechaSemana(semanaActual))
        console.log(`  [PARCIAL]   Semana actual solo confirmada por el docente — ${info.estudianteTexto}`)
      }
    }

    console.log('\n✅ Listo. Resumen de credenciales de prueba:')
    console.log('   Docentes: correo mostrado arriba / password mostrado arriba (si eran nuevos)')
    console.log('   Estudiantes: correo mostrado arriba / password = su matrícula (SEED001, SEED002, ...)')
    console.log('\n   Para revisar la solicitud PENDIENTE ahora mismo: entra como administrador → Correcciones.')
  } finally {
    conn.release()
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Error sembrando datos de prueba:', err)
    process.exit(1)
  })
