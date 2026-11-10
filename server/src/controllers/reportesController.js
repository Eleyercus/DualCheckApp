const db = require('../config/db')
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')

// ── Datos base ────────────────────────────────────────────────────────────────

const getDatosEstudiante = async (id_estudiante, id_periodo) => {
  const [est] = await db.query(`
    SELECT e.*, u.correo,
      a.id AS id_asignacion, a.estatus AS estatus_asignacion,
      a.validada_por_docente,
      d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p,
      p.nombre AS periodo_nombre, p.fecha_inicio, p.fecha_fin
    FROM estudiantes e
    JOIN usuarios u ON e.id_usuario = u.id
    JOIN asignaciones a ON a.id_estudiante = e.id
    JOIN docentes d ON a.id_docente = d.id
    JOIN periodos p ON a.id_periodo = p.id
    WHERE e.id = ? AND a.id_periodo = ?
    ORDER BY a.estatus = 'cancelada', a.fecha_asignacion DESC, a.id DESC
    LIMIT 1
  `, [id_estudiante, id_periodo])

  if (est.length === 0) return null

  const [asistencia] = await db.query(
    'SELECT * FROM asistencia WHERE id_asignacion = ? ORDER BY semana',
    [est[0].id_asignacion]
  )

  return { ...est[0], asistencia }
}

const getDatosDocente = async (id_docente, id_periodo) => {
  const [doc] = await db.query(`
    SELECT d.*, u.correo, p.nombre AS periodo_nombre, p.fecha_inicio, p.fecha_fin
    FROM docentes d
    JOIN usuarios u ON d.id_usuario = u.id
    JOIN periodos p ON p.id = ?
    WHERE d.id = ?
  `, [id_periodo, id_docente])

  if (doc.length === 0) return null

  const [asignaciones] = await db.query(`
    SELECT a.id AS id_asignacion, a.estatus, a.validada_por_docente,
      e.id AS id_estudiante, e.matricula, e.nombre, e.apellido_p, e.apellido_m,
      e.grupo, e.carrera
    FROM asignaciones a
    JOIN estudiantes e ON a.id_estudiante = e.id
    WHERE a.id_docente = ? AND a.id_periodo = ?
    ORDER BY e.apellido_p, e.nombre
  `, [id_docente, id_periodo])

  for (const asig of asignaciones) {
    const [asistencia] = await db.query(
      'SELECT * FROM asistencia WHERE id_asignacion = ? ORDER BY semana',
      [asig.id_asignacion]
    )
    asig.asistencia = asistencia
  }

  return { ...doc[0], asignaciones }
}

