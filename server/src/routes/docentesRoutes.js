const express = require('express')
const router = express.Router()
const { verificarToken, soloAdmin } = require('../middleware/auth')
const { getDocentes, crearDocente, bajaDocente } = require('../controllers/docentesController')

router.get('/', verificarToken, soloAdmin, getDocentes)
router.post('/', verificarToken, soloAdmin, crearDocente)
router.patch('/:id/baja', verificarToken, soloAdmin, bajaDocente)

module.exports = router