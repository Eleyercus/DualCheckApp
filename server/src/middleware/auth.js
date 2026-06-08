const jwt = require('jsonwebtoken')

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' })
  }
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