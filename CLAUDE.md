# CLAUDE.md — DualCheck UT

Contexto para continuar el desarrollo en Claude Code. Léelo completo antes de tocar código. Detalle en `docs/`:

- `docs/ARQUITECTURA.md` — estructura, API, modelo de datos, reglas de negocio
- `docs/ESTADO_Y_PENDIENTES.md` — qué está hecho, qué falta, bloqueos externos
- `docs/DECISIONES.md` — decisiones tomadas y por qué
- `docs/DESPLIEGUE_Y_WINDOWS.md` — despliegue en Windows, pm2, trampas de PowerShell
- `docs/INSTALACION_LOCAL.md` — guía para que el equipo instale la app en su PC/laptop con datos de prueba (incluye `scripts/crear_admin.js`)

## Qué es

**DualCheck UT**: aplicación web en red local para la Universidad Tecnológica de Cadereyta (UTCAD). Valida la asistencia semanal de estudiantes en **estadía** con **doble confirmación**: el **docente asesor** y el **estudiante**. Incluye carga masiva de estudiantes desde Excel, asignación de asesores, reportes PDF/Excel y un flujo de correcciones aprobado por el administrador.

- El nombre es **DualCheck UT** (nunca "SIVAES", que es el nombre viejo de los docs del proyecto).
- Desarrollador principal: Diego (junior full-stack, Windows, PowerShell). Idioma de trabajo: **español**.
- Repo: github.com/Eleyercus/DualCheckApp (rama `main`). Local dev: `E:\DualCheckAPP`. Servidor/PC de prueba: `C:\DualCheckApp`.
- Metodología: XP. En documentos propios usar **"iteraciones"**, nunca "sprints".

## Stack

- Cliente: React 19 + Vite (puerto dev 5173), React Router, Axios.
- Servidor: Node.js + Express (puerto 3001), mysql2/promise, JWT, bcryptjs, multer, ExcelJS, PDFKit.
- BD: MySQL 8.0, `dualcheck_db`, utf8mb4_unicode_ci. Fuente de verdad del esquema: `server/schema.sql`.
- Gestor de paquetes: **pnpm**. Producción: **pm2** (+ pm2-windows-startup) y `serve` para el frontend estático.

## Comandos

```bash
# Servidor (desde server/)
pnpm install
pnpm dev        # nodemon src/index.js
pnpm start      # node src/index.js

# Cliente (desde client/)
pnpm install
pnpm dev
pnpm build      # usa client/.env.production (VITE_API_URL)
pnpm lint

# Datos de prueba (desde server/, requiere >= 1 admin)
node scripts/seed_datos_prueba.js
```

Scripts SQL en `server/scripts/`: `limpiar_datos_prueba.sql` (borra solo `%seed.local`) y `reset_total_produccion.sql` (**IRREVERSIBLE**: borra todo salvo administradores; solo en BD local o con datos ficticios; NO se ejecuta en el servidor real una vez que haya datos reales).

## Variables de entorno

`server/.env` (no se sube a git): `PORT`, `JWT_SECRET`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `IP_EQUIPO_ESTUDIANTE` (vacío = restricción apagada; acepta lista de IPs).
`client/.env.production` (build-time, no se sube): `VITE_API_URL=http://<IP_SERVIDOR>:3001/api`. Plantilla en `client/.env.example`. Sin ella la app compilada apunta a `localhost:3001`.

## Mapa del código

```
server/src/index.js                  app Express, monta rutas /api/*
server/src/config/db.js              pool mysql2 (dotenv)
server/src/middleware/auth.js        verificarToken, soloAdmin/Docente/Estudiante
server/src/middleware/restringirIPEstudiante.js
server/src/controllers/*  routes/*   auth, estudiantes, docentes, asignaciones, asistencia, periodos, reportes
server/scripts/                      seed, limpiar, reset
server/schema.sql                    9 tablas
client/src/services/api.js           axios + interceptores (token, 401/403 -> logout)
client/src/context/AuthContext.jsx
client/src/hooks/useFiltro.js        búsqueda + filtros genérico
client/src/components/BarraFiltros.jsx (+ SinResultadosFiltro), ModalCambioPassword.jsx
client/src/pages/{Login.jsx, admin/*, docente/Dashboard.jsx, estudiante/Dashboard.jsx}
```

