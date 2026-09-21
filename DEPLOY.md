# Manual de Despliegue — DualCheck UT

Guía completa para poner la aplicación a correr en el servidor de la
Universidad Tecnológica de Cadereyta, desde el repositorio de GitHub hasta
que quede accesible por red local para administradores, docentes y el
equipo fijo de estudiantes.

Escrito asumiendo un servidor **Linux (Ubuntu/Debian)**, que es lo más común
en este tipo de despliegues institucionales. Si el servidor real resulta ser
Windows Server, los pasos de instalación de paquetes cambian — hay una nota
al final señalando qué reemplazar.

---

## 0. Antes de empezar — información que necesitas de TI

No avances sin confirmar esto con el área de TI:

- [ ] Dirección IP del servidor dentro de la red LAN
- [ ] Sistema operativo del servidor
- [ ] Forma de acceso remoto (SSH, usuario, contraseña o llave)
- [ ] ¿Node.js y MySQL/MariaDB ya están instalados, o hay que instalarlos?
- [ ] ¿Qué puertos están libres/permitidos? (se necesitan al menos 2, ver
      sección 6)
- [ ] Dirección IP en la LAN de la computadora fija que usarán los
      estudiantes (si aún no la tienen, se puede desplegar igual y activar
      esa restricción después — ver sección 8)

---

## 1. Conectarte al servidor

```bash
ssh usuario@IP_DEL_SERVIDOR
```

---

## 2. Instalar lo necesario en el servidor (una sola vez)

Verifica primero qué ya está instalado:

```bash
node -v      # necesitas v18 o superior
mysql --version   # o: mariadb --version
git --version
```

Si falta algo:

```bash
# Actualizar paquetes
sudo apt update

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL (si no hay ya un motor de base de datos)
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Git
sudo apt install -y git

# pnpm (el gestor de paquetes que usa el proyecto)
sudo npm install -g pnpm

# pm2 (para que el backend siga corriendo aunque cierres la sesión SSH)
sudo npm install -g pm2
```

---

## 3. Clonar el proyecto

```bash
cd /opt
sudo git clone https://github.com/Eleyercus/DualCheckApp.git
sudo chown -R $USER:$USER DualCheckApp
cd DualCheckApp
```

*(Si `/opt` no es una carpeta a la que tengas permiso, usa tu carpeta de
usuario, por ejemplo `/home/tu_usuario/DualCheckApp`.)*

---

## 4. Crear la base de datos desde cero

```bash
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

Ahora crea la estructura de tablas (sin ningún dato):

```bash
mysql -u root -p dualcheck_db < server/schema.sql
```

Crea tu primera cuenta de administrador. Primero genera el hash de tu
contraseña:

```bash
cd server
pnpm install     # necesario antes para que exista bcryptjs
node -e "console.log(require('bcryptjs').hashSync('TU_PASSWORD_REAL', 10))"
```

Copia el resultado (empieza con `$2a$10$...`) y úsalo aquí:

```bash
mysql -u root -p dualcheck_db
```
```sql
INSERT INTO usuarios (correo, password_hash, perfil, requiere_cambio_password)
VALUES ('admin@dualcheck.edu', '<PEGA_AQUI_EL_HASH>', 'administrador', 1);
EXIT;
```

*(`requiere_cambio_password = 1` te obliga a cambiarla en tu primer login —
usa ese primer login para poner tu contraseña real y definitiva.)*

---

## 5. Configurar y levantar el backend

Dentro de `server/`, crea el archivo `.env`:

```bash
cat > .env << 'EOF'
DB_HOST=localhost
DB_USER=dualcheck
DB_PASSWORD=ELIGE_UNA_CONTRASEÑA_FUERTE_AQUI
DB_NAME=dualcheck_db
JWT_SECRET=
PORT=3001
IP_EQUIPO_ESTUDIANTE=
EOF
```

Genera un `JWT_SECRET` real (nunca dejes el de desarrollo) y pégalo en el
archivo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dependencias ya instaladas del paso 4. Arranca el backend con pm2 (así
sigue vivo aunque cierres la terminal):

```bash
pm2 start src/index.js --name dualcheck-backend
pm2 save
pm2 startup    # sigue las instrucciones que imprime, para que arranque solo si el servidor se reinicia
```

Verifica que responde:

```bash
curl http://localhost:3001/api/auth/login
```
*(Un error de "correo y contraseña son requeridos" es la respuesta correcta
— significa que el servidor está vivo.)*

---

## 6. Compilar y servir el cliente (frontend)

Desde la carpeta `client/`:

```bash
cd ../client
echo "VITE_API_URL=http://IP_DEL_SERVIDOR:3001/api" > .env.production
pnpm install
pnpm build
```

Esto genera la carpeta `dist/` con la aplicación ya compilada. Dos formas
de servirla, elige una:

### Opción A — con `serve` + pm2 (más simple, no requiere nada más)

```bash
sudo npm install -g serve
pm2 start "serve -s dist -l 5173" --name dualcheck-frontend
pm2 save
```

La app queda disponible en `http://IP_DEL_SERVIDOR:5173`.

