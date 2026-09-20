-- RESET TOTAL antes de producción.
-- Borra TODA la información operativa (periodos, docentes, estudiantes,
-- asignaciones, asistencia y bitácora) sin importar si viene del seed
-- (@seed.local) o de pruebas manuales — todo lo que hay hoy es ficticio.
--
-- Conserva ÚNICAMENTE las cuentas con perfil = 'administrador', y las deja
-- listas para forzar un cambio de contraseña en el próximo login (buena
-- práctica antes de exponer la app en el servidor real).
--
-- ⚠️ IRREVERSIBLE. Haz un respaldo antes por si acaso:
--   mysqldump -u root -p --default-character-set=utf8mb4 dualcheck_db > respaldo_antes_de_reset.sql
--
-- Uso:
--   mysql -u root -p dualcheck_db < scripts/reset_total_produccion.sql

DELETE FROM bitacora;
DELETE FROM asistencia;
DELETE FROM asignaciones;
DELETE FROM empresas_estadia;
DELETE FROM estudiantes;
DELETE FROM docentes;
DELETE FROM periodos;
DELETE FROM usuarios WHERE perfil <> 'administrador';

-- El/los admin que queden: sesión limpia y contraseña nueva obligatoria
UPDATE usuarios
SET intentos_fallidos = 0, bloqueado_hasta = NULL, requiere_cambio_password = 1
WHERE perfil = 'administrador';

-- Reinicia los contadores de autoincremento para que la base arranque en 1
-- (usuarios se deja al final: MySQL/MariaDB no permite bajarlo por debajo del
-- id más alto que quede, así que es seguro intentarlo aunque el admin ya
-- tenga un id distinto de 1 — simplemente no tendrá efecto en ese caso)
ALTER TABLE bitacora AUTO_INCREMENT = 1;
ALTER TABLE asistencia AUTO_INCREMENT = 1;
ALTER TABLE asignaciones AUTO_INCREMENT = 1;
ALTER TABLE empresas_estadia AUTO_INCREMENT = 1;
ALTER TABLE estudiantes AUTO_INCREMENT = 1;
ALTER TABLE docentes AUTO_INCREMENT = 1;
ALTER TABLE periodos AUTO_INCREMENT = 1;
ALTER TABLE usuarios AUTO_INCREMENT = 1;

-- Verificación rápida (debe mostrar 0 en todo salvo usuarios = número de admins)
SELECT
  (SELECT COUNT(*) FROM usuarios)      AS usuarios_restantes,
  (SELECT COUNT(*) FROM docentes)      AS docentes,
  (SELECT COUNT(*) FROM estudiantes)   AS estudiantes,
  (SELECT COUNT(*) FROM periodos)      AS periodos,
  (SELECT COUNT(*) FROM asignaciones)  AS asignaciones,
  (SELECT COUNT(*) FROM asistencia)    AS asistencia,
  (SELECT COUNT(*) FROM bitacora)      AS bitacora;
