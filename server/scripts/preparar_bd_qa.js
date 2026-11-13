/**
 * Prepara una base de datos SEPARADA para auditorías y pruebas manuales.
 *
 * Crea (o recrea desde cero) la base "dualcheck_qa" con el esquema de
 * schema.sql, el administrador de desarrollo y los datos de prueba del seed.
 * No toca la base configurada en server/.env (dualcheck_db).
 *
 * Uso (desde la carpeta server/):
 *   node scripts/preparar_bd_qa.js
 *
 * Después, levanta el servidor contra esa base:
 *   PowerShell:  $env:DB_NAME='dualcheck_qa'; node src/index.js
 *   Bash:        DB_NAME=dualcheck_qa node src/index.js
 *
 * Usa el usuario de MySQL de server/.env, que necesita permiso para crear
 * bases de datos (root en las instalaciones locales del equipo).
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const mysql = require('mysql2/promise')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const BD_QA = 'dualcheck_qa'

async function main() {
  if (process.env.DB_NAME === BD_QA) {
    throw new Error(`server/.env apunta a ${BD_QA}; este script es para una base aparte de la de desarrollo.`)
  }

  const esquema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')
    .replace(/dualcheck_db/g, BD_QA)

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  })
  await conn.query(`DROP DATABASE IF EXISTS \`${BD_QA}\``)
  await conn.query(esquema)
  await conn.end()
  console.log(`✓ Base ${BD_QA} creada con el esquema de schema.sql`)

  // crear_admin y el seed leen DB_NAME del entorno antes que del .env
  const opciones = { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: { ...process.env, DB_NAME: BD_QA } }
  execFileSync(process.execPath, ['scripts/crear_admin.js'], opciones)
  execFileSync(process.execPath, ['scripts/seed_datos_prueba.js'], opciones)
  console.log(`\n✓ ${BD_QA} lista. Levanta el servidor con DB_NAME=${BD_QA}.`)
}

main().catch(err => {
  console.error('✗ No se pudo preparar la base de QA:', err.message)
  process.exit(1)
})
