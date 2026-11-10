const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const db = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const estudiantesRoutes = require('./routes/estudiantesRoutes')
const docentesRoutes = require('./routes/docentesRoutes')
const asignacionesRoutes = require('./routes/asignacionesRoutes')
const asistenciaRoutes = require('./routes/asistenciaRoutes')
const { verificarToken, soloAdmin } = require('./middleware/auth')
const periodosRoutes = require('./routes/periodosRoutes')
const reportesRoutes = require('./routes/reportesRoutes')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.disable('x-powered-by')
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/estudiantes', estudiantesRoutes)
app.use('/api/docentes', docentesRoutes)
app.use('/api/asignaciones', asignacionesRoutes)
app.use('/api/asistencia', asistenciaRoutes)
app.use('/api/periodos', periodosRoutes)
app.use('/api/reportes', reportesRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor DualCheck funcionando correctamente' })
})

app.get('/api/protegida', verificarToken, soloAdmin, (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.correo}, tienes acceso de administrador` })
})

// Rutas inexistentes y errores no controlados: siempre JSON y sin detalles internos
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'La petición no tiene un formato JSON válido.' })
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 5 MB).' })
  }
  console.error('Error no controlado:', err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})