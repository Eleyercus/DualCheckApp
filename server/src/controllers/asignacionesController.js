const crearAsignacion = async (req, res) => {
  const { id_estudiante, id_docente } = req.body

  if (!id_estudiante || id_docente === undefined) {
    return res.status(400).json({ error: 'Estudiante y docente son requeridos' })
  }

  try {
    // Verificar los 3 requisitos
    const [est] = await db.query(
      'SELECT req_datos_estadia, req_carta_no_adeudo, req_carta_servicios, nombre, apellido_p FROM estudiantes WHERE id = ?',
      [id_estudiante]
    )

    if (est.length === 0) return res.status(404).json({ error: 'Estudiante no encontrado' })

    const { req_datos_estadia, req_carta_no_adeudo, req_carta_servicios, nombre, apellido_p } = est[0]

    if (!req_datos_estadia || !req_carta_no_adeudo || !req_carta_servicios) {
      const faltantes = []
      if (!req_datos_estadia) faltantes.push('Datos de Estadía')
      if (!req_carta_no_adeudo) faltantes.push('Carta de No Adeudo o Convenio de Pago')
      if (!req_carta_servicios) faltantes.push('Carta de Servicios Escolares')

      return res.status(400).json({
        error: `${nombre} ${apellido_p} no puede ser asignado. Faltan documentos: ${faltantes.join(', ')}.`
      })
    }

    const [yaAsignado] = await db.query(
      'SELECT id FROM asignaciones WHERE id_estudiante = ? AND activa = 1',
      [id_estudiante]
    )
    if (yaAsignado.length > 0) {
      return res.status(400).json({ error: 'El estudiante ya tiene un asesor asignado' })
    }

    await db.query(
      'INSERT INTO asignaciones (id_estudiante, id_docente) VALUES (?, ?)',
      [id_estudiante, id_docente]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CREAR_ASIGNACION', 'asignaciones',
        `Estudiante ${id_estudiante} asignado a docente ${id_docente}`]
    )

    res.status(201).json({ mensaje: 'Asignación creada correctamente' })
  } catch (error) {
    console.error('Error creando asignación:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}