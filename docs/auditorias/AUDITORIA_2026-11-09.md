# Auditoría QA — DualCheck UT — 2026-11-09

## 1. Resumen

| Dato | Valor |
|---|---|
| Fecha | 9 de noviembre de 2026 |
| Versión auditada | `main` en `c7afb87` (incluye los PR #2, #3 y #4) |
| Entorno | Windows, Node 24, MySQL 8.0, base separada `dualcheck_qa` con el seed; app en `localhost` |
| Método | Uso de la app en el navegador integrado como admin, docente y estudiante (escritorio, tablet y celular) + 3 tandas de pruebas contra la API + revisión del Excel real "Control de Estadías May-Ago 2024" del Drive |
| Procedimiento | Skill `/auditoria-qa` (`.claude/skills/auditoria-qa/SKILL.md`) |

| Severidad | Hallazgos |
|---|---|
| Crítica | 3 |
| Alta | 7 |
| Media | 12 |
| Baja | 10 |
| **Total** | **32** |

**Conclusión:** los flujos principales funcionan de punta a punta (login, doble validación, correcciones, reportes, permisos entre perfiles). Antes de operar con datos reales hay que resolver los 3 hallazgos críticos: la carga masiva no acepta el Excel real de la universidad, toma un "No" como requisito entregado, y el panel del estudiante no cierra la sesión en el equipo compartido.

### Prioridad sugerida

- **Antes de la reunión del 10 de noviembre** (afectan la demostración): QA-07 (cargar el seed antes de las 18:00 o corregirlo), QA-10, QA-11, QA-14 y, si da tiempo, QA-03.
- **Para decidir con la universidad:** QA-01 y QA-02 dependen del formato oficial del Excel; QA-04 y QA-05 dependen de cómo manejan bajas y reincorporaciones.
- **Antes del despliegue:** todos los críticos y altos.

## 2. Tabla de hallazgos

| ID | Severidad | Módulo | Título |
|---|---|---|---|
| QA-01 | Crítica | Carga masiva | El Excel real de Control de Estadías no se puede cargar |
| QA-02 | Crítica | Carga masiva | Un "No" en las columnas de requisitos cuenta como entregado |
| QA-03 | Crítica | Panel estudiante | La sesión no se cierra sola en el equipo compartido |
| QA-04 | Alta | Estudiantes | El estatus "Baja" del selector no quita el acceso y no hay forma de reincorporar |
| QA-05 | Alta | Docentes | Dar de baja a un docente deja sus asignaciones activas |
| QA-06 | Alta | Periodos | Se puede dejar el sistema sin periodo activo |
| QA-07 | Alta | Datos de prueba | El seed calcula la semana con fecha UTC y rompe la demo si se carga de noche |
| QA-08 | Alta | API | Errores comunes responden "Error interno del servidor" |
| QA-09 | Alta | Reportes | Los reportes muestran asignaciones canceladas como vigentes |
| QA-10 | Alta | Asignaciones | El contador "Asignaciones activas" siempre marca 0 |
| QA-11 | Media | Asignaciones / Docente | Las fechas del periodo se muestran un día antes |
| QA-12 | Media | Correcciones | Se aceptan solicitudes de semana 0, de semanas ya registradas y duplicadas |
| QA-13 | Media | Correcciones | Una asignación sin validar puede recibir asistencias |
| QA-14 | Media | Reportes PDF | El símbolo ✓ sale como un apóstrofo |
| QA-15 | Media | Estudiantes | El formulario de alta no valida por paso y oculta el error |
| QA-16 | Media | Interfaz | Login no se adapta a celular y las tablas del admin se cortan |
| QA-17 | Media | Seguridad | El cambio de contraseña obligatorio solo existe en la interfaz |
| QA-18 | Media | Validación | Correos sin formato válido y campos con solo espacios se aceptan |
| QA-19 | Media | Seguridad | Un docente puede consultar la asistencia de asignaciones ajenas |
| QA-20 | Media | Asignaciones | Se puede asignar a un dado de baja y cancelar asignaciones ya cerradas |
| QA-21 | Media | Interfaz | Confirmaciones con diálogos nativos sin contexto |
| QA-22 | Media | Seguridad | Los errores de Express exponen la traza en HTML |
| QA-23 | Baja | Panel estudiante | Saluda con el correo y no muestra nombre ni asesor |
| QA-24 | Baja | Login | Pide "correo institucional" aunque los estudiantes usan correo personal |
| QA-25 | Baja | Docentes | Contraseña inicial con espacios o acentos en apellidos compuestos |
| QA-26 | Baja | Periodos | Los periodos no se pueden editar ni eliminar, ni se valida su duración |
| QA-27 | Baja | Interfaz | Al recargar, el admin vuelve siempre a "Estudiantes" |
| QA-28 | Baja | Accesibilidad | Las etiquetas de los formularios no están ligadas a sus campos |
| QA-29 | Baja | Estudiantes | La tarjeta "Activos" no cuenta a los reincorporados |
| QA-30 | Baja | Reportes PDF | "Estudiantes asignados" se encima con su valor en el reporte del docente |
| QA-31 | Baja | Seguridad | El mensaje de cuenta bloqueada revela que el correo existe |
| QA-32 | Baja | API | Actualizar requisitos de un estudiante inexistente responde éxito |

## 3. Detalle

### QA-01 · Crítica · El Excel real de Control de Estadías no se puede cargar

- **Pasos:** cargar un archivo con la estructura del formato R-02-8.6-VI "Control de Estadías" (Drive: `Control de Estadías May-Ago 2024.xlsx`).
- **Esperado:** se importan los estudiantes.
- **Obtenido:** 0 registros; todas las filas fallan con "Faltan campos requeridos". El formato real tiene filas de título antes del encabezado, no tiene columnas separadas "Nombre", "Apellido P", "Apellido M" ni "Correo Personal" (usa "Correo Electrónico", repetido para el alumno y la empresa), y no trae "Grupo". Además maneja 18 documentos (no 3), asesor, horario de asesoría, sedes (Cadereyta, Allende, China) y marcas de BAJA, Reinc y VERIFS.
- **Evidencia:** prueba B7 (archivo con filas de título → 0 exitosos, 3 errores).
- **Sugerencia:** pedir a coordinación el formato oficial con datos ficticios y adaptar `cargaMasiva` en `server/src/controllers/estudiantesController.js`: detectar la fila de encabezado, mapear las columnas reales y mostrar una vista previa antes de insertar (RF-08 pide validar *antes* de aplicar).

### QA-02 · Crítica · Un "No" en las columnas de requisitos cuenta como entregado

- **Pasos:** carga masiva con "No" en Datos Estadías, Carta N/A o Convenio y Carta Servicios Escolares.
- **Esperado:** requisitos pendientes (0/3).
- **Obtenido:** 3/3; el estudiante queda listo para asignar sin documentos. Cualquier texto (`No`, `x`, `Pendiente`) cuenta como entregado.
- **Evidencia:** prueba B6 (QAM02 con "No" → `req=111`).
- **Sugerencia:** en `estudiantesController.js:247-249` aceptar solo valores explícitos (Sí, SI, X, ✓, 1, Entregado) y reportar los valores no reconocidos.

### QA-03 · Crítica · La sesión no se cierra sola en el equipo compartido

- **Pasos:** el estudiante entra en el equipo de recepción, confirma y se va sin pulsar "Salir".
- **Esperado:** la sesión se cierra tras confirmar o tras un tiempo breve de inactividad (RNF-06, CU-06 paso 6).
- **Obtenido:** el panel queda abierto hasta 15 minutos; el siguiente alumno ve los datos del anterior y puede confirmar por él. El token expira a los 15 minutos, pero la interfaz no cierra la sesión por su cuenta.
- **Evidencia:** no existe ningún temporizador en el cliente (`setTimeout`/`setInterval`); token de estudiante con `exp` a 15 min (T1).
- **Sugerencia:** en `client/src/pages/estudiante/Dashboard.jsx`, cerrar sesión unos segundos después de confirmar y por inactividad (60–120 s), con una cuenta regresiva visible.

### QA-04 · Alta · El estatus "Baja" del selector no quita el acceso y no hay forma de reincorporar

- **Pasos:** en el detalle del estudiante cambiar el estatus especial a "Baja" o "Baja por reprobación"; en otro estudiante dado de baja con el botón, cambiarlo a "Activo" o "Reincorporado".
- **Esperado:** las bajas impiden el acceso y la reincorporación lo restaura.
- **Obtenido:** con "Baja" desde el selector el estudiante sigue entrando (B1: login 200). Un estudiante dado de baja con el botón y marcado "Activo" aparece activo en la lista pero no puede entrar (E9b: 403). El Excel real registra muchas reincorporaciones.
- **Sugerencia:** en `actualizarEstatusEspecial` sincronizar `usuarios.estatus` con el estatus especial (baja y baja_reprobacion → 0; activo y reincorporado → 1) y registrar el cambio en la bitácora.

### QA-05 · Alta · Dar de baja a un docente deja sus asignaciones activas

- **Pasos:** dar de baja a un docente con estudiantes asignados.
- **Obtenido:** sus asignaciones siguen "activa"; sus estudiantes siguen viendo a ese asesor y no aparecen en "sin asesor" para reasignarlos (B2, B2b, B2d).
- **Sugerencia:** advertir cuántos estudiantes tiene antes de la baja y ofrecer cancelarlas o reasignarlas (`docentesController.bajaDocente`).

### QA-06 · Alta · Se puede dejar el sistema sin periodo activo

- **Pasos:** `PATCH /periodos/99999/estatus {activo:true}`, o pulsar "Desactivar" en el periodo activo (sin confirmación).
- **Obtenido:** todos los periodos quedan inactivos (P3b: antes `[1]`, después `[]`); asignaciones y carga quedan bloqueadas.
- **Sugerencia:** en `cambiarEstatusPeriodo` validar que el periodo exista y hacer ambos UPDATE en una transacción; pedir confirmación al desactivar el periodo activo.

### QA-07 · Alta · El seed calcula la semana con fecha UTC

- **Pasos:** ejecutar `seed_datos_prueba.js` después de las 18:00 (hora del centro de México).
- **Obtenido:** el periodo se guarda con la fecha UTC (un día después). El seed cree que es la semana 5 y la app calcula la 4; Ricardo queda con la "semana 5" registrada pero bloqueada como futura, y el escenario "puede confirmar" de la guía no funciona.
- **Evidencia:** panel del docente: "5/13 semanas registradas" con la semana 5 marcada como futura.
- **Sugerencia:** en `seed_datos_prueba.js`, `fmtFecha` debe usar la fecha local (`getFullYear/getMonth/getDate`), no `toISOString()`. **Para la demo de mañana:** cargar los datos de prueba antes de las 18:00.

### QA-08 · Alta · Errores comunes responden "Error interno del servidor"

- **Casos:** matrícula duplicada (E2), texto de más de 100 caracteres (E3), sexo inválido (E5), periodo con fecha inválida (P1), docente inexistente (A1), semana no numérica (S1), empresa de estudiante inexistente (E7). Todos responden 500.
- **Impacto:** la matrícula duplicada es un error frecuente al capturar y el usuario no sabe qué corregir.
- **Sugerencia:** validar antes de insertar y traducir `ER_DUP_ENTRY`, `ER_DATA_TOO_LONG` y `ER_NO_REFERENCED_ROW` a 400 con un mensaje claro.

### QA-09 · Alta · Los reportes muestran asignaciones canceladas como vigentes

- **Pasos:** asignar a un estudiante, cancelar y reasignar con otro docente en el mismo periodo; generar su reporte.
- **Obtenido:** el reporte del estudiante muestra al asesor anterior y el estatus "cancelada" (B4b). El reporte del periodo cuenta asignaciones, no estudiantes (el reasignado aparece dos veces, R4). El reporte del docente incluye estudiantes cancelados sin indicarlo.
- **Sugerencia:** en `reportesController.js` preferir la asignación activa o concluida (`ORDER BY` por estatus y fecha), y en los reportes de periodo y docente excluir las canceladas o mostrar su estatus.

### QA-10 · Alta · El contador "Asignaciones activas" siempre marca 0

- **Obtenido:** con 12 asignaciones activas, la tarjeta muestra 0.
- **Causa:** `client/src/pages/admin/Asignaciones.jsx:75` filtra por `a.activa`, campo que dejó de existir al migrar a `estatus`.
- **Sugerencia:** `asignaciones.filter(a => a.estatus === 'activa')`.

### QA-11 · Media · Las fechas del periodo se muestran un día antes

- **Obtenido:** Periodos muestra "13 de octubre — 11 de enero"; Asignaciones y el panel docente muestran "12 de octubre — 10 de enero".
- **Causa:** `new Date('2026-10-13')` se interpreta como medianoche UTC (18:00 del día anterior en México). `Asignaciones.jsx:168-170` y `docente/Dashboard.jsx:459-461`.
- **Sugerencia:** construir la fecha con año, mes y día locales, como ya lo hace el cálculo de la semana.

### QA-12 · Media · Solicitudes de corrección sin control

- **Obtenido:** se aceptan solicitudes para la semana 0 (S3, y al aprobarla se crea una fila de asistencia de la semana 0), para semanas ya registradas (S4; al aprobarla se sobrescribe la fecha original del registro) y duplicadas para una semana con otra pendiente (S5). El admin no ve el estado actual de esa semana al decidir.
- **Sugerencia:** en `solicitarCorreccion` validar semana entre 1 y la actual, que no esté registrada por el docente y que no exista otra pendiente; en `aprobarCorreccion` no tocar la fecha si ya estaba confirmada.

### QA-13 · Media · Una asignación sin validar puede recibir asistencias

- **Pasos:** el docente pide corrección para un estudiante cuya asignación no ha validado; el admin la aprueba; el estudiante confirma.
- **Obtenido:** la semana queda con doble validación aunque el docente nunca validó la asignación (B5c).
- **Sugerencia:** exigir `validada_por_docente` en `solicitarCorreccion` y en `confirmarAsistenciaEstudiante`.

### QA-14 · Media · El símbolo ✓ sale como un apóstrofo en los PDF

- **Obtenido:** en los reportes PDF por estudiante y por docente, "✓ Registrado" se ve como "' Registrado" y la cuadrícula semanal del docente muestra apóstrofos.
- **Causa:** las fuentes estándar de PDFKit (Helvetica) no incluyen el carácter ✓ (`reportesController.js:99-100`).
- **Sugerencia:** usar texto ("Sí") o registrar una fuente TTF que incluya el símbolo.

### QA-15 · Media · El formulario de alta no valida por paso y oculta el error

- **Pasos:** "Nuevo estudiante" → avanzar los 3 pasos sin datos → "Guardar estudiante".
- **Obtenido:** el error aparece arriba del formulario mientras el usuario está al final del paso 3; parece que no pasó nada.
- **Sugerencia:** validar los campos obligatorios al pulsar "Siguiente" y desplazar la vista al mensaje de error.

### QA-16 · Media · Login no se adapta a celular y las tablas del admin se cortan

- **Obtenido:** a 375 px el logotipo se corta ("ualCheck") y el formulario queda angosto. En Correcciones, a 800 px de ancho las columnas se recortan. El panel del estudiante sí se adapta bien a tablet y celular.
- **Sugerencia:** en pantallas angostas apilar el panel verde sobre el formulario; dar desplazamiento horizontal a las tablas.

### QA-17 · Media · El cambio de contraseña obligatorio solo existe en la interfaz

- **Obtenido:** un docente nuevo usa la API sin haber cambiado su contraseña (R1); se aceptan contraseñas como "123456" (R2); el admin nunca está obligado a cambiarla.
- **Sugerencia:** rechazar en el servidor las peticiones (salvo `cambiar-password`) mientras `requiere_cambio_password = 1` y exigir una longitud mínima de 8 con letras y números.

### QA-18 · Media · Validaciones de formato

- **Obtenido:** se registran estudiantes y docentes con correo "noesuncorreo" (E1, D1) y estudiantes con matrícula, nombre y apellido formados solo por espacios (E4), que luego aparecen sin nombre en Asignaciones.
- **Sugerencia:** recortar espacios y validar el formato del correo en el servidor.

### QA-19 · Media · Un docente puede consultar la asistencia de asignaciones ajenas

- **Obtenido:** `GET /asistencia/asignacion/:id` devuelve la asistencia de un estudiante de otro docente (S6).
- **Sugerencia:** verificar en `getAsistencia` que la asignación pertenezca al docente.

### QA-20 · Media · Asignaciones sobre estados no válidos

- **Obtenido:** por la API se puede asignar a un estudiante dado de baja (A2) y cancelar una asignación ya cancelada o concluida (A3), lo que altera el historial.
- **Sugerencia:** en `crearAsignacion` validar que el estudiante y el docente estén activos; en `cancelarAsignacion` aceptar solo asignaciones activas.

### QA-21 · Media · Confirmaciones con diálogos nativos sin contexto

- **Obtenido:** aprobar, concluir, cancelar, activar y dar de baja usan `confirm()` del navegador con un texto genérico (por ejemplo, la aprobación no dice qué estudiante ni qué semana), y no se pueden probar de forma automatizada.
- **Sugerencia:** un modal propio con el detalle de la acción.

### QA-22 · Media · Los errores de Express exponen la traza en HTML

- **Obtenido:** un JSON malformado devuelve una página HTML con la traza de `SyntaxError` (G1); las rutas inexistentes responden en HTML; se envía la cabecera `X-Powered-By: Express`.
- **Sugerencia:** manejador de errores final que responda `{ error }` en español, y `app.disable('x-powered-by')`.

### QA-23 a QA-32 · Baja

- **QA-23:** el panel del estudiante muestra "Bienvenido luis.castillo@…" en lugar de su nombre, y no muestra a su asesor ni el periodo (la API ya los envía).
- **QA-24:** el login dice "Correo institucional" con el ejemplo `@utcadereyta.edu.mx`, pero los estudiantes entran con su correo personal.
- **QA-25:** la contraseña inicial de un docente "De la Cruz" es "de la cruz123" y la de "Muñoz" sería "muñoz123"; conviene quitar espacios y acentos.
- **QA-26:** los periodos no se pueden editar ni eliminar (un periodo creado por error queda para siempre) y se acepta un periodo de 1 día (P2).
- **QA-27:** la sección del admin no está en la URL; al recargar siempre vuelve a "Estudiantes".
- **QA-28:** los `<label>` no están ligados a sus campos (los lectores de pantalla anuncian el placeholder).
- **QA-29:** la tarjeta "Activos" (12 de 14) no cuenta a los reincorporados.
- **QA-30:** en el PDF del docente, la etiqueta "Estudiantes asignados:" se encima con su valor.
- **QA-31:** con una cuenta bloqueada el mensaje es "Cuenta bloqueada…" (403), distinto al de un correo inexistente (401), lo que revela qué correos existen.
- **QA-32:** `PATCH /estudiantes/99999/requisitos` responde "Requisitos actualizados correctamente" (E6).

## 4. Lo que se probó y funcionó

- Login, logout y botón Atrás tras cerrar sesión; mensaje de credenciales incorrectas; bloqueo tras 5 intentos.
- Permisos entre perfiles: estudiante y docente no acceden a endpoints de admin; estudiante no confirma en asignaciones ajenas; docente no registra en asignaciones ajenas.
- Token del estudiante de 15 minutos; docente y admin sin expiración; baja con el botón bloquea el acceso.
- Semanas futuras bloqueadas; semana fuera de 1–13 rechazada; confirmación retroactiva del estudiante tras una corrección aprobada.
- Panel del estudiante en tablet (768 px) y celular (375 px).
- Panel de correcciones: listado, filtros, contadores e historial de aprobadas y rechazadas.
- Los 6 reportes (3 tipos × PDF/Excel) se generan; estudiante sin asignación responde 404 con mensaje.
- Carga masiva con el formato que espera la app: crea registros y reporta por fila el correo repetido; normaliza el sexo en minúsculas.

## 5. Lo que no se pudo probar

- **Restricción por IP:** requiere configurar `IP_EQUIPO_ESTUDIANTE` y otro equipo en la red.
- **Aprobar o rechazar desde los botones de la interfaz:** usan `confirm()` nativo, que el navegador integrado no puede contestar; se probó por la API.
- **Expiración de la sesión del estudiante en la interfaz:** requiere esperar 15 minutos.
- **Rendimiento con el volumen real** (100–350 estudiantes), otros navegadores (Edge, Firefox) y uso concurrente.
