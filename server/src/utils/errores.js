// Traduce errores de MySQL causados por datos del usuario a una respuesta 400 con
// un mensaje claro. Devuelve null si el error no es de ese tipo (entonces es un 500).
const errorDeDatos = (error) => {
  switch (error?.code) {
    case 'ER_DUP_ENTRY':
      return 'Ya existe un registro con ese dato (matrícula o correo duplicado).'
    case 'ER_DATA_TOO_LONG':
      return 'Algún dato excede la longitud permitida. Revisa los campos de texto.'
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
    case 'WARN_DATA_TRUNCATED':
      return 'Algún dato tiene un formato no válido.'
    case 'ER_NO_REFERENCED_ROW_2':
      return 'El registro relacionado no existe.'
    default:
      return null
  }
}

// Responde 400 si el error es de datos y 500 en cualquier otro caso
const responderError = (res, error, contexto) => {
  const mensaje = errorDeDatos(error)
  if (mensaje) return res.status(400).json({ error: mensaje })
  console.error(`Error ${contexto}:`, error)
  return res.status(500).json({ error: 'Error interno del servidor' })
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Recorta espacios de los valores de texto de un objeto (body de la petición)
const recortar = (obj) => Object.fromEntries(
  Object.entries(obj || {}).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
)

module.exports = { errorDeDatos, responderError, CORREO_VALIDO, recortar }
