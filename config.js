/**
 * Configuración del bot de reservas
 * Optimizado para máxima velocidad y eficiencia
 */

module.exports = {
    // Credenciales
    EMAIL: "21658008",
    PASSWORD: "8008torre",

    // Actividades a buscar (se busca cualquiera de estas)
    ACTIVIDADES: ["YOGA"],

    // Monitores permitidos (opcional - dejar vacío para aceptar cualquier monitor)
    MONITORES_IDS: [],

    // Hora mínima para buscar clases (formato 24h)
    HORA_MINIMA: 19,  // A partir de las 19:00

    // URL base del sitio
    URL_BASE: "https://eduardolatorre.deporsite.net",

    // ID de usuario (se detecta automáticamente, esto es fallback)
    ID_USUARIO_FALLBACK: 13257,

    // Intervalo de comprobación en segundos
    CHECK_INTERVAL: 120,

    // Configuración de Playwright
    HEADLESS: false,  // true para modo invisible, false para ver el navegador
    SLOW_MO: 50,      // Ralentizar acciones en ms (0 para producción)
    TIMEOUT: 15000,   // Timeout general reducido a 15s

    // Ventana de reserva (en días desde las 22:30 de hoy)
    DIAS_VENTANA_RESERVA: 2
};