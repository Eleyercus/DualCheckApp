const express = require('express')
const router = express.Router()
const multer = require('multer')
const { verificarToken, soloAdmin } = require('../middleware/auth')
const {
  getEstudiantes,
  crearEstudiante,
  cargaMasiva,
  bajaEstudiante
} = require('../controllers/estudiantesController')

// Multer en memoria para procesar el archivo sin guardarlo en disco
const upload = multer({ storage: multer.memoryStorage() })

router.get('/', verificarToken, soloAdmin, getEstudiantes)
router.post('/', verificarToken, soloAdmin, crearEstudiante)
router.post('/carga-masiva', verificarToken, soloAdmin, upload.single('archivo'), cargaMasiva)
router.patch('/:id/baja', verificarToken, soloAdmin, bajaEstudiante)

module.exports = router