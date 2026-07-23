const express = require('express')
const router = express.Router()
const { verificarToken, soloAdmin } = require('../middleware/auth')
const {
  reporteEstudianteExcel, reporteDocenteExcel, reportePeriodoExcel,
  reporteEstudiantePDF, reporteDocentePDF, reportePeriodoPDF,
  getOpcionesReporte
} = require('../controllers/reportesController')

router.get('/opciones', verificarToken, soloAdmin, getOpcionesReporte)

// Excel
router.get('/estudiante/:id_estudiante/periodo/:id_periodo/excel', verificarToken, soloAdmin, reporteEstudianteExcel)
router.get('/docente/:id_docente/periodo/:id_periodo/excel', verificarToken, soloAdmin, reporteDocenteExcel)
router.get('/periodo/:id_periodo/excel', verificarToken, soloAdmin, reportePeriodoExcel)

// PDF
router.get('/estudiante/:id_estudiante/periodo/:id_periodo/pdf', verificarToken, soloAdmin, reporteEstudiantePDF)
router.get('/docente/:id_docente/periodo/:id_periodo/pdf', verificarToken, soloAdmin, reporteDocentePDF)
router.get('/periodo/:id_periodo/pdf', verificarToken, soloAdmin, reportePeriodoPDF)

module.exports = router