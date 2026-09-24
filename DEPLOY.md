# Manual de Despliegue — DualCheck UT (Servidor Windows — 172.16.3.212)

Versión específica para tu caso real: servidor Windows en `172.16.3.212`,
sin Node ni MySQL instalados todavía, y sin equipo fijo de estudiantes por
ahora (esa restricción se deja preparada pero apagada).

Todo se corre desde **PowerShell** en esa máquina — conéctate por Escritorio
Remoto (RDP) o directamente si tienes acceso físico, y abre PowerShell
**como Administrador** para los pasos de instalación.

---

## 0. Conéctate al servidor

Desde tu computadora:
```powershell
mstsc /v:172.16.3.212
```
(o usa el cliente de Escritorio Remoto de Windows con esa IP). Necesitas
usuario y contraseña de esa máquina — si no los tienes, es lo primero que
hay que pedirle a TI.

Una vez dentro, abre **PowerShell como Administrador** (clic derecho →
"Ejecutar como administrador") para los pasos 1 y 2.

---

## 1. Instalar Node.js, Git y MySQL

Si el servidor tiene `winget` (viene por defecto en Windows 10/11 y Server
2022 actualizado):

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Oracle.MySQL
```

Cierra y vuelve a abrir PowerShell después de instalar (para que reconozca
los comandos nuevos), y verifica:

```powershell
node -v
git --version
mysql --version
```

**Si `winget` no está disponible**, descarga e instala manualmente en el
navegador del servidor:
- Node.js LTS: https://nodejs.org (elige el instalador .msi de Windows)
- Git: https://git-scm.com/download/win
- MySQL: https://dev.mysql.com/downloads/installer/ (elige "MySQL Installer
  for Windows", instala el "Server" y deja correr el asistente — te pedirá
  definir la contraseña de `root`, anótala)

---

## 2. Instalar pnpm y pm2

```powershell
npm install -g pnpm
npm install -g pm2
npm install -g pm2-windows-startup
npm install -g serve
pm2-startup install
```

`pm2-windows-startup` es lo que hace que la app se vuelva a levantar sola
si el servidor se reinicia (en Windows, `pm2 startup` normal no funciona
igual que en Linux, por eso este paso extra).

---

## 3. Clonar el proyecto

```powershell
cd C:\
mkdir DualCheckApp
cd DualCheckApp
git clone https://github.com/Eleyercus/DualCheckApp.git .
```

---

## 4. Crear la base de datos desde cero

Abre MySQL (te pedirá la contraseña de `root` que definiste al instalar):

```powershell
mysql -u root -p
```

Dentro de MySQL:

```sql
CREATE DATABASE dualcheck_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dualcheck'@'localhost' IDENTIFIED BY 'ELIGE_UNA_CONTRASEÑA_FUERTE_AQUI';
GRANT ALL PRIVILEGES ON dualcheck_db.* TO 'dualcheck'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Crea la estructura de tablas (sin ningún dato). Recuerda: en PowerShell el
operador `<` no funciona, usa `Get-Content` con pipe:

```powershell
Get-Content server\schema.sql | mysql -u root -p dualcheck_db
```

---

## 5. Crear tu cuenta de administrador

```powershell
cd server
pnpm install
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_REAL', 10))"
```

Copia el hash que imprime (empieza con `$2a$10$...`) y úsalo aquí:

```powershell
mysql -u root -p dualcheck_db
```
```sql
INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password)
VALUES ('admin@dualcheck.edu', '<PEGA_AQUI_EL_HASH>', 'administrador', 1);
EXIT;
```

*(`requiere_cambio_password = 1` te obliga a cambiarla en tu primer login —
ponle ahí tu contraseña real y definitiva.)*

---

## 6. Configurar y levantar el backend