const getDatosPeriodo = async (id_periodo) => {
  const [periodo] = await db.query('SELECT * FROM periodos WHERE id = ?', [id_periodo])
  if (periodo.length === 0) return null

  const [asignaciones] = await db.query(`
    SELECT a.id AS id_asignacion, a.estatus, a.validada_por_docente,
      e.id AS id_estudiante, e.matricula, e.nombre, e.apellido_p, e.apellido_m,
      e.grupo, e.carrera,
      d.nombre AS doc_nombre, d.apellido_p AS doc_apellido_p
    FROM asignaciones a
    JOIN estudiantes e ON a.id_estudiante = e.id
    JOIN docentes d ON a.id_docente = d.id
    WHERE a.id_periodo = ?
    ORDER BY e.grupo, e.apellido_p, e.nombre
  `, [id_periodo])

  for (const asig of asignaciones) {
    const [asistencia] = await db.query(
      'SELECT * FROM asistencia WHERE id_asignacion = ? ORDER BY semana',
      [asig.id_asignacion]
    )
    asig.asistencia = asistencia
  }

  return { ...periodo[0], asignaciones }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcularResumen = (asistencia) => {
  const semanas = Array.from({ length: 13 }, (_, i) => i + 1)
  return semanas.map(s => {
    const sem = asistencia.find(a => a.semana === s)
    return {
      semana: s,
      docente: sem?.confirmacion_docente ? '✓' : '-',
      estudiante: sem?.confirmacion_estudiante ? '✓' : '-',
      completa: sem?.confirmacion_docente && sem?.confirmacion_estudiante,
    }
  })
}

const formatFecha = (fecha) => {
  if (!fecha) return '-'
  const f = new Date(fecha)
  return f.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── EXCEL ─────────────────────────────────────────────────────────────────────

const estilosExcel = (ws, wb) => {
  const verde = '1F5C2E'
  const naranja = 'E8720C'
  const dorado = 'C9A84C'
  return { verde, naranja, dorado }
}

const headerExcel = (ws, titulo, periodo_nombre) => {
  ws.mergeCells('A1:N1')
  ws.getCell('A1').value = 'Universidad Tecnológica Cadereyta — DualCheck UT'
  ws.getCell('A1').font = { name: 'Arial', bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C2E' } }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:N2')
  ws.getCell('A2').value = titulo
  ws.getCell('A2').font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1F5C2E' } }
  ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(2).height = 22

  ws.mergeCells('A3:N3')
  ws.getCell('A3').value = `Periodo: ${periodo_nombre}   |   Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`
  ws.getCell('A3').font = { name: 'Arial', size: 10, color: { argb: 'FF6B7280' } }
  ws.getCell('A3').alignment = { horizontal: 'center' }
  ws.getRow(3).height = 18
}

// Reporte por estudiante — Excel
const reporteEstudianteExcel = async (req, res) => {
  const { id_estudiante, id_periodo } = req.params
  const datos = await getDatosEstudiante(id_estudiante, id_periodo)
  if (!datos) return res.status(404).json({ error: 'Datos no encontrados' })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DualCheck UT'
  const ws = wb.addWorksheet('Asistencia')

  headerExcel(ws, `Reporte de Asistencia — ${datos.nombre} ${datos.apellido_p} ${datos.apellido_m}`, datos.periodo_nombre)

  // Info del estudiante
  const infoRows = [
    ['Matrícula', datos.matricula, 'Carrera', datos.carrera || '-'],
    ['Correo', datos.correo, 'Grupo', datos.grupo || '-'],
    ['Asesor', `${datos.doc_nombre} ${datos.doc_apellido_p}`, 'Estatus asignación', datos.estatus_asignacion],
    ['Periodo', datos.periodo_nombre, 'Inicio', formatFecha(datos.fecha_inicio)],
  ]
  let fila = 5
  infoRows.forEach(row => {
    ws.getRow(fila).values = ['', row[0], row[1], '', row[2], row[3]]
    ws.getCell(`B${fila}`).font = { name: 'Arial', bold: true, size: 10 }
    ws.getCell(`E${fila}`).font = { name: 'Arial', bold: true, size: 10 }
    ws.getRow(fila).height = 18
    fila++
  })

  fila++
  // Encabezado tabla semanas
  const headers = ['Semana', 'Docente registró', 'Estudiante confirmó', 'Estado']
  ws.getRow(fila).values = ['', ...headers]
  headers.forEach((_, i) => {
    const cell = ws.getCell(fila, i + 2)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C2E' } }
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(fila).height = 22
  fila++

  const resumen = calcularResumen(datos.asistencia)
  resumen.forEach((s, idx) => {
    const bg = s.completa ? 'FFD1FAE5' : idx % 2 === 0 ? 'FFF4F6F4' : 'FFFFFFFF'
    ws.getRow(fila).values = ['', `Semana ${s.semana}`, s.docente, s.estudiante, s.completa ? 'Completa' : s.docente === '✓' ? 'Pendiente estudiante' : 'Sin registro']
    for (let c = 2; c <= 5; c++) {
      ws.getCell(fila, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      ws.getCell(fila, c).font = { name: 'Arial', size: 10 }
      ws.getCell(fila, c).alignment = { horizontal: 'center' }
    }
    ws.getCell(fila, 2).alignment = { horizontal: 'left' }
    ws.getRow(fila).height = 18
    fila++
  })

  // Totales
  const total = resumen.filter(s => s.completa).length
  ws.getRow(fila).values = ['', 'Total validadas:', '', '', `${total}/13`]
  ws.getCell(fila, 2).font = { name: 'Arial', bold: true, size: 10 }
  ws.getCell(fila, 5).font = { name: 'Arial', bold: true, size: 11, color: { argb: total === 13 ? 'FF1F5C2E' : 'FFDC2626' } }

  ws.columns = [{ width: 2 }, { width: 16 }, { width: 20 }, { width: 22 }, { width: 22 }, { width: 16 }]

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_estudiante_${datos.matricula}_${id_periodo}.xlsx"`)
  await wb.xlsx.write(res)
  res.end()
}

// Reporte por docente — Excel
const reporteDocenteExcel = async (req, res) => {
  const { id_docente, id_periodo } = req.params
  const datos = await getDatosDocente(id_docente, id_periodo)
  if (!datos) return res.status(404).json({ error: 'Datos no encontrados' })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DualCheck UT'
  const ws = wb.addWorksheet('Reporte Docente')

  headerExcel(ws, `Reporte de Docente — ${datos.nombre} ${datos.apellido_p} ${datos.apellido_m}`, datos.periodo_nombre)

  let fila = 5
  ws.getRow(fila).values = ['', 'Correo', datos.correo, '', 'Programa', datos.programa_educativo || '-']
  ws.getRow(fila).height = 18
  ws.getCell(`B${fila}`).font = { name: 'Arial', bold: true, size: 10 }
  ws.getCell(`E${fila}`).font = { name: 'Arial', bold: true, size: 10 }
  fila += 2

  // Encabezado tabla
  const hdrs = ['Matrícula', 'Nombre', 'Grupo', 'S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','Total']
  ws.getRow(fila).values = ['', ...hdrs]
  hdrs.forEach((_, i) => {
    const cell = ws.getCell(fila, i + 2)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C2E' } }
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(fila).height = 20
  fila++

  datos.asignaciones.forEach((asig, idx) => {
    const resumen = calcularResumen(asig.asistencia)
    const total = resumen.filter(s => s.completa).length
    const semanas = resumen.map(s => s.completa ? '✓' : s.docente === '✓' ? '·' : '-')
    const bg = idx % 2 === 0 ? 'FFF4F6F4' : 'FFFFFFFF'

    ws.getRow(fila).values = [
      '', asig.matricula,
      `${asig.nombre} ${asig.apellido_p}`,
      asig.grupo || '-',
      ...semanas,
      `${total}/13`
    ]
    for (let c = 2; c <= 19; c++) {
      ws.getCell(fila, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      ws.getCell(fila, c).font = { name: 'Arial', size: 9 }
      ws.getCell(fila, c).alignment = { horizontal: 'center' }
    }
    ws.getCell(fila, 2).alignment = { horizontal: 'left' }
    ws.getCell(fila, 3).alignment = { horizontal: 'left' }
    ws.getRow(fila).height = 16
    fila++
  })

  ws.columns = [
    { width: 2 }, { width: 12 }, { width: 24 }, { width: 10 },
    ...Array(13).fill({ width: 5 }),
    { width: 8 }
  ]

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_docente_${id_docente}_${id_periodo}.xlsx"`)
  await wb.xlsx.write(res)
  res.end()
}

// Reporte por periodo/grupo — Excel
const reportePeriodoExcel = async (req, res) => {
  const { id_periodo } = req.params
  const datos = await getDatosPeriodo(id_periodo)
  if (!datos) return res.status(404).json({ error: 'Periodo no encontrado' })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DualCheck UT'
  const ws = wb.addWorksheet('Reporte General')

  headerExcel(ws, `Reporte General de Estadías — ${datos.nombre}`, datos.nombre)

  let fila = 5
  ws.getRow(fila).values = ['', 'Inicio', formatFecha(datos.fecha_inicio), '', 'Fin', formatFecha(datos.fecha_fin), '', 'Total estudiantes', datos.asignaciones.length]
  ws.getRow(fila).height = 18
  ;['B','E','H'].forEach(c => { ws.getCell(`${c}${fila}`).font = { name: 'Arial', bold: true, size: 10 } })
  fila += 2

  const hdrs = ['Matrícula', 'Nombre', 'Grupo', 'Carrera', 'Asesor', 'Semanas validadas', 'Progreso', 'Estatus']
  ws.getRow(fila).values = ['', ...hdrs]
  hdrs.forEach((_, i) => {
    const cell = ws.getCell(fila, i + 2)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C2E' } }
    cell.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ws.getRow(fila).height = 22
  fila++

  datos.asignaciones.forEach((asig, idx) => {
    const total = asig.asistencia.filter(a => a.confirmacion_docente && a.confirmacion_estudiante).length
    const pct = Math.round((total / 13) * 100)
    const bg = idx % 2 === 0 ? 'FFF4F6F4' : 'FFFFFFFF'
    const colorTotal = total === 13 ? 'FF166534' : total >= 7 ? 'FFD97706' : 'FFDC2626'

    ws.getRow(fila).values = [
      '', asig.matricula,
      `${asig.nombre} ${asig.apellido_p} ${asig.apellido_m || ''}`.trim(),
      asig.grupo || '-', asig.carrera || '-',
      `${asig.doc_nombre} ${asig.doc_apellido_p}`,
      total, `${pct}%`,
      asig.estatus === 'activa' ? 'Activa' : asig.estatus === 'concluida' ? 'Concluida' : 'Cancelada'
    ]
    for (let c = 2; c <= 9; c++) {
      ws.getCell(fila, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      ws.getCell(fila, c).font = { name: 'Arial', size: 10 }
      ws.getCell(fila, c).alignment = { horizontal: 'center' }
    }
    ws.getCell(fila, 2).alignment = { horizontal: 'left' }
    ws.getCell(fila, 3).alignment = { horizontal: 'left' }
    ws.getCell(fila, 5).alignment = { horizontal: 'left' }
    ws.getCell(fila, 6).alignment = { horizontal: 'left' }
    ws.getCell(fila, 7).font = { name: 'Arial', bold: true, size: 10, color: { argb: colorTotal } }
    ws.getRow(fila).height = 18
    fila++
  })

  ws.columns = [{ width: 2 }, { width: 12 }, { width: 26 }, { width: 12 }, { width: 30 }, { width: 26 }, { width: 10 }, { width: 10 }, { width: 12 }]

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_periodo_${id_periodo}.xlsx"`)
  await wb.xlsx.write(res)
  res.end()
}

// ── PDF ───────────────────────────────────────────────────────────────────────

// Las fuentes estándar de PDFKit (Helvetica) no incluyen ✓: en los PDF se usa texto
const MARCA_PDF = { completa: 'Sí', soloDocente: 'D', sinRegistro: '-' }
const COLOR_TOTAL = total => total === 13 ? '#166534' : total >= 7 ? '#D97706' : '#DC2626'
const ESTATUS_ASIGNACION = { activa: 'Activa', concluida: 'Concluida', cancelada: 'Cancelada' }
const LIMITE_INFERIOR = 50 // espacio libre al pie de cada página

const pdfHeader = (doc, titulo, subtitulo) => {
  doc.rect(0, 0, doc.page.width, 70).fill('#1F5C2E')
  doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica-Bold')
    .text('DualCheck UT', 40, 18)
  doc.fontSize(9).fillColor('#DDE7DF').font('Helvetica')
    .text('Universidad Tecnológica Cadereyta', 40, 40)
  doc.fontSize(9).fillColor('#C9A84C')
    .text(`Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, 40, 54)

  doc.fillColor('#1F5C2E').fontSize(14).font('Helvetica-Bold')
    .text(titulo, 40, 85, { width: doc.page.width - 80, height: 18, ellipsis: true })
  doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
    .text(subtitulo, 40, 104, { width: doc.page.width - 80, height: 13, ellipsis: true })
  doc.rect(40, 118, doc.page.width - 80, 2).fill('#C9A84C')
}

// "Etiqueta: valor" en una línea: el valor empieza después de la etiqueta y se
// recorta con "…" si no cabe en el ancho disponible
const pdfInfoRow = (doc, label, value, x, y, ancho = 250) => {
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
  const anchoEtiqueta = doc.widthOfString(label) + 6
  doc.text(label, x, y, { lineBreak: false })
  doc.font('Helvetica').fillColor('#6B7280')
    .text(String(value ?? '-'), x + anchoEtiqueta, y, { width: ancho - anchoEtiqueta, height: 11, ellipsis: true })
}

// Tabla con altura de fila según su contenido (los textos largos pasan a otra
// línea sin encimarse) y salto de página que repite el encabezado.
// columnas: [{ titulo, ancho, alinear }]; filas: [{ celdas: [texto | { texto, color, negrita }], fondo }]
const pdfTabla = (doc, { x = 40, y, columnas, filas, tamano = 8 }) => {
  const anchoTotal = columnas.reduce((s, c) => s + c.ancho, 0)
  const pad = 3
  const celda = c => (c !== null && typeof c === 'object') ? c : { texto: c }

  const encabezado = (yy) => {
    doc.font('Helvetica-Bold').fontSize(tamano)
    const alto = Math.max(...columnas.map(c => doc.heightOfString(c.titulo, { width: c.ancho - pad * 2 }))) + pad * 2 + 2
    doc.rect(x, yy, anchoTotal, alto).fill('#1F5C2E')
    let cx = x
    for (const c of columnas) {
      doc.fillColor('#FFFFFF').text(c.titulo, cx + pad, yy + pad + 1, { width: c.ancho - pad * 2, align: 'center' })
      cx += c.ancho
    }
    return yy + alto
  }

  let cy = encabezado(y)
  filas.forEach((fila, idx) => {
    doc.fontSize(tamano)
    const alto = Math.max(...fila.celdas.map((c, i) => {
      const t = celda(c)
      doc.font(t.negrita ? 'Helvetica-Bold' : 'Helvetica')
      return doc.heightOfString(String(t.texto ?? ''), { width: columnas[i].ancho - pad * 2 })
    })) + pad * 2

    if (cy + alto > doc.page.height - LIMITE_INFERIOR) {
      doc.addPage()
      cy = encabezado(40)
    }

    doc.rect(x, cy, anchoTotal, alto).fill(fila.fondo || (idx % 2 === 0 ? '#F4F6F4' : '#FFFFFF'))
    let cx = x
    fila.celdas.forEach((c, i) => {
      const t = celda(c)
      doc.font(t.negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano).fillColor(t.color || '#374151')
        .text(String(t.texto ?? ''), cx + pad, cy + pad, { width: columnas[i].ancho - pad * 2, align: columnas[i].alinear || 'left' })
      cx += columnas[i].ancho
    })
    cy += alto
  })
  return cy
}

// Barra de totales al final de una tabla (pasa a otra página si no cabe)
const pdfBarraTotal = (doc, texto, y) => {
  let yy = y + 10
  if (yy + 24 > doc.page.height - LIMITE_INFERIOR) { doc.addPage(); yy = 40 }
  doc.rect(40, yy, doc.page.width - 80, 24).fill('#1F5C2E')
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF').text(texto, 46, yy + 7, { width: doc.page.width - 92 })
}

// Reporte por estudiante — PDF
const reporteEstudiantePDF = async (req, res) => {
  const { id_estudiante, id_periodo } = req.params
  const datos = await getDatosEstudiante(id_estudiante, id_periodo)
  if (!datos) return res.status(404).json({ error: 'Datos no encontrados' })

  const doc = new PDFDocument({ margin: 40, size: 'LETTER' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_${datos.matricula}.pdf"`)
  doc.pipe(res)

  pdfHeader(doc,
    `${datos.nombre} ${datos.apellido_p} ${datos.apellido_m || ''}`,
    `Reporte de Asistencia — ${datos.periodo_nombre}`
  )

  const y0 = 135
  pdfInfoRow(doc, 'Matrícula:', datos.matricula, 40, y0)
  pdfInfoRow(doc, 'Correo:', datos.correo, 300, y0, 272)
  pdfInfoRow(doc, 'Grupo:', datos.grupo || '-', 40, y0 + 16)
  pdfInfoRow(doc, 'Carrera:', datos.carrera || '-', 300, y0 + 16, 272)
  pdfInfoRow(doc, 'Asesor:', `${datos.doc_nombre} ${datos.doc_apellido_p}`, 40, y0 + 32)
  pdfInfoRow(doc, 'Asignación:', ESTATUS_ASIGNACION[datos.estatus_asignacion] || datos.estatus_asignacion, 300, y0 + 32, 272)
  pdfInfoRow(doc, 'Periodo:', `${datos.periodo_nombre} (${formatFecha(datos.fecha_inicio)} — ${formatFecha(datos.fecha_fin)})`, 40, y0 + 48, 532)

  const resumen = calcularResumen(datos.asistencia)
  const finTabla = pdfTabla(doc, {
    y: y0 + 72,
    tamano: 9,
    columnas: [
      { titulo: 'Semana', ancho: 132 },
      { titulo: 'Docente', ancho: 133 },
      { titulo: 'Estudiante', ancho: 133 },
      { titulo: 'Estado', ancho: 134 },
    ],
    filas: resumen.map(s => {
      const docente = s.docente === '✓'
      return {
        fondo: s.completa ? '#D1FAE5' : undefined,
        celdas: [
          `Semana ${s.semana}`,
          docente ? 'Registrado' : 'Pendiente',
          s.estudiante === '✓' ? 'Confirmado' : 'Pendiente',
          {
            texto: s.completa ? 'Completa' : docente ? 'Pendiente estudiante' : 'Sin registro',
            color: s.completa ? '#166534' : docente ? '#D97706' : '#DC2626',
          },
        ],
      }
    }),
  })

  const total = resumen.filter(s => s.completa).length
  pdfBarraTotal(doc, `Total de semanas validadas: ${total}/13 (${Math.round(total / 13 * 100)}%)`, finTabla)
  doc.end()
}

// Reporte por docente — PDF
const reporteDocentePDF = async (req, res) => {
  const { id_docente, id_periodo } = req.params
  const datos = await getDatosDocente(id_docente, id_periodo)
  if (!datos) return res.status(404).json({ error: 'Datos no encontrados' })

  const doc = new PDFDocument({ margin: 40, size: 'LETTER', layout: 'landscape' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_docente_${id_docente}.pdf"`)
  doc.pipe(res)

  pdfHeader(doc,
    `${datos.nombre} ${datos.apellido_p} ${datos.apellido_m || ''}`,
    `Reporte de Docente Asesor — ${datos.periodo_nombre}`
  )

  const y0 = 135
  pdfInfoRow(doc, 'Correo:', datos.correo, 40, y0, 320)
  pdfInfoRow(doc, 'Programa:', datos.programa_educativo || '-', 380, y0, 332)
  pdfInfoRow(doc, 'Estudiantes asignados:', String(datos.asignaciones.length), 40, y0 + 16, 320)
  doc.fontSize(8).font('Helvetica').fillColor('#6B7280')
    .text(`Semanas: "${MARCA_PDF.completa}" = doble validación, "${MARCA_PDF.soloDocente}" = solo registró el docente, "${MARCA_PDF.sinRegistro}" = sin registro`, 380, y0 + 17, { width: 332 })

  const finTabla = pdfTabla(doc, {
    y: y0 + 40,
    tamano: 7,
    columnas: [
      { titulo: 'Matrícula', ancho: 62 },
      { titulo: 'Nombre', ancho: 140 },
      { titulo: 'Grupo', ancho: 52, alinear: 'center' },
      ...Array.from({ length: 13 }, (_, i) => ({ titulo: `S${i + 1}`, ancho: 26, alinear: 'center' })),
      { titulo: 'Total', ancho: 36, alinear: 'center' },
      { titulo: 'Estatus', ancho: 84, alinear: 'center' },
    ],
    filas: datos.asignaciones.map(asig => {
      const resumen = calcularResumen(asig.asistencia)
      const total = resumen.filter(s => s.completa).length
      return {
        celdas: [
          asig.matricula,
          `${asig.nombre} ${asig.apellido_p} ${asig.apellido_m || ''}`,
          asig.grupo || '-',
          ...resumen.map(s => s.completa
            ? { texto: MARCA_PDF.completa, color: '#166534', negrita: true }
            : s.docente === '✓'
              ? { texto: MARCA_PDF.soloDocente, color: '#D97706', negrita: true }
              : { texto: MARCA_PDF.sinRegistro, color: '#9CA3AF' }),
          { texto: `${total}/13`, color: COLOR_TOTAL(total), negrita: true },
          ESTATUS_ASIGNACION[asig.estatus] || asig.estatus,
        ],
      }
    }),
  })

  const completos = datos.asignaciones.filter(a => calcularResumen(a.asistencia).filter(s => s.completa).length === 13).length
  pdfBarraTotal(doc, `Estudiantes con 13/13 semanas validadas: ${completos} de ${datos.asignaciones.length}`, finTabla)
  doc.end()
}

// Reporte por periodo — PDF
const reportePeriodoPDF = async (req, res) => {
  const { id_periodo } = req.params
  const datos = await getDatosPeriodo(id_periodo)
  if (!datos) return res.status(404).json({ error: 'Periodo no encontrado' })

  const doc = new PDFDocument({ margin: 40, size: 'LETTER', layout: 'landscape' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="reporte_periodo_${id_periodo}.pdf"`)
  doc.pipe(res)

  pdfHeader(doc, 'Reporte General de Estadías', datos.nombre)

  const y0 = 135
  pdfInfoRow(doc, 'Periodo:', datos.nombre, 40, y0, 320)
  pdfInfoRow(doc, 'Inicio:', formatFecha(datos.fecha_inicio), 380, y0, 160)
  pdfInfoRow(doc, 'Fin:', formatFecha(datos.fecha_fin), 552, y0, 160)
  pdfInfoRow(doc, 'Total de asignaciones:', String(datos.asignaciones.length), 40, y0 + 16, 320)

  const finTabla = pdfTabla(doc, {
    y: y0 + 40,
    tamano: 8,
    columnas: [
      { titulo: 'Matrícula', ancho: 66 },
      { titulo: 'Nombre', ancho: 150 },
      { titulo: 'Grupo', ancho: 58, alinear: 'center' },
      { titulo: 'Carrera', ancho: 150 },
      { titulo: 'Asesor', ancho: 120 },
      { titulo: 'Validadas', ancho: 52, alinear: 'center' },
      { titulo: 'Progreso', ancho: 52, alinear: 'center' },
      { titulo: 'Estatus', ancho: 64, alinear: 'center' },
    ],
    filas: datos.asignaciones.map(asig => {
      const total = asig.asistencia.filter(a => a.confirmacion_docente && a.confirmacion_estudiante).length
      const colorEstatus = asig.estatus === 'activa' ? '#166534' : asig.estatus === 'concluida' ? '#1E40AF' : '#991B1B'
      return {
        celdas: [
          asig.matricula,
          `${asig.nombre} ${asig.apellido_p} ${asig.apellido_m || ''}`,
          asig.grupo || '-',
          asig.carrera || '-',
          `${asig.doc_nombre} ${asig.doc_apellido_p}`,
          { texto: String(total), color: COLOR_TOTAL(total), negrita: true },
          { texto: `${Math.round((total / 13) * 100)}%`, color: COLOR_TOTAL(total), negrita: true },
          { texto: ESTATUS_ASIGNACION[asig.estatus] || asig.estatus, color: colorEstatus },
        ],
      }
    }),
  })

  const totalValidadas = datos.asignaciones.filter(a =>
    a.asistencia.filter(s => s.confirmacion_docente && s.confirmacion_estudiante).length === 13
  ).length
  pdfBarraTotal(doc, `Estudiantes con 13/13 semanas validadas: ${totalValidadas} de ${datos.asignaciones.length}`, finTabla)
  doc.end()
}

// ── Listar datos para reportes ────────────────────────────────────────────────

const getOpcionesReporte = async (req, res) => {
  try {
    const [periodos] = await db.query('SELECT id, nombre FROM periodos ORDER BY fecha_inicio DESC')
    const [docentes] = await db.query(`
      SELECT d.id, d.nombre, d.apellido_p, d.apellido_m, d.programa_educativo
      FROM docentes d JOIN usuarios u ON d.id_usuario = u.id
      WHERE u.estatus = 1 ORDER BY d.apellido_p, d.nombre
    `)
    const [estudiantes] = await db.query(`
      SELECT e.id, e.matricula, e.nombre, e.apellido_p, e.apellido_m, e.grupo
      FROM estudiantes e JOIN usuarios u ON e.id_usuario = u.id
      WHERE u.estatus = 1 ORDER BY e.apellido_p, e.nombre
    `)
    res.json({ periodos, docentes, estudiantes })
  } catch (error) {
    console.error('Error obteniendo opciones:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = {
  reporteEstudianteExcel, reporteDocenteExcel, reportePeriodoExcel,
  reporteEstudiantePDF, reporteDocentePDF, reportePeriodoPDF,
  getOpcionesReporte
}