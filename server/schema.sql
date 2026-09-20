-- ============================================================================
-- DualCheck UT — Esquema de base de datos (solo estructura, sin datos)
-- ============================================================================
-- Crea todas las tablas necesarias para correr la aplicación desde cero.
-- No contiene ningún dato de alumnos, docentes ni información institucional.
--
-- Uso:
--   mysql -u root -p < schema.sql
--
-- Después de correrlo, crea tu primera cuenta de administrador (ver nota al
-- final de este archivo) y, si quieres datos de prueba para desarrollo,
-- corre server/scripts/seed_datos_prueba.js.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS dualcheck_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dualcheck_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ── usuarios ─────────────────────────────────────────────────────────────
-- Base de autenticación común a los tres perfiles.
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfil` enum('administrador','docente','estudiante') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estatus` tinyint(1) DEFAULT '1',
  `intentos_fallidos` int DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `requiere_cambio_password` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── administradores ──────────────────────────────────────────────────────
-- Perfil extendido del administrador (nombre, área). No usado todavía por
-- ningún controller actual, pero forma parte del esquema real.
DROP TABLE IF EXISTS `administradores`;
CREATE TABLE `administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `administradores_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── docentes ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `docentes`;
CREATE TABLE `docentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_p` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_m` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `programa_educativo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `docentes_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── estudiantes ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `estudiantes`;
CREATE TABLE `estudiantes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `matricula` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_p` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido_m` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo_personal` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grupo` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generacion` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `abrev_carrera` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carrera` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `programa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_celular` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono_casa` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `colonia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sexo` enum('M','F') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `req_datos_estadia` tinyint(1) DEFAULT '0',
  `req_carta_no_adeudo` tinyint(1) DEFAULT '0',
  `req_carta_servicios` tinyint(1) DEFAULT '0',
  `estatus_especial` enum('activo','baja','baja_reprobacion','reincorporado') COLLATE utf8mb4_unicode_ci DEFAULT 'activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `matricula` (`matricula`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `estudiantes_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── empresas_estadia ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `empresas_estadia`;
CREATE TABLE `empresas_estadia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `nombre_estadia` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_empresa` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rfc` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_responsable` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `puesto_responsable` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `colonia` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cp` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `giro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tamano` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `regimen_juridico` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id_estudiante` (`id_estudiante`),
  CONSTRAINT `empresas_estadia_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── periodos ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `periodos`;
CREATE TABLE `periodos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_por` int NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `creado_por` (`creado_por`),
  CONSTRAINT `periodos_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── asignaciones ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `asignaciones`;
CREATE TABLE `asignaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_estudiante` int NOT NULL,
  `id_docente` int NOT NULL,
  `id_periodo` int NOT NULL,
  `fecha_asignacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `validada_por_docente` tinyint(1) DEFAULT '0',
  `estatus` enum('activa','concluida','cancelada') COLLATE utf8mb4_unicode_ci DEFAULT 'activa',
  PRIMARY KEY (`id`),
  KEY `id_estudiante` (`id_estudiante`),
  KEY `id_docente` (`id_docente`),
  KEY `fk_asignacion_periodo` (`id_periodo`),
  CONSTRAINT `asignaciones_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiantes` (`id`),
  CONSTRAINT `asignaciones_ibfk_2` FOREIGN KEY (`id_docente`) REFERENCES `docentes` (`id`),
  CONSTRAINT `fk_asignacion_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `periodos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── asistencia ───────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `asistencia`;
CREATE TABLE `asistencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_asignacion` int NOT NULL,
  `semana` tinyint NOT NULL,
  `confirmacion_docente` tinyint(1) DEFAULT '0',
  `fecha_docente` datetime DEFAULT NULL,
  `confirmacion_estudiante` tinyint(1) DEFAULT '0',
  `fecha_estudiante` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_asignacion` (`id_asignacion`),
  CONSTRAINT `asistencia_ibfk_1` FOREIGN KEY (`id_asignacion`) REFERENCES `asignaciones` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── bitacora ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `bitacora`;
CREATE TABLE `bitacora` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_afectada` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `fecha_hora` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `bitacora_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Primer administrador
-- ============================================================================
-- Este esquema no incluye ninguna cuenta. Crea la tuya generando un hash de
-- bcrypt y luego insertándolo:
--
--   node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_AQUI', 10))"
--
--   INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password)
--   VALUES ('admin@dualcheck.edu', '<pega_aqui_el_hash>', 'administrador', 1);
-- ============================================================================