Dentro de `server\`, genera un `JWT_SECRET` real:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Crea el archivo `.env` (edítalo con notepad o el comando de abajo, pegando
el JWT_SECRET que acabas de generar):

```powershell
@"
DB_HOST=localhost
DB_USER=dualcheck
DB_PASSWORD=ELIGE_UNA_CONTRASEÑA_FUERTE_AQUI
DB_NAME=dualcheck_db
JWT_SECRET=PEGA_AQUI_EL_JWT_SECRET_GENERADO
PORT=3001
IP_EQUIPO_ESTUDIANTE=
"@ | Out-File -Encoding utf8 .env
```

*(`IP_EQUIPO_ESTUDIANTE` se queda vacío por ahora — todavía no tienen el
equipo/tablet de estudiantes. La restricción queda lista pero apagada, sin
afectar a nadie. Ver sección 9.)*

Levanta el backend con pm2:

```powershell
pm2 start src/index.js --name dualcheck-backend
pm2 save
```

Verifica que responde:

```powershell
curl http://localhost:3001/api/auth/login
```
*(Un error de "correo y contraseña son requeridos" es la respuesta
correcta — significa que el servidor está vivo.)*

---

## 7. Compilar y servir el cliente (frontend)

```powershell
cd ..\client
"VITE_API_URL=http://172.16.3.212:3001/api" | Out-File -Encoding utf8 .env.production
pnpm install
pnpm build
pm2 start "serve -s dist -l 5173" --name dualcheck-frontend
pm2 save
```

La app queda disponible en `http://172.16.3.212:5173` para cualquiera en
la misma red.

---

## 8. Abrir los puertos en el Firewall de Windows

En PowerShell como Administrador:

```powershell
New-NetFirewallRule -DisplayName "DualCheck Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "DualCheck Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

Si hay un firewall adicional de red (no solo el de Windows), confirma con
TI que estos dos puertos estén permitidos también ahí.

---

## 9. Probar desde las computadoras reales

Desde **cualquier computadora de administrador o docente conectada a la
misma red**, abre el navegador en:

```
http://172.16.3.212:5173
```

Inicia sesión con el admin que creaste en el paso 5.

**Sobre el equipo de estudiantes**: como todavía no tienen ni tablet ni
computadora fija asignada, la aplicación queda utilizable igual — cualquier
equipo en la red puede entrar como estudiante por ahora. En cuanto
consigan el dispositivo (tablet u otra PC), solo hace falta:

1. Conectar ese equipo a la red y ver qué IP le toca (`ipconfig` en esa
   máquina).
2. En el servidor, editar `C:\DualCheckApp\server\.env` y poner esa IP en
   `IP_EQUIPO_ESTUDIANTE`.
3. Reiniciar el backend:
   ```powershell
   pm2 restart dualcheck-backend
   ```

Desde ese momento, solo ese equipo podrá iniciar sesión como Estudiante —
avísame cuando lo tengan y lo probamos juntos.

---

## 10. Después de que todo funcione

- [ ] Crea el periodo real desde el panel de administrador, con la fecha
      que confirme coordinación de estadías (siguen sin responder —
      mientras tanto, no des de alta estudiantes ni actives asignaciones
      reales)
- [ ] Respaldo automático diario — en Windows, usa el Programador de
      tareas (`taskschd.msc`) para correr diario:
      ```powershell
      mysqldump -u dualcheck -p"TU_PASSWORD" dualcheck_db > C:\Respaldos\dualcheck_$(Get-Date -Format yyyy-MM-dd).sql
      ```
- [ ] Pendiente a futuro: HTTPS con certificado, y el equipo fijo de
      estudiantes con su IP.

---

## Comandos útiles si algo falla

```powershell
pm2 list                        # ver si backend/frontend siguen corriendo
pm2 logs dualcheck-backend      # ver errores del backend en vivo
pm2 restart dualcheck-backend   # reiniciar tras cambiar el .env
pm2 restart dualcheck-frontend  # reiniciar el frontend
```