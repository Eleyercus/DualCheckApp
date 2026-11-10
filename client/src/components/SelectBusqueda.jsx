import Select from 'react-select'

const VERDE = '#1F5C2E'

const estilos = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    fontSize: '13px',
    borderRadius: '6px',
    borderColor: state.isFocused ? VERDE : '#e2e8e4',
    boxShadow: 'none',
    '&:hover': { borderColor: VERDE },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '13px',
    backgroundColor: state.isSelected ? VERDE : state.isFocused ? '#f0fdf4' : '#fff',
    color: state.isSelected ? '#fff' : '#374151',
  }),
  menu: base => ({ ...base, zIndex: 20 }),
  placeholder: base => ({ ...base, color: '#9ca3af' }),
}

/**
 * Selector con búsqueda por texto (equivalente a Select2), para listas largas
 * de estudiantes o docentes. La búsqueda ignora mayúsculas y acentos.
 *
 * @param {Array<{value: string|number, label: string}>} opciones
 * @param {string|number} valor - value de la opción seleccionada ('' si ninguna).
 * @param {(value: string) => void} onCambio - Recibe el value como texto ('' al limpiar).
 */
export default function SelectBusqueda({ opciones, valor, onCambio, placeholder = 'Escribe para buscar...', inputId }) {
  const seleccionada = opciones.find(o => String(o.value) === String(valor)) || null
  return (
    <Select
      inputId={inputId}
      options={opciones}
      value={seleccionada}
      onChange={op => onCambio(op ? String(op.value) : '')}
      placeholder={placeholder}
      isClearable
      noOptionsMessage={() => 'Sin coincidencias'}
      styles={estilos}
    />
  )
}
