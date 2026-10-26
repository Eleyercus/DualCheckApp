# Estado y pendientes — DualCheck UT

Corte: 2026-10-26 (HEAD `80cecd6`, rama `main`). Avance estimado: ~85 %.

## Hecho

- Autenticación JWT, roles, bloqueo por intentos, cambio obligatorio de contraseña.
- Gestión de estudiantes (alta, carga masiva Excel, requisitos, empresa, bajas), docentes, periodos y asignaciones.
- Asistencia con doble confirmación; panel docente y panel estudiante táctil (sesión 15 min).
- Panel de correcciones del administrador (aprobar/rechazar) con solicitud del docente.
- Búsqueda y filtros en todos los paneles (hook + componente reutilizables).
- Reportes PDF y Excel por estudiante, docente y periodo.
- Restricción por IP para estudiantes (apagada por defecto).
- `schema.sql` verificado idéntico a la BD real; seed/limpieza/reset; `VITE_API_URL`.
- Docs: README, DEPLOY.md, comandos.txt; manual Windows (DEPLOY_windows.md, entregado en chat); bitácora de iteración y entregable del curso (fuera del repo).
- Verificado E2E desde BD vacía (schema + seed + login + PDF + correcciones + IP) en sandbox con MariaDB.

## En curso: instalación en PC de equipo / servidor Windows

Estado en la PC de un compañero (`C:\DualCheckApp`): pm2 con backend en línea; fallaba `Access denied for user 'dualcheck'@'localhost'`. Falta confirmar:

1. Usuario MySQL `dualcheck` con la misma contraseña que `server/.env` (`CREATE USER`/`ALTER USER` + `GRANT` sobre `dualcheck_db.*`), luego `pm2 flush` y `pm2 restart all --update-env`.
2. Logs muestran "Conexión a MySQL exitosa".
3. Crear admin (hash bcrypt + `INSERT INTO usuarios ...`).
4. `client/.env.production` con `VITE_API_URL=http://<IP>:3001/api`, `pnpm build`, `pm2 start "serve -s dist -l 5173"`, `pm2 save`.
5. Abrir puertos 3001 y 5173 en el firewall y probar desde otro equipo de la LAN.

## Bloqueos externos (esperan respuesta)

- **TI**: acceso/credenciales del servidor 172.16.3.212 (Windows, sin Node ni MySQL), instalación de dependencias, IP fija del equipo de estudiantes. Plan B: correr desde un equipo del equipo dentro de la LAN de UTCAD.
- **Coordinación de Estadías / Subdirección**: fechas reales de inicio y fin del periodo; lista de ~10 rezagados y si inician en la semana 1 o con semanas previas; definición de reportes extra.
- Los datos actuales son **ficticios**. Cuando lleguen los reales: reset total (solo si la BD tiene datos ficticios) -> crear periodo real -> carga masiva -> activar `IP_EQUIPO_ESTUDIANTE`.

## Pendientes de producto

| Pendiente | Nota |
|---|---|
| Carga masiva de docentes (RF-07) | No existe endpoint ni UI |
| HTTPS (RNF-07) | Ninguno por ahora |
| Respaldo diario de BD (RNF-14) | Tarea programada de Windows + `mysqldump` |
| 3 reportes extra para Prof. Felipe | Necesitan `sede` y `tipo_contrato`; agregar columnas a `schema.sql` |
| Tabla `administradores` | Sin uso: decidir si se elimina |
| Fechas de inicio por asignación | Limitación conocida (rezagados); hoy se resuelve con correcciones |
| Errores de lint (`cargar` antes de declarar) | ~13 archivos |
| README real / guía de instalación | Parcialmente hecho por Diego |
| Capturas reales en el entregable del curso | Insertar 10 capturas |
| Corregir `DEPLOY_windows.md` | Ver abajo |

### Correcciones pendientes al manual de despliegue Windows

- Crear `.env` y `.env.production` con `Set-Content -Encoding ascii` (no `Out-File -Encoding utf8`: en PowerShell 5.1 añade BOM y rompe la primera variable).
- La verificación del login debe usar `Invoke-RestMethod -Method Post ...`; `GET /api/auth/login` responde "Cannot GET" y es normal. El mensaje esperado del GET a `/` también estaba mal.

## Seguridad antes de salir a producción

Rotar `JWT_SECRET` y contraseña de BD, cambiar la contraseña del admin dev, no usar `admin123`, confirmar que `.env*` no está en git, valorar HTTPS.

## Contactos del proyecto

- Equipo: Diego (desarrollo, líder), Alan Dibenhi Ledezma Hernández y Giancarlo Villarreal García (pruebas), Ángel Gabriel Ortega Segura y Elisa Paola Martínez Martínez (documentación). Grupo 15IEVND4N.
- Líder oficial: Lic. Nubia Del Carmen Romay Franyutti.
- Asesores/solicitantes: Ing. José Luis García Muñoz, Lic. Flor Edith Sahagún Sánchez, Ing. Omar Alejandro Mata Garza, MEBC. Felipe de Jesús Ramírez Turrubiartes (pide por WhatsApp), Ing. Paul Azuara Castillo.
