# DualCheck App

Sistema web para gestionar el seguimiento de estudiantes en estadia, sus asignaciones docentes y el registro de asistencia. La aplicación separa el acceso por perfiles de administrador, docente y estudiante, y permite generar reportes en PDF y Excel.

## Caracteristicas principales

- Autenticacion con JWT y control de acceso por perfil.
- Gestion de estudiantes, docentes, periodos y asignaciones.
- Registro y confirmacion de asistencia por semana.
- Solicitudes de correccion de asistencia con aprobacion administrativa.
- Exportacion de reportes en PDF y Excel.
- Persistencia en MySQL.
- Interfaz web desarrollada con React y Vite.

## Tecnologias

- **Cliente:** React, React Router, Axios y Vite.
- **Servidor:** Node.js, Express, JWT, bcryptjs y Multer.
- **Base de datos:** MySQL mediante `mysql2`.
- **Paquetes:** pnpm.

## Requisitos

- Node.js y pnpm instalados.
- MySQL Server en ejecucion.
- Acceso a una base de datos local llamada `dualcheck_db`.

## Instalacion

1. Clona el repositorio y entra en el proyecto:

   ```bash
   git clone https://github.com/Eleyercus/DualCheckApp.git
   cd DualCheckApp
   ```

2. Instala las dependencias del servidor y del cliente:

   ```bash
   cd server
   pnpm install

   cd ../client
   pnpm install
   ```

3. Crea la base de datos usando el esquema incluido:

   ```bash
   cd ..
   mysql -u root -p < server/schema.sql
   ```

4. Crea `server/.env` con tus valores locales. No subas este archivo a GitHub:

   ```env
   PORT=3001
   JWT_SECRET=una_clave_secreta_larga_y_local
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=tu_password_de_mysql
   DB_NAME=dualcheck_db
   ```

   5. Genera un hash para la contraseña inicial y crea la primera cuenta de administrador:

      ```bash
      node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_AQUI', 10))"
      ```

      Copia el hash resultante en esta sentencia y ejecútala desde MySQL:

      ```sql
      INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password)
      VALUES ('admin@dualcheck.edu', '<PEGA_AQUI_EL_HASH>', 'administrador', 1);
      ```

   6. Para configurar el cliente en un despliegue donde la API no este en `localhost`, copia `client/.env.example` como `client/.env.production` y cambia la URL:

   ```env
   VITE_API_URL=http://IP_DEL_SERVIDOR:3001/api
   ```

## Ejecucion local

Abre dos terminales desde la raiz del proyecto.

Terminal del servidor:

```bash
cd server
pnpm dev
```

Terminal del cliente:

```bash
cd client
pnpm dev
```

Luego abre la URL que muestre Vite, normalmente `http://localhost:5173`. La API queda disponible en `http://localhost:3001`.

Para ejecutar el servidor sin Nodemon:

```bash
cd server
pnpm start
```

## Datos de prueba

Despues de crear un usuario administrador, puedes cargar datos de prueba para revisar los flujos principales:

```bash
cd server
node scripts/seed_datos_prueba.js
```

El script es reutilizable y documenta en su propio archivo los correos de prueba que genera. Para limpiar esos datos, revisa `server/scripts/limpiar_datos_prueba.sql` antes de ejecutarlo.

## Verificacion y compilacion

Desde `client/`:

```bash
pnpm lint
pnpm build
pnpm preview
```

Desde `server/` puedes comprobar que la API esta activa visitando `http://localhost:3001`; debe responder con un mensaje de funcionamiento.

## Estructura del proyecto

```text
client/    Aplicacion React/Vite y vistas por perfil
server/    API Express, autenticacion, controladores y rutas
server/schema.sql
           Esquema inicial de MySQL
comandos.txt
           Referencia de comandos frecuentes del proyecto
```

## Ayuda

- Consulta primero [`comandos.txt`](comandos.txt) para las tareas habituales de desarrollo y Git.
- Revisa [`server/schema.sql`](server/schema.sql) para conocer la estructura de la base de datos.
- Revisa [`client/.env.example`](client/.env.example) para configurar la URL de la API en produccion.
- Para reportar un problema o solicitar una mejora, utiliza los [Issues del repositorio](https://github.com/Eleyercus/DualCheckApp/issues).

## Contribuir

1. Crea una rama para tu cambio:

   ```bash
   git switch -c nombre-del-cambio
   ```

2. Instala las dependencias y ejecuta `pnpm lint` y `pnpm build` antes de abrir un pull request.
3. Describe en el pull request que cambiaste y como verificaste el resultado.
4. No incluyas archivos `.env`, contrasenas, tokens ni datos reales de estudiantes.

Las contribuciones y el mantenimiento del proyecto se gestionan en el [repositorio de GitHub](https://github.com/Eleyercus/DualCheckApp). Actualmente no hay un archivo `LICENSE` ni `CONTRIBUTING.md` en la raiz; deben agregarse cuando el proyecto defina formalmente esos terminos.

## Mantenimiento

Proyecto mantenido por [Eleyercus](https://github.com/Eleyercus). Para soporte, abre un Issue con los pasos para reproducir el problema, el resultado esperado y cualquier mensaje de error relevante sin incluir secretos.
