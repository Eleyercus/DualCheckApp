const express = require('express')
const router = express.Router()
const { verificarToken, soloAdmin } = require('../middleware/auth')
const {
  getPeriodos,
  getPeriodoActivo,
  crearPeriodo,
  cambiarEstatusPeriodo,
  cerrarPeriodo
} = require('../controllers/periodosController')

router.get('/', verificarToken, soloAdmin, getPeriodos)
router.get('/activo', verificarToken, getPeriodoActivo)
router.post('/', verificarToken, soloAdmin, crearPeriodo)
router.patch('/:id/estatus', verificarToken, soloAdmin, cambiarEstatusPeriodo)
router.patch('/:id/cerrar', verificarToken, soloAdmin, cerrarPeriodo)

module.exports = router