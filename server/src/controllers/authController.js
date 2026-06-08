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

    // Generar JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        correo: usuario.correo,
        perfil: usuario.perfil
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      mensaje: 'Login exitoso',
      token,
      perfil: usuario.perfil
    })

  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { login }