### Opción B — con nginx (más robusto, mejor si TI ya lo tiene disponible)

```bash
sudo apt install -y nginx
sudo cp -r dist/* /var/www/html/
```

Edita `/etc/nginx/sites-available/default` para que las rutas de React
funcionen correctamente (evita error 404 al recargar una página interna):

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```bash
sudo systemctl restart nginx
```

La app queda disponible en `http://IP_DEL_SERVIDOR` (puerto 80, sin
necesidad de escribir puerto en el navegador).

---

## 7. Abrir los puertos necesarios

Si el servidor tiene firewall activo (`ufw` es lo más común en Ubuntu):

```bash
sudo ufw allow 3001/tcp        # backend
sudo ufw allow 5173/tcp        # frontend, solo si usaste la Opción A
sudo ufw allow 80/tcp          # frontend, solo si usaste la Opción B (nginx)
```

Confirma con TI si hay un firewall adicional a nivel de red que también
necesite estas reglas.

---

## 8. Probar desde las computadoras reales

Desde **cualquier computadora de administrador o docente conectada a la
misma red**, abre el navegador en:

```
http://IP_DEL_SERVIDOR:5173      (Opción A)
http://IP_DEL_SERVIDOR           (Opción B con nginx)
```

Inicia sesión con el admin que creaste en el paso 4. Deberías poder
navegar todos los paneles.

**Restricción por IP para estudiantes** (cuando tengas la IP de su equipo
fijo):

```bash
cd /opt/DualCheckApp/server
nano .env        # o vim, o el editor que prefieras
```

Cambia la línea:
```
IP_EQUIPO_ESTUDIANTE=IP_REAL_DE_LA_COMPUTADORA_DE_ESTUDIANTES
```

Guarda y reinicia el backend para que tome el cambio:

```bash
pm2 restart dualcheck-backend
```

Desde ese momento, solo esa IP podrá iniciar sesión con el perfil
Estudiante — pruébalo desde esa computadora y confirma que desde cualquier
otra se rechaza.

---

## 9. Después de que todo funcione

- [ ] Da de alta a los docentes y estudiantes reales (no antes de tener la
      fecha real del periodo — sección 4 de tu Especificación de
      Requerimientos)
- [ ] Crea el periodo real desde el panel de administrador, con la fecha de
      inicio que confirme coordinación de estadías
- [ ] Configura un respaldo automático diario de la base de datos, por
      ejemplo con una tarea programada (`crontab -e`):
      ```
      0 2 * * * mysqldump -u dualcheck -p'TU_PASSWORD' dualcheck_db > /respaldos/dualcheck_$(date +\%F).sql
      ```
- [ ] Pendiente a futuro: HTTPS con certificado (requiere que TI lo
      gestione) — mientras tanto, la app queda accesible solo dentro de la
      red local, lo cual reduce el riesgo.

---

## Si el servidor resulta ser Windows en vez de Linux

Los pasos de base de datos, `.env`, `schema.sql`, `pnpm build` y `pm2` son
**idénticos** (pm2 también corre en Windows). Lo que cambia:

- Instalación de Node.js y MySQL: descarga los instaladores oficiales
  (`nodejs.org`, `dev.mysql.com`) en vez de `apt install`.
- No hay `ufw`; los puertos se abren desde **Firewall de Windows Defender**
  o con `netsh advfirewall firewall add rule name="DualCheck" dir=in
  action=allow protocol=TCP localport=3001`.
- En vez de nginx, usar IIS o quedarte con la Opción A (`serve` + pm2), que
  funciona igual en Windows.

Avísame en cuanto sepas el sistema operativo real y ajusto esta sección con
los comandos exactos.
