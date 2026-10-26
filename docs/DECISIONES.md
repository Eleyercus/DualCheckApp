# Decisiones de diseño — DualCheck UT

| # | Decisión | Motivo |
|---|---|---|
| 1 | **Doble confirmación** docente + estudiante por semana | Requisito central: validar asistencia real en estadías |
| 2 | **Un solo periodo activo global**; semana calculada desde `fecha_inicio` (13 semanas) | Simplicidad; 3 cuatrimestres/año |
| 3 | **Rezagados vía solicitud de corrección**, sin fechas de inicio por asignación | Evitar rediseñar el modelo; el volumen (~10) es manejable |
| 4 | Correcciones guardadas en `bitacora` como JSON | Evitar una tabla nueva; queda auditoría gratis |
| 5 | Motivo de corrección >= 10 caracteres | Evitar justificaciones vacías |
| 6 | Bloqueo de 5 intentos / 15 min | Seguridad básica sin infraestructura extra |
| 7 | Cambio de contraseña obligatorio en el primer login | Contraseñas iniciales previsibles (matrícula, apellido+123) |
| 8 | JWT de estudiante 15 min; docente/admin sin expiración | Equipo compartido de estudiantes vs. dispositivos personales |
| 9 | Restricción por IP del estudiante por variable de entorno, apagada por defecto | El equipo de estudiantes aún no está definido; se activa al conocer su IP |
| 10 | IP validada en login **antes** de revisar contraseña | No filtrar si la contraseña es correcta desde un equipo no autorizado |
| 11 | `VITE_API_URL` en tiempo de build | La URL de la API varía por despliegue; evita `localhost` hardcodeado |
| 12 | `schema.sql` como fuente de verdad (sin migraciones) | Proyecto pequeño; se verificó contra la BD real |
| 13 | pm2 + `serve` en Windows en vez de IIS/servicios | Menos fricción para un equipo junior |
| 14 | Datos de prueba solo con dominio `seed.local` | Limpieza segura y reversible |
| 15 | Reset total solo para datos ficticios; nunca en producción con datos reales | Es irreversible |
| 16 | Nombre del producto: **DualCheck UT**; metodología XP con "iteraciones" | Pedido explícito del cliente/equipo |
| 17 | Se mantiene `administradores` aunque no se use, a la espera de decidir | No tocar esquema verificado sin acuerdo |
| 18 | No se corrigen aún los errores de lint preexistentes | No afectan ejecución; prioridad baja |

## Convenciones de documentación

Formato UTCAD: Arial 12, interlineado 1.5, justificado, títulos en mayúsculas y negritas. Evitar mencionar "sprints".
