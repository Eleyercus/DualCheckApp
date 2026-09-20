import { useState } from 'react'

/**
 * Hook genérico de búsqueda + filtros para listas en tablas o paneles.
 *
 * @param {Array} datos - Arreglo original (sin filtrar) a mostrar.
 * @param {Object} opciones
 * @param {(item: any) => string} opciones.buscarEn - Devuelve el texto donde buscar (ya concatenado) para un item.
 * @param {Object.<string, (item: any, valor: string) => boolean>} opciones.filtros - Predicados por clave de filtro.
 *
 * @returns {{
 *  query: string, setQuery: Function,
 *  valoresFiltro: Object, setFiltro: Function,
 *  limpiar: Function, resultado: Array,
 *  hayFiltrosActivos: boolean, total: number, totalFiltrado: number
 * }}
 */
export function useFiltro(datos, { buscarEn, filtros = {} } = {}) {
  const [query, setQuery] = useState('')
  const [valoresFiltro, setValoresFiltro] = useState({})

  const setFiltro = (clave, valor) => setValoresFiltro(prev => ({ ...prev, [clave]: valor }))
  const limpiar = () => { setQuery(''); setValoresFiltro({}) }

  // Filtrado directo (sin memo): las listas de esta app son pequeñas
  // (decenas/cientos de filas), así que recalcular en cada render es
  // imperceptible y evita bugs de closures obsoletas en useMemo.
  let resultado = datos || []

  if (query.trim() && buscarEn) {
    const q = query.trim().toLowerCase()
    resultado = resultado.filter(item => buscarEn(item)?.toLowerCase().includes(q))
  }

  for (const [clave, valor] of Object.entries(valoresFiltro)) {
    if (!valor) continue
    const predicado = filtros[clave]
    if (predicado) resultado = resultado.filter(item => predicado(item, valor))
  }

  const hayFiltrosActivos = !!query.trim() || Object.values(valoresFiltro).some(Boolean)

  return {
    query, setQuery,
    valoresFiltro, setFiltro,
    limpiar, resultado,
    hayFiltrosActivos,
    total: datos?.length || 0,
    totalFiltrado: resultado.length,
  }
}

/** Extrae valores únicos no vacíos de un arreglo de objetos, para armar opciones de <select>. */
export function valoresUnicos(datos, campo) {
  const set = new Set()
  for (const item of datos || []) {
    const valor = item?.[campo]
    if (valor) set.add(valor)
  }
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), 'es'))
}