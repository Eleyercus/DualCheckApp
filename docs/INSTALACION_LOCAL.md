# Guía de instalación local — DualCheck UT

Para los integrantes del equipo que quieran correr la aplicación completa en su propia PC o laptop, con datos de prueba, ya sea para desarrollar, probar o mostrarla a un profesor.

- Tiempo estimado la primera vez: 30 a 45 minutos.
- Sistema: Windows 10/11. Todos los comandos son para **PowerShell**.
- Todo lo que se instala aquí usa datos **ficticios**. Nunca cargues datos reales de estudiantes en tu equipo.

¿Ya la tienes instalada y solo quieres ponerla al día? Ve a la sección 10.

---

## 1. Programas necesarios (una sola vez)

Abre PowerShell **como administrador** (clic derecho → "Ejecutar como administrador") y ejecuta:

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

Cierra PowerShell, ábrelo de nuevo (ya no hace falta como administrador) e instala pnpm:

```powershell
npm install -g pnpm
```

Si aparece el error `npm.ps1 cannot be loaded because running scripts is disabled`, ejecuta esto una vez y repite el comando:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### MySQL 8.0

1. Descarga **MySQL Installer for Windows** desde https://dev.mysql.com/downloads/installer/ (el instalador grande, "mysql-installer-community").
2. En el tipo de instalación elige **Server only** (o **Custom** y marca *MySQL Server 8.0*).
3. En la configuración deja el puerto **3306**, define una **contraseña para root** y anótala; la vas a necesitar.
4. Deja marcada la opción de que MySQL arranque como servicio de Windows al encender el equipo.

Para que PowerShell reconozca el comando `mysql`, agrégalo al PATH de tu usuario (una sola vez):

```powershell
[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';C:\Program Files\MySQL\MySQL Server 8.0\bin', 'User')
```

Cierra y vuelve a abrir PowerShell, y verifica que todo responde:

```powershell
git --version
node -v
pnpm -v
mysql --version
```

`node -v` debe mostrar la versión 22 o superior.

---

## 2. Descargar el proyecto

```powershell
cd C:\
git clone https://github.com/Eleyercus/DualCheckApp.git C:\DualCheckApp
cd C:\DualCheckApp
```

Para descargar no hace falta cuenta. Para **subir** cambios necesitas ser colaborador del repositorio: pídeselo a Diego.

---

## 3. Crear la base de datos

Desde `C:\DualCheckApp` (te pedirá la contraseña de root):

```powershell
mysql -u root -p --default-character-set=utf8mb4 -e "source server/schema.sql"
```

Esto crea la base `dualcheck_db` con sus 9 tablas.

> **Cuidado:** `schema.sql` **borra** las tablas si ya existían. Ejecutarlo de nuevo deja la base vacía.

---

## 4. Configurar el servidor

```powershell
cd C:\DualCheckApp\server
pnpm install
```

Crea el archivo `server\.env`. El primer comando genera una clave secreta y el segundo te pide la contraseña de root de MySQL:

```powershell
$jwt = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$dbPass = Read-Host "Contraseña de root de MySQL"
Set-Content -Path .env -Encoding ascii -Value @(
  'PORT=3001',
  "JWT_SECRET=$jwt",
  'DB_HOST=localhost',
  'DB_USER=root',
  "DB_PASSWORD=`"$dbPass`"",
  'DB_NAME=dualcheck_db',
  'IP_EQUIPO_ESTUDIANTE='
)
```

> Usa `Set-Content -Encoding ascii`, **no** `Out-File`: en PowerShell 5.1 `Out-File` agrega un carácter invisible (BOM) al inicio y el servidor deja de leer la primera variable.
>
> El archivo `.env` es personal: **nunca** lo subas a GitHub (ya está en `.gitignore`).

---

## 5. Crear el administrador y cargar los datos de prueba

Todavía en `C:\DualCheckApp\server`:

```powershell
node scripts/crear_admin.js
node scripts/seed_datos_prueba.js
```

- El primero crea el administrador de desarrollo `admin@dualcheck.edu` con contraseña `admin123`. Si ya existía, le restablece esa contraseña y lo desbloquea, así que también sirve si alguien la olvidó o bloqueó la cuenta.
- El segundo crea un periodo activo, 4 docentes, 14 estudiantes, asignaciones, semanas de asistencia y solicitudes de corrección. Las cuentas están en la sección 8.

Ambos deben mostrar primero `Conexión a MySQL exitosa`. Si muestran `Access denied for user 'root'`, la contraseña del `.env` no es la de MySQL: repite la sección 4.

---

## 6. Instalar el cliente

```powershell
cd C:\DualCheckApp\client
pnpm install
```

---

## 7. Arrancar la aplicación

Necesitas **dos ventanas de PowerShell abiertas al mismo tiempo**.

Ventana 1, el servidor (API):

```powershell
cd C:\DualCheckApp\server
pnpm dev
```

Debe decir `Servidor corriendo en http://localhost:3001` y `Conexión a MySQL exitosa`.