## Reglas de negocio que NO debes romper

1. Tres perfiles: `administrador`, `docente`, `estudiante`. Los permisos se imponen en el middleware de cada ruta.
2. Login: 5 intentos fallidos -> bloqueo 15 min (`intentos_fallidos`, `bloqueado_hasta`). Primer login obliga a cambiar contraseña (`requiere_cambio_password`).
3. JWT del estudiante expira en **15 min**; docente y admin no expiran.
4. Hay **un solo periodo activo** global. Periodos de ~4 meses (3/año). La semana actual se calcula desde `periodos.fecha_inicio` (1..13; 0 si aún no inicia). Ver `calcularSemanaActual` en `asistenciaController.js`.
5. Asignar un estudiante exige los 3 requisitos documentales (`req_datos_estadia`, `req_carta_no_adeudo`, `req_carta_servicios`) y no tener otra asignación `activa` en el periodo.
6. Asistencia por (asignación, semana): `confirmacion_docente` y `confirmacion_estudiante`.
7. **Correcciones**: el docente solicita (semana pasada, motivo >= 10 caracteres). La solicitud se guarda en `bitacora` (accion `SOLICITUD_CORRECCION`, `detalle` = JSON con `estatus` PENDIENTE/APROBADA/RECHAZADA). El admin aprueba (crea/actualiza la fila de asistencia retroactiva) o rechaza.
8. Restricción por IP del estudiante (`IP_EQUIPO_ESTUDIANTE`): aplica al login de estudiantes y a sus endpoints de confirmación. Vacía = deshabilitada.
9. Los "rezagados" (estudiantes que entran tarde) usan el flujo de correcciones; no hay fechas de inicio por asignación (limitación de diseño aceptada).

## Convenciones

- UI y mensajes de error en español con acentos. En datos del seed, nombres **sin acentos**.
- Respuestas de error: `res.status(n).json({ error: '...' })`; éxito: `{ mensaje: '...' }`.
- Acciones relevantes se registran en `bitacora(id_usuario, accion, entidad_afectada, detalle)`.
- Controladores con try/catch, `console.error` y 500 genérico.
- Documentos formales (UTCAD): Arial 12, interlineado 1.5, justificado, títulos en mayúsculas y negritas, márgenes ~0.98"/1.18".
- Nunca subir `.env`, `.env.production`, contraseñas ni datos reales de estudiantes.
- Commits: separados (`git add .`, `git commit -m "..."`, `git push` en líneas distintas o con `;`; en PowerShell 5.1 no existe `&&`).

## Seguridad / antes de producción

- Rotar `JWT_SECRET` y la contraseña de BD (se expusieron en chats de trabajo).
- Cambiar la contraseña del admin de desarrollo (`admin@dualcheck.edu` / `admin123` es **solo dev**).
- Contraseñas iniciales: estudiante = matrícula; docente = apellido paterno en minúsculas + `123`; ambos obligados a cambiarla en el primer login.
- Sin HTTPS aún (RNF-07 pendiente). Sin `trust proxy` en Express: si se pone un proxy inverso, ajustar la detección de IP.

## Estado resumido (2026-10-26)

~85 % completo y funcional end-to-end (verificado desde BD vacía con schema + seed). Falta cerrar despliegue en Windows (servidor 172.16.3.212 sin acceso de TI aún; hay una PC de equipo en proceso de instalación) y varios pendientes de producto. Ver `docs/ESTADO_Y_PENDIENTES.md`.
