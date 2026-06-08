const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const db = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const { verificarToken, soloAdmin } = require('./middleware/auth')
const estudiantesRoutes = require('./routes/estudiantesRoutes')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/estudiantes', estudiantesRoutes)

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor DualCheck funcionando correctamente' })
})

app.get('/api/protegida', verificarToken, soloAdmin, (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.correo}, tienes acceso de administrador` })
})



// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})