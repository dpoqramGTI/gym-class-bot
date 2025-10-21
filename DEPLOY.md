# 🚀 Guía de Despliegue - Bot de Reservas Automático

Esta guía te muestra cómo desplegar el bot en la nube para que se ejecute automáticamente todos los días a las 22:25.

---

## 📋 Índice

1. [Opción 1: Railway.app (Recomendada - GRATIS)](#opción-1-railwayapp-recomendada)
2. [Opción 2: Render.com (Alternativa gratuita)](#opción-2-rendercom-alternativa)
3. [Opción 3: VPS propio (Control total)](#opción-3-vps-propio)

---

## 🏆 OPCIÓN 1: Railway.app (Recomendada)

### ✅ Ventajas
- **100% GRATIS** para este proyecto ($5/mes de crédito, el bot usa ~$0.50/mes)
- Despliegue en 5 minutos
- Soporta Playwright nativamente
- Logs en tiempo real
- No requiere tarjeta de crédito

### 📦 Paso 1: Preparar el código

1. **Crear repositorio en GitHub:**

```bash
cd "C:\Users\BATCH-PC\Desktop\job reserva clases mami\playwright-auto-reserva"

# Inicializar Git (si no lo has hecho)
git init

# Añadir archivos
git add .

# Commit
git commit -m "Bot de reservas multi-tab listo para deploy"

# Crear repo en GitHub y vincular
git remote add origin https://github.com/TU_USUARIO/bot-reservas.git
git branch -M main
git push -u origin main
```

⚠️ **IMPORTANTE:** Asegúrate de que `config.js` y `config-multitab.js` **NO** se suban (están en `.gitignore`)

---

### 🚂 Paso 2: Desplegar en Railway

1. **Ve a [Railway.app](https://railway.app)** y haz login con GitHub

2. **Click en "New Project"** → **"Deploy from GitHub repo"**

3. **Selecciona tu repositorio** `bot-reservas`

4. **Railway detectará automáticamente el Dockerfile** y comenzará a construir

5. **Configurar Variables de Entorno:**
   - Click en tu proyecto
   - Ve a "Variables"
   - Añade las siguientes:

```
EMAIL=21658008
PASSWORD=8008torre
ACTIVIDADES=YOGA
HORA_MINIMA=19
HEADLESS=true
TZ=Europe/Madrid
```

6. **Cambiar el comando de inicio:**
   - Ve a "Settings" → "Deploy"
   - En "Start Command" pon:

```bash
node cron-wrapper.js
```

7. **Click en "Deploy"**

---

### 🎯 Paso 3: Verificar que funciona

1. **Ver logs en tiempo real:**
   - Ve a tu proyecto en Railway
   - Click en "Deployments" → Tu último deploy
   - Click en "View Logs"

Deberías ver algo como:

```
====================================
🤖 BOT DE RESERVAS - MODO CRON
====================================
[*] Programado para ejecutar a las 22:25 (hora de Madrid)
[*] Zona horaria: Europe/Madrid
[*] El contenedor permanecerá activo esperando...

[✅] Tarea cron programada correctamente
[*] Próximas ejecuciones:
   1. lunes, 21 de octubre de 2025, 22:25
   2. martes, 22 de octubre de 2025, 22:25
   3. miércoles, 23 de octubre de 2025, 22:25

[*] El bot está activo y esperando...
```

2. **Verificar ejecución:**
   - El bot se ejecutará automáticamente a las 22:25
   - Revisa los logs después de esa hora para ver el resultado

---

### 💰 Costo Estimado

| Concepto | Costo |
|----------|-------|
| Railway plan Hobby | **$0/mes** (incluye $5 de crédito) |
| Uso del bot (~10 min/día) | **~$0.50/mes** |
| **TOTAL** | **GRATIS** ✅ |

---

## 🎨 OPCIÓN 2: Render.com (Alternativa)

### 📦 Paso 1: Preparar el código

Mismo proceso que Railway (crear repo en GitHub)

### 🌐 Paso 2: Desplegar en Render

1. **Ve a [Render.com](https://render.com)** y haz login con GitHub

2. **Click en "New +"** → **"Cron Job"**

3. **Conecta tu repositorio** `bot-reservas`

4. **Configuración:**
   - **Name:** `bot-reservas-yoga`
   - **Environment:** `Docker`
   - **Schedule:** `25 22 * * *` (Cron expression para 22:25 diario)
   - **Command:** `node bot-multitab.js`

5. **Variables de Entorno:**
   Añade las mismas que en Railway:

```
EMAIL=21658008
PASSWORD=8008torre
ACTIVIDADES=YOGA
HORA_MINIMA=19
HEADLESS=true
TZ=Europe/Madrid
```

6. **Click en "Create Cron Job"**

---

### ⚠️ Diferencia con Railway

En Render, el cron job se ejecuta **por la plataforma** a las 22:25, no necesitas `cron-wrapper.js`.

**Cambiar el Dockerfile:**

```dockerfile
# Última línea del Dockerfile
CMD ["node", "bot-multitab.js"]
```

(Ya está así por defecto)

---

## 🖥️ OPCIÓN 3: VPS Propio (Contabo/Hetzner)

### 💰 Costo: €4-5/mes

Si prefieres control total y no depender de servicios gratuitos.

### 📦 Paso 1: Contratar VPS

Recomendaciones:
- **Contabo:** €4.99/mes (4GB RAM)
- **Hetzner:** €4.51/mes (4GB RAM)
- **DigitalOcean:** $6/mes (1GB RAM suficiente)

### 🔧 Paso 2: Configurar el servidor

1. **Conectar por SSH:**

```bash
ssh root@TU_IP_DEL_VPS
```

2. **Instalar dependencias:**

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar Git
apt install -y git

# Instalar dependencias de Playwright
npx playwright install-deps chromium
```

3. **Clonar el repositorio:**

```bash
cd /opt
git clone https://github.com/TU_USUARIO/bot-reservas.git
cd bot-reservas

# Instalar dependencias de Node
npm install

# Instalar Playwright
npx playwright install chromium
```

4. **Configurar credenciales:**

```bash
# Copiar archivo de configuración
cp config.example.js config.js

# Editar con tus credenciales
nano config.js
```

Edita el archivo y guarda (Ctrl+O, Enter, Ctrl+X)

5. **Configurar cron job:**

```bash
crontab -e
```

Añade al final:

```bash
# Ejecutar bot todos los días a las 22:25 (hora de Madrid)
25 22 * * * cd /opt/bot-reservas && node bot-multitab.js >> /var/log/bot-reservas.log 2>&1
```

Guarda y cierra.

---

### ✅ Paso 3: Verificar

```bash
# Ver logs
tail -f /var/log/bot-reservas.log

# Listar cron jobs
crontab -l
```

---

## 🔐 Seguridad - Variables de Entorno

### ❌ NUNCA hagas esto:

```javascript
// config.js (en GitHub)
EMAIL: "21658008",  // ❌ Contraseñas visibles
PASSWORD: "8008torre", // ❌ Cualquiera puede verlas
```

### ✅ Haz esto en su lugar:

**Para Railway/Render:**
- Define `EMAIL` y `PASSWORD` como **variables de entorno** en la plataforma
- El código las lee con `process.env.EMAIL`

**Para VPS:**
- Crea un archivo `config.js` que **NO** suba a GitHub (está en `.gitignore`)
- O usa variables de entorno:

```bash
# Añadir al archivo ~/.bashrc
export EMAIL="21658008"
export PASSWORD="8008torre"
```

---

## 🧪 Probar Localmente Antes de Desplegar

Antes de desplegar, prueba el cron wrapper localmente:

```bash
# Instalar dependencias
npm install

# Ejecutar el cron wrapper
node cron-wrapper.js
```

Deberías ver:

```
====================================
🤖 BOT DE RESERVAS - MODO CRON
====================================
[*] Programado para ejecutar a las 22:25 (hora de Madrid)
...
```

Para probar inmediatamente (sin esperar a las 22:25), edita temporalmente `cron-wrapper.js`:

```javascript
// Cambiar esta línea:
const task = cron.schedule('25 22 * * *', () => {

// Por (se ejecuta cada minuto):
const task = cron.schedule('* * * * *', () => {
```

---

## 🐛 Troubleshooting

### Problema: "El bot no se ejecuta a las 22:25"

**Solución:**
- Verifica la zona horaria: `echo $TZ` debe ser `Europe/Madrid`
- En Railway/Render, asegúrate de que `TZ=Europe/Madrid` está en las variables de entorno
- Revisa los logs para ver si hay errores

### Problema: "Error: Playwright chromium no encontrado"

**Solución:**
- En VPS: `npx playwright install chromium`
- En Railway/Render: Asegúrate de usar el Dockerfile que incluye la imagen de Playwright

### Problema: "Cannot find module 'node-cron'"

**Solución:**
```bash
npm install node-cron
```

### Problema: "El bot se ejecuta pero no reserva"

**Solución:**
- El bot espera hasta las 22:30 para disparar (5 minutos después de iniciarse)
- Si quieres que se ejecute inmediatamente, cambia en `bot-multitab.js`:

```javascript
// Línea ~565
if (minutosHastaApertura <= 30) {
    // Cambiar a:
if (minutosHastaApertura <= 60) {  // Activar 1 hora antes
```

---

## 📊 Comparación de Opciones

| Característica | Railway | Render | VPS |
|----------------|---------|--------|-----|
| **Costo** | Gratis | Gratis | €4-5/mes |
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Control** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Logs** | ✅ Tiempo real | ✅ Tiempo real | ⚠️ Manual |
| **Escalabilidad** | ✅ | ✅ | ⚠️ Manual |
| **Requiere tarjeta** | ❌ | ✅ | ✅ |

---

## 🎓 Próximos Pasos

Una vez desplegado:

1. **Monitorear la primera ejecución** (hoy a las 22:25)
2. **Revisar los logs** para verificar que la reserva fue exitosa
3. **Configurar notificaciones** (opcional):
   - Telegram bot para recibir confirmación
   - Email cuando la reserva se complete

---

## 📞 Soporte

Si tienes problemas con el despliegue:

1. Revisa los logs de la plataforma
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el Dockerfile se construya correctamente

---

**¡Buena suerte con tu despliegue! 🚀**
