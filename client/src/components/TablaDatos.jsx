import { useState } from 'react'

const TAMANOS_PAGINA = [10, 25, 50, 100]

/**
 * Tabla de datos reutilizable con orden por columna y paginación.
 * Recibe las filas ya filtradas (por ejemplo, el resultado de useFiltro).
 *
 * @param {Array<{
 *   clave: string, titulo: string,
 *   ordenable?: boolean,
 *   valor?: (fila: any) => string|number,
 *   render?: (fila: any) => React.ReactNode,
 *   estilo?: Object
 * }>} columnas - Si una columna es ordenable, `valor` define el dato con el que se ordena
 *   (por defecto fila[clave]); `render` define lo que se muestra.
 * @param {Array} filas
 * @param {(fila: any) => string|number} claveFila
 * @param {{ clave: string, dir: 'asc'|'desc' }} [ordenInicial]
 * @param {number} [tamanoInicial=25]
 */
export default function TablaDatos({ columnas, filas, claveFila, ordenInicial = null, tamanoInicial = 25 }) {
  const [orden, setOrden] = useState(ordenInicial)
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(tamanoInicial)
  const [totalPrevio, setTotalPrevio] = useState(filas.length)

  // Si cambian los filtros (cambia el número de filas), volver a la primera página
  if (filas.length !== totalPrevio) {
    setTotalPrevio(filas.length)
    setPagina(1)
  }

  const columnaOrden = orden && columnas.find(c => c.clave === orden.clave)
  const ordenadas = columnaOrden
    ? [...filas].sort((a, b) => {
        const obtener = columnaOrden.valor || (f => f[columnaOrden.clave])
        const va = obtener(a), vb = obtener(b)
        const comparacion = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true, sensitivity: 'base' })
        return orden.dir === 'asc' ? comparacion : -comparacion
      })
    : filas

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / tamano))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * tamano
  const visibles = ordenadas.slice(inicio, inicio + tamano)

  const alternarOrden = (clave) => {
    setOrden(prev => prev?.clave === clave
      ? { clave, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { clave, dir: 'asc' })
    setPagina(1)
  }

  // Números de página visibles: primera, última y dos alrededor de la actual
  const numeros = []
  for (let n = 1; n <= totalPaginas; n++) {
    if (n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 2) numeros.push(n)
    else if (numeros[numeros.length - 1] !== '…') numeros.push('…')
  }

  return (
    <>
      <div className="tabla-wrapper">
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map(c => {
                const activa = orden?.clave === c.clave
                return (
                  <th key={c.clave} aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.ordenable ? (
                      <button type="button" className="th-ordenable" onClick={() => alternarOrden(c.clave)}
                        title={`Ordenar por ${c.titulo.toLowerCase()}`}>
                        {c.titulo}
                        <i className={`ti ${activa ? (orden.dir === 'asc' ? 'ti-arrow-up' : 'ti-arrow-down') : 'ti-arrows-sort'}`}
                          aria-hidden="true" style={{ opacity: activa ? 1 : 0.5 }} />
                      </button>
                    ) : c.titulo}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visibles.map(f => (
              <tr key={claveFila(f)}>
                {columnas.map(c => (
                  <td key={c.clave} style={c.estilo}>{c.render ? c.render(f) : f[c.clave]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="paginacion">
        <span className="paginacion-info">
          Mostrando {ordenadas.length === 0 ? 0 : inicio + 1}–{Math.min(inicio + tamano, ordenadas.length)} de {ordenadas.length}
        </span>
        <label className="paginacion-tamano">
          Filas por página
          <select value={tamano} onChange={e => { setTamano(Number(e.target.value)); setPagina(1) }}>
            {TAMANOS_PAGINA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className="paginacion-botones">
          <button type="button" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 1} aria-label="Página anterior">
            <i className="ti ti-chevron-left" aria-hidden="true" />
          </button>
          {numeros.map((n, i) => n === '…'
            ? <span key={`e${i}`} className="paginacion-elipsis">…</span>
            : (
              <button type="button" key={n} onClick={() => setPagina(n)}
                className={n === paginaActual ? 'activa' : ''} aria-current={n === paginaActual ? 'page' : undefined}>
                {n}
              </button>
            ))}
          <button type="button" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas} aria-label="Página siguiente">
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
