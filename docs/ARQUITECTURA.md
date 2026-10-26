# Arquitectura — DualCheck UT

## Visión general

SPA React (Vite) que consume una API REST Express sobre MySQL. Despliegue en red local de la universidad; sin servicios externos.

```
Navegador (React SPA, :5173) --HTTP/JSON + Bearer JWT--> Express (:3001) --mysql2--> MySQL (dualcheck_db)
```

## Modelo de datos (`server/schema.sql`, 9 tablas)

| Tabla | Propósito |
|---|---|
| `usuarios` | Credenciales y perfil (`administrador`/`docente`/`estudiante`), `intentos_fallidos`, `bloqueado_hasta`, `requiere_cambio_password` |
| `administradores` | Existe en el esquema pero **ningún controlador la usa** (decidir si se elimina) |
| `docentes` | Datos del asesor, FK a `usuarios` |
| `estudiantes` | Matrícula, datos, requisitos `req_*`, estatus, FK a `usuarios` |
| `empresas_estadia` | Empresa donde el estudiante realiza la estadía |
| `periodos` | Cuatrimestre: `fecha_inicio`, `fecha_fin`, `activo`, `creado_por` (INT NOT NULL, FK `usuarios`) |
| `asignaciones` | estudiante–docente–periodo; `estatus` ENUM(`activa`,`concluida`,`cancelada`); `validada_por_docente` |
| `asistencia` | por asignación y semana: `confirmacion_docente`, `confirmacion_estudiante` y sus fechas |
| `bitacora` | Auditoría y almacén de solicitudes de corrección (JSON en `detalle`) |

Nota: Diego agregó manualmente `sede` y `tipo_contrato` en su BD local; **no están en `schema.sql`**. Se formalizarán cuando se definan los reportes extra del Prof. Felipe.

El primer administrador se crea a mano con un hash bcrypt (ver `README.md`).

## API (prefijo `/api`)

Salvo indicación, requiere JWT y perfil administrador.

- **auth**: `POST /auth/login` (público), `POST /auth/cambiar-password`, `GET /auth/requiere-cambio`
- **estudiantes**: `GET /`, `GET /:id`, `POST /`, `POST /carga-masiva` (multer, campo `archivo`, Excel), `PATCH /:id/requisitos|empresa|estatus-especial|baja`
- **docentes**: `GET /`, `POST /`, `PATCH /:id/baja` (no hay carga masiva: brecha de RF-07)
- **asignaciones**: `GET /`, `GET /sin-asesor`, `GET /docentes-activos`, `POST /`, `PATCH /:id/cancelar|concluir`
- **asistencia**
  - docente: `GET /mis-estudiantes`, `GET /asignacion/:id`, `PATCH /asignacion/:id/validar`, `POST /asignacion/:id/semana/:semana/docente`, `POST /asignacion/:id/semana/:semana/solicitar-correccion`
  - admin: `GET /solicitudes-pendientes`, `PATCH /solicitudes/:id_bitacora/aprobar|rechazar`
  - estudiante (con `restringirIPEstudiante`): `GET /mi-asistencia`, `POST /asignacion/:id/semana/:semana/estudiante`
- **periodos**: `GET /`, `GET /activo` (cualquier perfil autenticado), `POST /`, `PATCH /:id/estatus`
- **reportes**: `GET /opciones`; `/estudiante/:id/periodo/:id`, `/docente/:id/periodo/:id`, `/periodo/:id`, cada uno con `/excel` y `/pdf`
- `GET /` (raíz, sin /api) es el health check; `GET /api/protegida` es una ruta de prueba solo admin.

## Flujos clave

**Login.** Se busca el usuario; si `bloqueado_hasta` está vigente -> 403. Para estudiantes se valida la IP **antes** de comparar la contraseña (si `IP_EQUIPO_ESTUDIANTE` está definida). Fallo de contraseña suma intento; al 5.º bloquea 15 min. Con contraseña correcta, si `usuarios.estatus = 0` (baja) -> 403. Éxito resetea contadores y firma JWT (15 min solo estudiante). `verificarToken` también consulta `estatus` en cada petición, porque los tokens de docente/admin no expiran.

**Periodos.** Un periodo nuevo se crea activo solo si no hay otro activo; si lo hay, se crea inactivo y se activa con `PATCH /periodos/:id/estatus` (que desactiva los demás).

**Asistencia semanal.** El docente confirma y el estudiante confirma por separado, solo en la semana actual (calculada desde `fecha_inicio`, tope 13). Una semana queda "completa" con ambas confirmaciones.

**Correcciones.** Docente -> `SOLICITUD_CORRECCION` en `bitacora` (JSON). Admin: aprobar actualiza el JSON a APROBADA, crea/actualiza `asistencia` con `confirmacion_docente = 1` y registra `APROBACION_CORRECCION`; rechazar marca RECHAZADA con `rechazada_por`, `fecha_rechazo`, `motivo_rechazo` opcional y registra `RECHAZO_CORRECCION`. Solo procesa solicitudes PENDIENTE.

**Carga masiva.** Excel -> multer -> ExcelJS -> inserta estudiantes y sus usuarios (contraseña inicial = matrícula, cambio obligatorio). Formato de referencia: `Control de Estadías MayAgo 2024.xlsx` (archivo del proyecto en claude.ai).

## Frontend

- `AuthContext` guarda token/perfil/correo en `localStorage`; `api.js` adjunta el Bearer y, ante 401/403 fuera de `/auth/login`, limpia sesión y redirige a `/`.
- Panel por perfil: admin (Dashboard, Estudiantes, Docentes, Asignaciones, Periodos, Reportes, Correcciones), docente (Dashboard), estudiante (Dashboard táctil).
- Búsqueda y filtros: `useFiltro(datos, { buscarEn, filtros })` + `<BarraFiltros />` + `<SinResultadosFiltro />`; clases CSS `.barra-herramientas`, `.buscador`, `.filtro-select`, `.btn-limpiar-filtros`, `.contador-resultados`, `.sin-resultados`, `.stat-card-clicable` en `client/src/index.css`.
- Deuda conocida de lint: `cargar` usado antes de su declaración (regla react-hooks/immutability) en ~13 archivos; no afecta la ejecución.

## Datos de prueba

`seed_datos_prueba.js` es idempotente: crea periodo, docentes, estudiantes y escenarios SEED001–014 (incluye una solicitud de corrección pendiente). Todo con correos `@seed.local` / `@alumno.seed.local`; `limpiar_datos_prueba.sql` los elimina.
