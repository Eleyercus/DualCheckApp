/**
 * Barra de búsqueda + filtros reutilizable para paneles con tablas o listas.
 *
 * @param {string} query - Texto de búsqueda actual.
 * @param {(v: string) => void} onQuery
 * @param {string} placeholder - Placeholder del buscador.
 * @param {Array<{clave: string, label: string, opciones: Array<{value: string, label: string}>}>} filtros
 *   Definición de los selects de filtro a mostrar.
 * @param {Object} valoresFiltro - Valor actual por clave de filtro.
 * @param {(clave: string, valor: string) => void} onFiltro
 * @param {() => void} onLimpiar
 * @param {boolean} hayFiltrosActivos
 * @param {number} total
 * @param {number} totalFiltrado
 */
export default function BarraFiltros({
  query, onQuery, placeholder = 'Buscar...',
  filtros = [], valoresFiltro = {}, onFiltro,
  onLimpiar, hayFiltrosActivos, total, totalFiltrado
}) {
  return (
    <div className="barra-herramientas">
      <div className="buscador">
        <i className="ti ti-search" aria-hidden="true" />
        <input
          type="text"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {query && (
          <button
            type="button"
            className="buscador-limpiar"
            onClick={() => onQuery('')}
            aria-label="Limpiar búsqueda"
            title="Limpiar búsqueda"
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        )}
      </div>

      {filtros.map(f => (
        <select
          key={f.clave}
          className="filtro-select"
          value={valoresFiltro[f.clave] || ''}
          onChange={e => onFiltro(f.clave, e.target.value)}
          aria-label={f.label}
        >
          <option value="">{f.label}: todos</option>
          {f.opciones.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {hayFiltrosActivos && (
        <button type="button" className="btn-limpiar-filtros" onClick={onLimpiar}>
          <i className="ti ti-filter-x" aria-hidden="true" /> Limpiar filtros
        </button>
      )}

      {typeof total === 'number' && (
        <span className="contador-resultados">
          {hayFiltrosActivos ? `${totalFiltrado} de ${total}` : total}
          {' '}resultado{total === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}

/** Estado vacío consistente para usar dentro de tablas/listas filtradas. */
export function SinResultadosFiltro({ onLimpiar, mensaje = 'No se encontraron resultados con los filtros aplicados.' }) {
  return (
    <div className="sin-resultados">
      <i className="ti ti-filter-off" aria-hidden="true" />
      <p>{mensaje}</p>
      {onLimpiar && (
        <button type="button" className="btn-secundario" style={{ marginTop: '10px' }} onClick={onLimpiar}>
          Limpiar filtros
        </button>
      )}
    </div>
  )
}