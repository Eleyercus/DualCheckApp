# Despliegue en Windows y trampas de PowerShell

Manual completo: `DEPLOY.md`. Aquí van el resumen y los errores que ya ocurrieron.

## Objetivo

Servidor Windows 172.16.3.212 (sin Node ni MySQL al inicio), o una PC del equipo en la LAN de UTCAD como plan B.

## Secuencia resumida (PowerShell como Administrador)

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Oracle.MySQL
npm install -g pnpm pm2 serve pm2-windows-startup
git clone https://github.com/Eleyercus/DualCheckApp.git C:\DualCheckApp

# BD
Get-Content C:\DualCheckApp\server\schema.sql | mysql -u root -p

# Backend
cd C:\DualCheckApp\server ; pnpm install
# crear .env (ver abajo), luego:
pm2 start src/index.js --name dualcheck-api

# Frontend
cd C:\DualCheckApp\client ; pnpm install
# crear .env.production, luego:
pnpm build
pm2 start "serve -s dist -l 5173" --name dualcheck-web
pm2 save
pm2-startup install
```

Puertos a abrir en el firewall: 3001 (API) y 5173 (web).

Crear los `.env` sin BOM:

```powershell
Set-Content -Path C:\DualCheckApp\server\.env -Encoding ascii -Value @(
  'PORT=3001',
  'JWT_SECRET=<clave larga y aleatoria>',
  'DB_HOST=localhost',
  'DB_USER=dualcheck',
  'DB_PASSWORD=<password>',
  'DB_NAME=dualcheck_db',
  'IP_EQUIPO_ESTUDIANTE='
)
Set-Content -Path C:\DualCheckApp\client\.env.production -Encoding ascii -Value 'VITE_API_URL=http://<IP>:3001/api'
```

Verificación del backend (es POST, no GET):

```powershell
Invoke-RestMethod -Uri http://localhost:3001/api/auth/login -Method Post -ContentType 'application/json' -Body '{"correo":"x","password":"y"}'
```

Un 401 "Credenciales incorrectas" significa que la API y la BD responden. `GET /` devuelve el mensaje de health.

## Errores ya vistos y su solución

| Síntoma | Causa | Solución |
|---|---|---|
| `npm.ps1 cannot be loaded` | Execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` o usar `cmd` |
| `mysql` no se reconoce | MySQL no está en PATH | Agregar `C:\Program Files\MySQL\MySQL Server 8.0\bin` al PATH y reabrir PowerShell |
| `<` no soportado | PowerShell no redirige entrada | `Get-Content archivo.sql \| mysql -u root -p` o `source` dentro de mysql |
| Dump con caracteres rotos / UTF-16 | `>` escribe UTF-16 | `mysqldump --result-file=... --default-character-set=utf8mb4` |
| `.env` con primera variable ignorada | BOM de `Out-File -Encoding utf8` en PS 5.1 | `Set-Content -Encoding ascii` |
| Líneas del `.env` ejecutadas como comandos | Se pegaron en la consola en vez de a un archivo | Escribirlas con `Set-Content` |
| `curl` hace GET y falla con login | `curl` es alias de `Invoke-WebRequest` | `Invoke-RestMethod -Method Post` |
| `Access denied for user 'dualcheck'@'localhost'` | Usuario no existe o contraseña distinta a `.env` | `CREATE USER`/`ALTER USER ... IDENTIFIED BY`, `GRANT ALL ON dualcheck_db.*`, `FLUSH PRIVILEGES`, luego `pm2 flush` y `pm2 restart all --update-env` |
| `Table 'dualcheck_db.periodos' doesn't exist` | BD creada con esquema incompleto | Reimportar `schema.sql` |
| Login falla con `ERR_CONNECTION_REFUSED` | Backend no corriendo | Revisar `pm2 status` / `pnpm dev` |
| `git commit ... git push` en una línea | Se interpreta como argumentos | Separar con salto de línea o `;` |
| `git apply` falla | CRLF / archivos divergidos | Reemplazar archivos completos |
| mojibake en consola | Codificación cp850 | `chcp 65001` y `--default-character-set=utf8mb4` |

## Antes de abrir a usuarios reales

1. Rotar secretos y cambiar contraseña del admin.
2. Reset total solo si la BD tiene datos ficticios.
3. Crear el periodo real con fechas confirmadas por Coordinación.
4. Definir la IP del equipo de estudiantes y poner `IP_EQUIPO_ESTUDIANTE`.
5. Programar respaldo diario con `mysqldump` y Task Scheduler.
