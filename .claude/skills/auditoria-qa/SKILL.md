---
name: auditoria-qa
description: Auditoría de calidad de DualCheck UT simulando usuarios reales (administrador, docente y estudiante) en el navegador integrado, más pruebas de bordes y permisos por API, sobre una base de datos de QA separada. Úsala con "/auditoria-qa", "audita la app", "busca bugs", "prueba la app como usuario" o antes de un despliegue o una demostración.
---

# Auditoría QA de DualCheck UT

Objetivo: descubrir bugs, errores de usabilidad, huecos de validación y de permisos, y cualquier información útil para mejorar la app, actuando como lo haría cada tipo de usuario. El resultado es un informe en español ordenado por severidad.

## Reglas de seguridad (no negociables)

- Trabaja **solo** contra la base `dualcheck_qa`. Nunca contra `dualcheck_db` (desarrollo) ni contra un servidor real.
- Usa la app en `http://localhost:5173` (API en `http://localhost:3001`). No uses la IP de red para iniciar sesión.
- Usa únicamente las cuentas del seed (`@seed.local`) y el admin de desarrollo de `CLAUDE.md`. No captures datos reales.
- No modifiques código durante la auditoría: solo observa y documenta. Las correcciones van después, en su propia rama.
- Si ya hay servidores corriendo en 3001 o 5173, averigua contra qué base apuntan antes de usarlos.

## 1. Preparar el entorno

```bash
cd server
node scripts/preparar_bd_qa.js     # recrea dualcheck_qa desde cero: esquema + admin + seed
```

Levanta la app con las configuraciones de `.claude/launch.json` (`preview_start`):
`dualcheck-api-qa` (API con `DB_NAME=dualcheck_qa`) y `dualcheck-web` (cliente Vite).

Comprueba que la API usa la base de QA: el periodo activo debe llamarse "Periodo de prueba <fecha de hoy menos 28 días>".

## 2. Cuentas y escenarios del seed

| Perfil | Correo | Contraseña | Escenario |
|---|---|---|---|
| Admin | admin@dualcheck.edu | admin123 | Todo |
| Docente | carlos.medina@seed.local | medina123 | Luis Castillo (corrección pendiente), Ricardo (esperando estudiante), Paola |
| Docente | jose.ramirez@seed.local | ramirez123 | Andres Rojas sin validar |
| Docente | ana.torres@seed.local | torres123 | Fernanda sin validar, Valeria (corrección aprobada) |
| Estudiante | ricardo.vazquez@alumno.seed.local | SEED007 | Puede confirmar la semana actual |
| Estudiante | andres.rojas@alumno.seed.local | SEED005 | Asesor sin validar |
| Estudiante | daniela.ibarra@alumno.seed.local | SEED014 | Sin asesor |
| Estudiante | karla.guerrero@alumno.seed.local | SEED012 | Dada de baja: no debe entrar |

La semana actual del periodo de prueba es la 5.

## 3. Cómo auditar

Combina dos técnicas:

- **Navegador integrado (como humano):** recorre cada pantalla, llena formularios con datos válidos, inválidos y extremos, usa atrás/recargar, cambia el tamaño de la ventana (móvil 375 px y tablet 768 px para el panel del estudiante) y revisa la consola y las peticiones de red después de cada acción.
- **Scripts contra la API (en el scratchpad):** para casos que la interfaz no permite intentar: permisos entre perfiles, IDs ajenos, valores fuera de rango, campos vacíos o muy largos, doble envío y condiciones de carrera.

Anota la evidencia de cada hallazgo (respuesta HTTP, mensaje en pantalla, error de consola) en el momento.

Lecciones de auditorías anteriores:
- Los botones que usan `confirm()` nativo (aprobar, concluir, cancelar, activar, dar de baja) no se pueden contestar desde el navegador integrado: prueba esa acción por la API y revisa el resultado en la interfaz.
- Si el seed se ejecuta después de las 18:00, la semana del seed puede quedar desfasada respecto a la app (QA-07 de la auditoría 2026-11-09). Revisa que la "semana actual" del panel docente coincida con la que imprimió el seed.
- Compara la carga masiva con el Excel real de "Control de Estadías" (Drive del equipo), no solo con las columnas que muestra la app.
- Revisa los PDF como imagen: algunos caracteres no se dibujan con las fuentes estándar de PDFKit.
- Consulta el informe anterior en `docs/auditorias/` y verifica primero si sus hallazgos ya se corrigieron.

## 4. Lista de verificación

**Acceso y sesión**
- Login correcto por perfil; credenciales erróneas; 5 intentos → bloqueo de 15 min; cuenta dada de baja.
- Cambio de contraseña obligatorio (docente y estudiante); validaciones del formulario.
- Expiración de la sesión del estudiante (claim `exp` del JWT = 15 min); qué ve el usuario cuando expira.
- Rutas protegidas: entrar por URL a `/admin` con otro perfil; recargar; botón atrás tras cerrar sesión.

**Administrador**
- Periodos: crear (fechas invertidas, iguales, vacías), activar, desactivar, quedarse sin periodo activo.
- Estudiantes: alta (duplicados de correo y matrícula, campos vacíos, textos muy largos, acentos y ñ), requisitos, empresa, estatus especial, baja, detalle.
- Carga masiva: archivo válido, filas con errores, archivo vacío, archivo que no es Excel, columnas con otros nombres.
- Docentes: alta (duplicados), contraseña inicial, baja con asignaciones activas.
- Asignaciones: requisitos incompletos, doble asignación, concluir, cancelar, reasignar.
- Correcciones: aprobar, rechazar con y sin motivo, procesar dos veces.
- Reportes: los 3 tipos en PDF y Excel; periodo sin datos; estudiante sin asignación.
- Filtros y búsqueda en cada listado; contadores y tarjetas.

**Docente**
- Validar asignación; registrar semana actual; intentar semana futura y pasada; solicitud de corrección (motivo corto, repetida); registrar dos veces.

**Estudiante**
- Confirmar cuando el docente ya registró; intentar sin registro del docente; sin asesor; asesor sin validar; uso táctil.

**Transversal**
- Permisos por API: estudiante y docente contra endpoints de admin; docente contra asignaciones ajenas.
- Mensajes de error en español y sin detalles técnicos; textos y ortografía.
- Consola del navegador sin errores; recursos que dependen de Internet.
- Bitácora: las acciones críticas quedan registradas.

## 5. Severidades

- **Crítica:** pérdida o corrupción de datos, acceso indebido, o un flujo principal que no funciona.
- **Alta:** una regla de negocio no se cumple o un error bloquea una tarea frecuente.
- **Media:** funciona pero confunde, falta una validación o el mensaje es incorrecto.
- **Baja:** detalle visual, de texto o de consistencia.
- **Sugerencia:** mejora que no es un defecto.

## 6. Informe

Escribe el informe en `docs/auditorias/AUDITORIA_<AAAA-MM-DD>.md` con:

1. Resumen: fecha, versión (commit), entorno y conteo de hallazgos por severidad.
2. Tabla de hallazgos: ID (QA-01…), severidad, módulo, título.
3. Detalle de cada hallazgo: pasos para reproducir, resultado esperado, resultado obtenido, evidencia y sugerencia de corrección con el archivo involucrado.
4. Lo que se probó y funcionó (para no volver a revisarlo a ciegas).
5. Lo que no se pudo probar y por qué.

## 7. Al terminar

Detén los servidores que levantaste. La base `dualcheck_qa` puede quedarse; `preparar_bd_qa.js` la recrea en la siguiente auditoría.
