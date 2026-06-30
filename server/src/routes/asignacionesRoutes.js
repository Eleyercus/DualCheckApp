const express = require('express')
const router = express.Router()
const { verificarToken, soloAdmin } = require('../middleware/auth')
const {
  getAsignaciones,
  getEstudiantesSinAsesor,
  getDocentesActivos,
  crearAsignacion,
  cancelarAsignacion,
  concluirAsignacion
} = require('../controllers/asignacionesController')

router.get('/', verificarToken, soloAdmin, getAsignaciones)
router.get('/sin-asesor', verificarToken, soloAdmin, getEstudiantesSinAsesor)
router.get('/docentes-activos', verificarToken, soloAdmin, getDocentesActivos)
router.post('/', verificarToken, soloAdmin, crearAsignacion)
router.patch('/:id/cancelar', verificarToken, soloAdmin, cancelarAsignacion)
router.patch('/:id/concluir', verificarToken, soloAdmin, concluirAsignacion)

module.exports = router