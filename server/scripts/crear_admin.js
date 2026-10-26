/**
 * Crea (o restablece) una cuenta de administrador para instalaciones locales.
 *
 * Evita tener que generar el hash de bcrypt a mano y pegarlo en un INSERT
 * (en PowerShell el "$" del hash se interpreta como variable y lo rompe).
 *
 * Uso (desde la carpeta server/):
 *   node scripts/crear_admin.js                         -> admin@dualcheck.edu / admin123
 *   node scripts/crear_admin.js correo@dominio  clave   -> cuenta y contraseña propias
 *
 * Si el correo ya existe como administrador, restablece su contraseña y lo
 * desbloquea (sirve para recuperar el acceso si alguien la olvidó).
 *
 * admin123 es SOLO para desarrollo y demostraciones con datos de prueba.
 * En el servidor real usa una contraseña propia.
 */

const bcrypt = require('bcryptjs')
const db = require('../src/config/db')

const correo = process.argv[2] || 'admin@dualcheck.edu'
const password = process.argv[3] || 'admin123'

async function main() {
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const [existe] = await db.query('SELECT id, perfil FROM usuarios WHERE correo = ?', [correo])

  if (existe.length > 0) {
    if (existe[0].perfil !== 'administrador') {
      throw new Error(`El correo ${correo} ya pertenece a un ${existe[0].perfil}. Usa otro correo.`)
    }
    await db.query(
      `UPDATE usuarios
       SET password_hash = ?, estatus = 1, intentos_fallidos = 0, bloqueado_hasta = NULL,
           requiere_cambio_password = 0
       WHERE id = ?`,
      [passwordHash, existe[0].id]
    )
    console.log(`✓ Administrador ${correo} ya existía: contraseña restablecida y cuenta desbloqueada.`)
  } else {
    await db.query(
      'INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password) VALUES (?, ?, ?, ?)',
      [correo, passwordHash, 'administrador', 0]
    )
    console.log(`✓ Administrador ${correo} creado.`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('✗ No se pudo crear el administrador:', err.message)
    process.exit(1)
  })
