const express = require('express')
const router = express.Router()
const multer = require('multer')
const { verificarToken, soloAdmin } = require('../middleware/auth')
const {
  getEstudiantes, getEstudiante, crearEstudiante,
  actualizarRequisitos, actualizarEmpresa, actualizarEstatusEspecial,
  cargaMasiva, bajaEstudiante
} = require('../controllers/estudiantesController')

const upload = multer({ storage: multer.memoryStorage() })

router.get('/', verificarToken, soloAdmin, getEstudiantes)
router.get('/:id', verificarToken, soloAdmin, getEstudiante)
router.post('/', verificarToken, soloAdmin, crearEstudiante)
router.post('/carga-masiva', verificarToken, soloAdmin, upload.single('archivo'), cargaMasiva)
router.patch('/:id/requisitos', verificarToken, soloAdmin, actualizarRequisitos)
router.patch('/:id/empresa', verificarToken, soloAdmin, actualizarEmpresa)
router.patch('/:id/estatus-especial', verificarToken, soloAdmin, actualizarEstatusEspecial)
router.patch('/:id/baja', verificarToken, soloAdmin, bajaEstudiante)

module.exports = router