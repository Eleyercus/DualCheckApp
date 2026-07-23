const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')

// LOGIN
const login = async (req, res) => {
  const { correo, password } = req.body

  // Validar que llegaron los datos
  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' })
  }

  try {
    // Buscar usuario en la base de datos
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const usuario = rows[0]

    // Verificar si la cuenta está bloqueada
    if (usuario.bloqueado_hasta && new Date() < new Date(usuario.bloqueado_hasta)) {
      return res.status(403).json({ error: 'Cuenta bloqueada temporalmente. Intenta más tarde.' })
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordValida) {
      // Sumar intento fallido
      const intentos = usuario.intentos_fallidos + 1
      let bloqueo = null

      if (intentos >= 5) {
        // Bloquear 15 minutos
        bloqueo = new Date(Date.now() + 15 * 60 * 1000)
      }

      await db.query(
        'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [intentos, bloqueo, usuario.id]
      )

      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    // Login exitoso — resetear intentos fallidos
    await db.query(
      'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
      [usuario.id]
    )

    // Generar JWT — el perfil estudiante expira por seguridad (tablet de uso
    // compartido); docente y administrador no expiran, acceden desde sus
    // propios dispositivos personales
    const opcionesToken = usuario.perfil === 'estudiante'
      ? { expiresIn: '15m' }
      : {}

    const token = jwt.sign(
      {
        id: usuario.id,
        correo: usuario.correo,
        perfil: usuario.perfil
      },
      process.env.JWT_SECRET,
      opcionesToken
    )

    res.json({
      mensaje: 'Login exitoso',
      token,
      perfil: usuario.perfil,
      requiere_cambio_password: usuario.requiere_cambio_password === 1
    })

  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Cambiar contraseña (primer login obligatorio o voluntario)
const cambiarPassword = async (req, res) => {
  const { password_actual, password_nueva, password_confirmacion } = req.body

  if (!password_actual || !password_nueva || !password_confirmacion) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }

  if (password_nueva !== password_confirmacion) {
    return res.status(400).json({ error: 'La nueva contraseña y su confirmación no coinciden' })
  }

  if (password_nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
  }

  if (password_nueva === password_actual) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' })
  }

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })

    const usuario = rows[0]
    const passwordValida = await bcrypt.compare(password_actual, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' })
    }

    const nuevo_hash = await bcrypt.hash(password_nueva, 10)
    await db.query(
      'UPDATE usuarios SET password_hash = ?, requiere_cambio_password = 0 WHERE id = ?',
      [nuevo_hash, req.usuario.id]
    )

    await db.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad_afectada, detalle) VALUES (?, ?, ?, ?)',
      [req.usuario.id, 'CAMBIO_PASSWORD', 'usuarios', 'El usuario cambió su contraseña']
    )

    res.json({ mensaje: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('Error cambiando contraseña:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Verificar si el usuario requiere cambio de contraseña
const verificarRequiereCambio = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT requiere_cambio_password FROM usuarios WHERE id = ?',
      [req.usuario.id]
    )
    res.json({ requiere_cambio: rows[0]?.requiere_cambio_password === 1 })
  } catch (error) {
    console.error('Error verificando cambio:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { login, cambiarPassword, verificarRequiereCambio }