const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const db = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const estudiantesRoutes = require('./routes/estudiantesRoutes')
const docentesRoutes = require('./routes/docentesRoutes')
const asignacionesRoutes = require('./routes/asignacionesRoutes')
const { verificarToken, soloAdmin } = require('./middleware/auth')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/estudiantes', estudiantesRoutes)
app.use('/api/docentes', docentesRoutes)
app.use('/api/asignaciones', asignacionesRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor DualCheck funcionando correctamente' })
})

app.get('/api/protegida', verificarToken, soloAdmin, (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.correo}, tienes acceso de administrador` })
})

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})