Ventana 2, el cliente (la página):

```powershell
cd C:\DualCheckApp\client
pnpm dev
```

Abre el navegador en **http://localhost:5173** e inicia sesión con alguna cuenta de la sección 8.

Para apagar la app, presiona `Ctrl + C` en cada ventana. La próxima vez solo repites esta sección: MySQL arranca solo con Windows.

---

## 8. Cuentas de prueba

**Administrador:** `admin@dualcheck.edu` / `admin123`

**Docentes** (contraseña = apellido paterno en minúsculas + `123`):

| Correo | Contraseña | Sus estudiantes |
|---|---|---|
| `jose.ramirez@seed.local` | `ramirez123` | Juan Perez, Andres Rojas (sin validar), Jorge Ramos |
| `maria.lopez@seed.local` | `lopez123` | Sofia Gonzalez, Camila Jimenez (corrección rechazada), Emmanuel Contreras (reincorporado) |
| `carlos.medina@seed.local` | `medina123` | Luis Castillo (corrección **pendiente**), Ricardo Vazquez, Paola Herrera |
| `ana.torres@seed.local` | `torres123` | Valeria Morales (corrección aprobada), Fernanda Aguilar (sin validar) |

**Estudiantes** (contraseña = matrícula):

| Correo | Contraseña | Escenario |
|---|---|---|
| `juan.perez@alumno.seed.local` | `SEED001` | Normal, semanas pasadas completas |
| `luis.castillo@alumno.seed.local` | `SEED003` | Tiene una solicitud de corrección pendiente |
| `ricardo.vazquez@alumno.seed.local` | `SEED007` | Su docente ya registró la semana actual: puede confirmarla |
| `andres.rojas@alumno.seed.local` | `SEED005` | Su asesor aún no valida la asignación |
| `mauricio.salazar@alumno.seed.local` | `SEED011` | Requisitos incompletos, sin asesor |
| `daniela.ibarra@alumno.seed.local` | `SEED014` | Elegible pero sin asesor asignado |
| `karla.guerrero@alumno.seed.local` | `SEED012` | Dada de baja: **no puede iniciar sesión** |

Los demás estudiantes siguen el mismo formato: primer nombre + apellido paterno en minúsculas y sin acentos `@alumno.seed.local`, con su matrícula `SEED002` a `SEED014`.

Las cuentas de estudiante cierran sesión solas a los 15 minutos; es intencional.

---

## 9. Guion sugerido para mostrarla a un profesor (10 a 15 minutos)

Antes de llegar: arranca la app (sección 7), entra una vez con el admin para confirmar que todo carga, y ten la laptop conectada a la corriente.

Sigue este orden: cada paso deja listo el siguiente.

1. **Administrador** (`admin@dualcheck.edu`)
   - *Periodos:* hay un solo periodo activo y de él se calcula la semana actual (1 a 13).
   - *Estudiantes:* búsqueda y filtros; Mauricio Salazar tiene requisitos incompletos.
   - *Asignaciones:* intenta asignar a Mauricio y el sistema lo impide por los requisitos; asigna a Daniela Ibarra a un docente.
2. **Docente** (`carlos.medina@seed.local`)
   - Abre a Paola Herrera y registra la asistencia de la semana actual.
   - Abre a Luis Castillo: la semana 2 aparece como "Pasada" porque no se registró a tiempo. Una semana pasada ya no se puede registrar directamente; se pide una corrección con motivo. Luis ya tiene una solicitud pendiente, así que no envíes otra.
3. **Estudiante** (`paola.herrera@alumno.seed.local` / `SEED010`)
   - Confirma la semana que acaba de registrar el docente: queda "Completa", con doble confirmación.
4. **Administrador** otra vez
   - *Correcciones:* aprueba la solicitud pendiente de Luis Castillo; su semana 2 queda registrada.
   - *Reportes:* descarga el PDF y el Excel del periodo.
5. **Seguridad**
   - Intenta entrar con `karla.guerrero@alumno.seed.local` / `SEED012`: está dada de baja y no puede.
   - Cinco contraseñas incorrectas seguidas bloquean la cuenta 15 minutos. Para desbloquear al admin: `node scripts/crear_admin.js`.

