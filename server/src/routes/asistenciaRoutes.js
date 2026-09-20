const express = require('express')
const router = express.Router()
const { verificarToken, soloDocente, soloEstudiante, soloAdmin } = require('../middleware/auth')
const {
  getMisEstudiantes,
  getAsistencia,
  validarAsignacion,
  registrarAsistenciaDocente,
  solicitarCorreccion,
  aprobarCorreccion,
  rechazarCorreccion,
  getSolicitudesPendientes,
  getAsistenciaEstudiante,
  confirmarAsistenciaEstudiante
} = require('../controllers/asistenciaController')

// Rutas del docente
router.get('/mis-estudiantes', verificarToken, soloDocente, getMisEstudiantes)
router.get('/asignacion/:id_asignacion', verificarToken, soloDocente, getAsistencia)
router.patch('/asignacion/:id_asignacion/validar', verificarToken, soloDocente, validarAsignacion)
router.post('/asignacion/:id_asignacion/semana/:semana/docente', verificarToken, soloDocente, registrarAsistenciaDocente)
router.post('/asignacion/:id_asignacion/semana/:semana/solicitar-correccion', verificarToken, soloDocente, solicitarCorreccion)

// Rutas del administrador
router.get('/solicitudes-pendientes', verificarToken, soloAdmin, getSolicitudesPendientes)
router.patch('/solicitudes/:id_bitacora/aprobar', verificarToken, soloAdmin, aprobarCorreccion)
router.patch('/solicitudes/:id_bitacora/rechazar', verificarToken, soloAdmin, rechazarCorreccion)

// Rutas del estudiante
router.get('/mi-asistencia', verificarToken, soloEstudiante, getAsistenciaEstudiante)
router.post('/asignacion/:id_asignacion/semana/:semana/estudiante', verificarToken, soloEstudiante, confirmarAsistenciaEstudiante)

module.exports = router