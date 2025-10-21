/**
 * Configuración del bot de reservas - ARCHIVO DE EJEMPLO
 *
 * IMPORTANTE:
 * 1. Copia este archivo como config.js
 * 2. Rellena tus credenciales
 * 3. NO subas config.js a GitHub (está en .gitignore)
 *
 * Para producción (Railway/Render):
 * - Define estas variables como variables de entorno en la plataforma
 */

module.exports = {
    // ============================================
    // CREDENCIALES (¡NO SUBIR A GITHUB!)
    // ============================================
    EMAIL: process.env.EMAIL || "TU_EMAIL_AQUI",
    PASSWORD: process.env.PASSWORD || "TU_PASSWORD_AQUI",

    // ============================================
    // CRITERIOS DE BÚSQUEDA
    // ============================================

    // Actividades a buscar (se busca cualquiera de estas)
    ACTIVIDADES: process.env.ACTIVIDADES ? process.env.ACTIVIDADES.split(',') : ["YOGA"],

    // Monitores permitidos (opcional - dejar vacío para aceptar cualquier monitor)
    MONITORES_IDS: [],

    // Hora mínima para buscar clases (formato 24h)
    HORA_MINIMA: parseInt(process.env.HORA_MINIMA || "19"),

    // ============================================
    // CONFIGURACIÓN GENERAL
    // ============================================

    // URL base del sitio
    URL_BASE: "https://eduardolatorre.deporsite.net",

    // ID de usuario (se detecta automáticamente, esto es fallback)
    ID_USUARIO_FALLBACK: 13257,

    // Intervalo de comprobación en segundos
    CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL || "120"),

    // Configuración de Playwright
    HEADLESS: process.env.HEADLESS === "true" || process.env.HEADLESS === true,
    SLOW_MO: parseInt(process.env.SLOW_MO || "50"),
    TIMEOUT: parseInt(process.env.TIMEOUT || "15000"),

    // Ventana de reserva (en días desde las 22:30 de hoy)
    DIAS_VENTANA_RESERVA: parseInt(process.env.DIAS_VENTANA_RESERVA || "2")
};