Si quieres repetir la demostración desde cero, renueva los datos (sección 11).

> **Sin internet:** la app funciona completa sin internet, salvo los iconos (menú, buscadores), que se descargan de internet y no aparecerán.

---

## 10. Actualizar a la versión más reciente

Con la app apagada:

```powershell
cd C:\DualCheckApp
git pull origin main
cd server ; pnpm install
cd ..\client ; pnpm install
```

Revisa la lista de archivos que muestra `git pull`:

- Si aparece `server/schema.sql`, el esquema cambió: repite las secciones 3 y 5. **Esto borra los datos que tengas**, que de todas formas son de prueba.
- Si no aparece, no hay que hacer nada más.

Si `git pull` se niega porque modificaste archivos y no necesitas esos cambios, guárdalos aparte con `git stash` y repite el `git pull`.

---

## 11. Renovar los datos de prueba

El seed crea el periodo como si hubiera empezado 4 semanas antes del día en que lo ejecutaste. Con el tiempo la "semana actual" avanza, y después de 13 semanas el periodo se ve terminado. Para dejarlo como nuevo, desde `C:\DualCheckApp\server`:

```powershell
mysql -u root -p dualcheck_db -e "source scripts/limpiar_datos_prueba.sql"
node scripts/seed_datos_prueba.js
```

`limpiar_datos_prueba.sql` borra solo lo que tenga correo `@seed.local` (y el periodo de prueba); el administrador se conserva.

Para empezar realmente de cero (base vacía): repite las secciones 3 y 5.

---

## 12. Mostrarla a otros equipos de la misma red (opcional)

Por ejemplo, para que el profesor la abra desde su computadora o su celular estando en la misma red Wi-Fi.

1. Busca la IP de tu laptop con `ipconfig`: es la "Dirección IPv4" del adaptador Wi-Fi o Ethernet, por ejemplo `192.168.1.50`.
2. Indica al cliente dónde está la API (cambia la IP por la tuya):

   ```powershell
   cd C:\DualCheckApp\client
   Set-Content -Path .env.local -Encoding ascii -Value 'VITE_API_URL=http://192.168.1.50:3001/api'
   pnpm dev --host
   ```

3. Si Windows pregunta si permites que Node.js acceda a la red, acepta para **redes privadas**.
4. Desde el otro equipo abre `http://192.168.1.50:5173`.

Cuando termines, borra `client\.env.local`: si cambias de red, tu IP cambia y la app dejaría de poder iniciar sesión.

```powershell
Remove-Item C:\DualCheckApp\client\.env.local
```

---

## 13. Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `mysql` no se reconoce | MySQL no está en el PATH | Sección 1, comando del PATH, y reabrir PowerShell |
| `npm.ps1 cannot be loaded` | Política de ejecución de PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Access denied for user 'root'@'localhost'` | La contraseña del `.env` no coincide con la de MySQL | Repite la sección 4 |
| `Error conectando a MySQL: connect ECONNREFUSED` | El servicio de MySQL está apagado | Abre "Servicios" de Windows (`services.msc`) e inicia **MySQL80** |
| `Table 'dualcheck_db.periodos' doesn't exist` | La base no se creó completa | Repite las secciones 3 y 5 |
| El login dice "Error al iniciar sesión" | El servidor (ventana 1) no está corriendo | Revisa la ventana 1 o vuelve a ejecutar `pnpm dev` en `server` |
| "Credenciales incorrectas" con el admin | Contraseña cambiada u olvidada | `node scripts/crear_admin.js` |
| "Cuenta bloqueada temporalmente" | 5 intentos fallidos | Espera 15 minutos o, si es el admin, `node scripts/crear_admin.js` |
| `No hay ninguna cuenta con perfil "administrador"` al cargar el seed | Falta el admin | Ejecuta primero `node scripts/crear_admin.js` |
| `Port 5173 is in use` o `EADDRINUSE :3001` | La app ya está abierta en otra ventana | Ciérrala con `Ctrl + C` o usa la que ya está abierta |
| Caracteres raros (Ã³) en la consola | Codificación de la consola | `chcp 65001` antes de usar `mysql` |

---

## Reglas del equipo

- No subas `.env`, `.env.local`, `.env.production`, contraseñas ni datos reales.
- `admin123` y las cuentas `@seed.local` son solo para pruebas y demostraciones.
- No trabajes directo en `main`: crea una rama (`git switch -c nombre-del-cambio`), súbela y abre un pull request.
