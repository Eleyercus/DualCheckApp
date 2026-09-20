-- Borra TODO lo generado por seed_datos_prueba.js (y solo eso).
-- Identifica los registros de prueba por el dominio @seed.local, así que es
-- seguro correrlo aunque ya tengas datos reales en la base: nada real se toca.
--
-- Uso:
--   mysql -u root -p dualcheck_db < scripts/limpiar_datos_prueba.sql

-- 1) Bitácora de las solicitudes de corrección y sus resoluciones sembradas
DELETE FROM bitacora
WHERE id_usuario IN (SELECT id FROM usuarios WHERE correo LIKE '%@seed.local');

-- 2) Asistencia de las asignaciones sembradas
DELETE a FROM asistencia a
JOIN asignaciones asg ON a.id_asignacion = asg.id
JOIN estudiantes e ON asg.id_estudiante = e.id
JOIN usuarios u ON e.id_usuario = u.id
WHERE u.correo LIKE '%@alumno.seed.local';

-- 3) Asignaciones sembradas
DELETE asg FROM asignaciones asg
JOIN estudiantes e ON asg.id_estudiante = e.id
JOIN usuarios u ON e.id_usuario = u.id
WHERE u.correo LIKE '%@alumno.seed.local';

-- 4) Estudiantes y docentes sembrados
DELETE e FROM estudiantes e
JOIN usuarios u ON e.id_usuario = u.id
WHERE u.correo LIKE '%@alumno.seed.local';

DELETE d FROM docentes d
JOIN usuarios u ON d.id_usuario = u.id
WHERE u.correo LIKE '%@seed.local' AND u.correo NOT LIKE '%@alumno.seed.local';

-- 5) Usuarios sembrados (estudiantes y docentes) — el dominio %seed.local
--    cubre tanto @seed.local (docentes) como @alumno.seed.local (estudiantes)
DELETE FROM usuarios WHERE correo LIKE '%seed.local';

-- 6) El periodo de prueba, SOLO si lo creó el script (por su nombre) y ya no
--    tiene asignaciones (por si acaso quedó alguna real ligada a él, no se borra)
DELETE FROM periodos
WHERE nombre LIKE 'Periodo de prueba %'
  AND id NOT IN (SELECT DISTINCT id_periodo FROM asignaciones);
