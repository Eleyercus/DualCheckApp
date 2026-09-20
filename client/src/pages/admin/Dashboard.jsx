import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Estudiantes from './Estudiantes'
import Docentes from './Docentes'
import Asignaciones from './Asignaciones'
import Periodos from './Periodos'
import Reportes from './Reportes'
import Correcciones from './Correcciones'

export default function AdminDashboard() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [seccion, setSeccion] = useState('estudiantes')

  const handleLogout = () => { logout(); navigate('/') }

  const navItems = [
    { key: 'periodos', label: 'Periodos', icon: 'ti-calendar-time' },
    { key: 'estudiantes', label: 'Estudiantes', icon: 'ti-users' },
    { key: 'docentes', label: 'Docentes', icon: 'ti-school' },
    { key: 'asignaciones', label: 'Asignaciones', icon: 'ti-link' },
    { key: 'asistencia', label: 'Correcciones', icon: 'ti-calendar-check' },
    { key: 'reportes', label: 'Reportes', icon: 'ti-chart-bar' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F4F6F4' }}>
      <aside style={{
        width: '220px', background: 'var(--verde)',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
            Dual<span style={{ color: 'var(--naranja)' }}>Check</span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
            Panel Administrador
          </div>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setSeccion(item.key)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '10px 1.25rem',
              background: seccion === item.key ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderLeft: seccion === item.key ? '3px solid var(--naranja)' : '3px solid transparent',
              color: seccion === item.key ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: '13px', textAlign: 'left', cursor: 'pointer', transition: 'all .15s'
            }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
            Sección actual
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
            {navItems.find(n => n.key === seccion)?.label}
          </div>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', wordBreak: 'break-all' }}>
            {usuario?.correo}
          </p>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px',
            background: 'transparent', border: '1px solid rgba(168,169,173,0.4)',
            borderRadius: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer'
          }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '52px', background: '#fff',
          borderBottom: '1px solid var(--borde)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 1.5rem',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--verde-oscuro)' }}>
            {navItems.find(n => n.key === seccion)?.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '10px', fontWeight: '700', color: 'var(--verde)',
              border: '1px solid var(--dorado)', padding: '3px 8px',
              borderRadius: '4px', letterSpacing: '0.8px'
            }}>UTCAD</span>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--verde)', border: '2px solid var(--dorado)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: '700', color: 'var(--dorado)'
            }}>UT</div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {seccion === 'periodos' && <Periodos />}
          {seccion === 'estudiantes' && <Estudiantes />}
          {seccion === 'docentes' && <Docentes />}
          {seccion === 'asignaciones' && <Asignaciones />}
          {seccion === 'asistencia' && <Correcciones />}
          {seccion === 'reportes' && <Reportes />}
        </main>
      </div>
    </div>
  )
}