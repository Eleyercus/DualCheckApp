/**
 * Restricción de acceso del perfil Estudiante por dirección IP (RF-04).
 *
 * Configuración: variable de entorno IP_EQUIPO_ESTUDIANTE en server/.env
 *   - Vacía o no definida => restricción DESACTIVADA (nadie se bloquea).
 *     Este es el estado por defecto hasta que se asigne el equipo/tablet.
 *   - Una IP: IP_EQUIPO_ESTUDIANTE=192.168.1.50
 *   - Varias IPs separadas por coma (útil si hay más de un equipo autorizado):
 *     IP_EQUIPO_ESTUDIANTE=192.168.1.50,192.168.1.51
 *
 * Se aplica en dos puntos:
 *   1) authController.login — bloquea el INICIO DE SESIÓN del perfil
 *      estudiante si no viene desde una IP autorizada.
 *   2) restringirIPEstudiante (este middleware) — refuerza la restricción
 *      en las rutas de asistencia del estudiante durante toda la sesión,
 *      no solo al hacer login (por si el token se copiara a otro equipo).
 *
 * NOTA sobre despliegue: si en el futuro se pone un proxy/nginx delante del
 * servidor, hay que agregar `app.set('trust proxy', true)` en index.js para
 * que req.ip lea la IP real del cliente desde X-Forwarded-For en vez de la
 * IP del proxy. Sin proxy (conexión directa dentro de la LAN, como está hoy
 * planeado), no se necesita ese ajuste.
 */

const obtenerIPsPermitidas = () => {
  const raw = process.env.IP_EQUIPO_ESTUDIANTE || ''
  return raw.split(',').map(ip => ip.trim()).filter(Boolean)
}

// Normaliza direcciones IPv4-mapped-IPv6 (Node a veces reporta
// '::ffff:192.168.1.50' en vez de '192.168.1.50' en conexiones IPv4).
const normalizarIP = (ip) => (ip || '').replace(/^::ffff:/, '')

// Usado dentro de authController.login antes de validar la contraseña.
const verificarIPLoginEstudiante = (req) => {
  const permitidas = obtenerIPsPermitidas()
  if (permitidas.length === 0) return { permitido: true, restriccionActiva: false }
  const ipCliente = normalizarIP(req.ip)
  return { permitido: permitidas.includes(ipCliente), restriccionActiva: true, ipCliente }
}

// Middleware para rutas ya autenticadas (después de verificarToken + soloEstudiante).
const restringirIPEstudiante = (req, res, next) => {
  if (req.usuario?.perfil !== 'estudiante') return next()

  const permitidas = obtenerIPsPermitidas()
  if (permitidas.length === 0) return next() // restricción desactivada

  const ipCliente = normalizarIP(req.ip)
  if (!permitidas.includes(ipCliente)) {
    return res.status(403).json({
      error: 'Acceso restringido al equipo autorizado para estudiantes.'
    })
  }
  next()
}

module.exports = { verificarIPLoginEstudiante, restringirIPEstudiante, obtenerIPsPermitidas }