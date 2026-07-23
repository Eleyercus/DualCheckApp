const express = require('express')
const router = express.Router()
const { login, cambiarPassword, verificarRequiereCambio } = require('../controllers/authController')
const { verificarToken } = require('../middleware/auth')

router.post('/login', login)
router.post('/cambiar-password', verificarToken, cambiarPassword)
router.get('/requiere-cambio', verificarToken, verificarRequiereCambio)

module.exports = router