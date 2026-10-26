const jwt = require('jsonwebtoken')
const db = require('../config/db')

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' })
  }

  // Los tokens de docente y administrador no expiran: hay que revisar en cada
  // petición que la cuenta siga activa para que una baja surta efecto de inmediato
  try {
    const [rows] = await db.query('SELECT estatus FROM usuarios WHERE id = ?', [decoded.id])
    if (rows.length === 0 || rows[0].estatus === 0) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada.' })
    }
  } catch (error) {
    console.error('Error verificando estatus de usuario:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  req.usuario = decoded
  next()
}

const soloAdmin = (req, res, next) => {
  if (req.usuario.perfil !== 'administrador') {
    return res.status(403).json({ error: 'Acceso restringido a administradores.' })
  }
  next()
}

const soloDocente = (req, res, next) => {
  if (req.usuario.perfil !== 'docente') {
    return res.status(403).json({ error: 'Acceso restringido a docentes.' })
  }
  next()
}

const soloEstudiante = (req, res, next) => {
  if (req.usuario.perfil !== 'estudiante') {
    return res.status(403).json({ error: 'Acceso restringido a estudiantes.' })
  }
  next()
}

module.exports = { verificarToken, soloAdmin, soloDocente, soloEstudiante }