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

const pdfHeader = (doc, titulo, subtitulo) => {
  doc.rect(0, 0, doc.page.width, 70).fill('#1F5C2E')
  doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica-Bold')
    .text('DualCheck UT', 40, 18)
  doc.fontSize(9).fillColor('rgba(255,255,255,0.7)').font('Helvetica')
    .text('Universidad Tecnológica Cadereyta', 40, 40)
  doc.fontSize(9).fillColor('#C9A84C')
    .text(`Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, 40, 54)

  doc.fillColor('#1F5C2E').fontSize(14).font('Helvetica-Bold')
    .text(titulo, 40, 85)
  doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
    .text(subtitulo, 40, 104)
  doc.rect(40, 118, doc.page.width - 80, 2).fill('#C9A84C')
  doc.moveDown(2)
}

const pdfInfoRow = (doc, label, value, x, y) => {
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(label, x, y)
  doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(value, x + 90, y)
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
  pdfInfoRow(doc, 'Correo:', datos.correo, 300, y0)
  pdfInfoRow(doc, 'Grupo:', datos.grupo || '-', 40, y0 + 16)
  pdfInfoRow(doc, 'Carrera:', datos.carrera || '-', 300, y0 + 16)
  pdfInfoRow(doc, 'Asesor:', `${datos.doc_nombre} ${datos.doc_apellido_p}`, 40, y0 + 32)
  pdfInfoRow(doc, 'Periodo:', `${datos.periodo_nombre} (${formatFecha(datos.fecha_inicio)} — ${formatFecha(datos.fecha_fin)})`, 40, y0 + 48)

  // Tabla de semanas
  const tableY = y0 + 75
  const cols = [40, 180, 310, 440]
  const hdrs = ['Semana', 'Docente', 'Estudiante', 'Estado']

  doc.rect(40, tableY, doc.page.width - 80, 20).fill('#1F5C2E')
  hdrs.forEach((h, i) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text(h, cols[i] + 4, tableY + 5, { width: 130 })
  })

  const resumen = calcularResumen(datos.asistencia)
  resumen.forEach((s, idx) => {
    const ry = tableY + 20 + idx * 18
    const bg = s.completa ? '#D1FAE5' : idx % 2 === 0 ? '#F4F6F4' : '#FFFFFF'
    doc.rect(40, ry, doc.page.width - 80, 18).fill(bg)
    doc.fontSize(9).font('Helvetica').fillColor('#374151')
      .text(`Semana ${s.semana}`, cols[0] + 4, ry + 4)
      .text(s.docente === '✓' ? '✓ Registrado' : 'Pendiente', cols[1] + 4, ry + 4)
      .text(s.estudiante === '✓' ? '✓ Confirmado' : 'Pendiente', cols[2] + 4, ry + 4)
    const estado = s.completa ? 'Completa' : s.docente === '✓' ? 'Pend. estudiante' : 'Sin registro'
    const color = s.completa ? '#166534' : s.docente === '✓' ? '#D97706' : '#DC2626'
    doc.fillColor(color).text(estado, cols[3] + 4, ry + 4)
  })

  const totalY = tableY + 20 + 13 * 18 + 10
  const total = resumen.filter(s => s.completa).length
  doc.rect(40, totalY, doc.page.width - 80, 22).fill('#1F5C2E')
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
    .text(`Total de semanas validadas: ${total}/13 (${Math.round(total/13*100)}%)`, 44, totalY + 5)

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
  pdfInfoRow(doc, 'Correo:', datos.correo, 40, y0)
  pdfInfoRow(doc, 'Programa:', datos.programa_educativo || '-', 300, y0)
  pdfInfoRow(doc, 'Estudiantes asignados:', String(datos.asignaciones.length), 40, y0 + 16)

  const tableY = y0 + 45
  const pageW = doc.page.width
  const colW = [100, 160, 55, ...Array(13).fill(28), 40]
  const colX = [40]
  colW.forEach((w, i) => { if (i > 0) colX.push(colX[i-1] + colW[i-1]) })

  const hdrs = ['Matrícula', 'Nombre', 'Grupo', 'S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12','S13','Total']
  doc.rect(40, tableY, pageW - 80, 20).fill('#1F5C2E')
  hdrs.forEach((h, i) => {
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text(h, colX[i] + 2, tableY + 6, { width: colW[i] - 2, align: 'center' })
  })

  datos.asignaciones.forEach((asig, idx) => {
    const ry = tableY + 20 + idx * 16
    if (ry > doc.page.height - 60) { doc.addPage({ layout: 'landscape' }); }
    const resumen = calcularResumen(asig.asistencia)
    const total = resumen.filter(s => s.completa).length
    const bg = idx % 2 === 0 ? '#F4F6F4' : '#FFFFFF'
    doc.rect(40, ry, pageW - 80, 16).fill(bg)
    doc.fontSize(7).font('Helvetica').fillColor('#374151')
      .text(asig.matricula, colX[0] + 2, ry + 4, { width: colW[0] - 4 })
      .text(`${asig.nombre} ${asig.apellido_p}`, colX[1] + 2, ry + 4, { width: colW[1] - 4 })
      .text(asig.grupo || '-', colX[2] + 2, ry + 4, { width: colW[2] - 4, align: 'center' })
    resumen.forEach((s, si) => {
      const color = s.completa ? '#166534' : s.docente === '✓' ? '#D97706' : '#9CA3AF'
      doc.fillColor(color)
        .text(s.completa ? '✓' : s.docente === '✓' ? '·' : '-', colX[3+si] + 2, ry + 4, { width: colW[3+si] - 4, align: 'center' })
    })
    const colorTotal = total === 13 ? '#166534' : total >= 7 ? '#D97706' : '#DC2626'
    doc.fillColor(colorTotal).font('Helvetica-Bold')
      .text(`${total}/13`, colX[16] + 2, ry + 4, { width: colW[16] - 4, align: 'center' })
  })

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

  pdfHeader(doc, `Reporte General de Estadías`, datos.nombre)

  const y0 = 135
  pdfInfoRow(doc, 'Periodo:', datos.nombre, 40, y0)
  pdfInfoRow(doc, 'Inicio:', formatFecha(datos.fecha_inicio), 300, y0)
  pdfInfoRow(doc, 'Fin:', formatFecha(datos.fecha_fin), 450, y0)
  pdfInfoRow(doc, 'Total estudiantes:', String(datos.asignaciones.length), 40, y0 + 16)

  const tableY = y0 + 45
  const pageW = doc.page.width
  const hdrs2 = ['Matrícula', 'Nombre', 'Grupo', 'Carrera', 'Asesor', 'Validadas', 'Progreso', 'Estatus']
  const colW2 = [75, 130, 55, 130, 120, 55, 55, 60]
  const colX2 = [40]
  colW2.forEach((w, i) => { if (i > 0) colX2.push(colX2[i-1] + colW2[i-1]) })

  doc.rect(40, tableY, pageW - 80, 20).fill('#1F5C2E')
  hdrs2.forEach((h, i) => {
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF')
      .text(h, colX2[i] + 2, tableY + 6, { width: colW2[i] - 4, align: 'center' })
  })

  datos.asignaciones.forEach((asig, idx) => {
    const ry = tableY + 20 + idx * 17
    if (ry > doc.page.height - 60) { doc.addPage({ layout: 'landscape' }) }
    const total = asig.asistencia.filter(a => a.confirmacion_docente && a.confirmacion_estudiante).length
    const pct = Math.round((total / 13) * 100)
    const bg = idx % 2 === 0 ? '#F4F6F4' : '#FFFFFF'

    doc.rect(40, ry, pageW - 80, 17).fill(bg)
    doc.fontSize(8).font('Helvetica').fillColor('#374151')
      .text(asig.matricula, colX2[0]+2, ry+4, { width: colW2[0]-4 })
      .text(`${asig.nombre} ${asig.apellido_p}`, colX2[1]+2, ry+4, { width: colW2[1]-4 })
      .text(asig.grupo||'-', colX2[2]+2, ry+4, { width: colW2[2]-4, align: 'center' })
      .text(asig.carrera||'-', colX2[3]+2, ry+4, { width: colW2[3]-4 })
      .text(`${asig.doc_nombre} ${asig.doc_apellido_p}`, colX2[4]+2, ry+4, { width: colW2[4]-4 })

    const colorTotal = total===13 ? '#166534' : total>=7 ? '#D97706' : '#DC2626'
    doc.fillColor(colorTotal).font('Helvetica-Bold')
      .text(String(total), colX2[5]+2, ry+4, { width: colW2[5]-4, align: 'center' })
      .text(`${pct}%`, colX2[6]+2, ry+4, { width: colW2[6]-4, align: 'center' })

    const estatusColor = asig.estatus==='activa' ? '#166534' : asig.estatus==='concluida' ? '#1E40AF' : '#991B1B'
    doc.fillColor(estatusColor).font('Helvetica')
      .text(asig.estatus, colX2[7]+2, ry+4, { width: colW2[7]-4, align: 'center' })
  })

  const totalValidadas = datos.asignaciones.filter(a =>
    a.asistencia.filter(s => s.confirmacion_docente && s.confirmacion_estudiante).length === 13
  ).length

  const footerY = doc.page.height - 50
  doc.rect(40, footerY, pageW - 80, 24).fill('#1F5C2E')
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
    .text(`Estudiantes con 13/13 semanas validadas: ${totalValidadas} de ${datos.asignaciones.length}`, 44, footerY + 7)

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