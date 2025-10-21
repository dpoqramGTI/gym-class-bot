# Dockerfile optimizado para Playwright
# Imagen base con Node.js 18 y soporte para navegadores
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Crear directorio para screenshots
RUN mkdir -p /app/screenshots

# Variables de entorno por defecto (se sobrescriben desde Railway)
ENV HEADLESS=true
ENV TZ=Europe/Madrid

# Ejecutar el bot multi-tab
CMD ["node", "bot-multitab.js"]
