/**
 * Configuración del bot MULTI-TAB de reservas
 * Optimizado para alta concurrencia en momento de apertura
 */

module.exports = {
    // ============================================
    // CREDENCIALES
    // ============================================
    EMAIL: "21658008",
    PASSWORD: "8008torre",

    // ============================================
    // CRITERIOS DE BÚSQUEDA
    // ============================================

    // Actividades a buscar (se busca cualquiera de estas)
    ACTIVIDADES: ["YOGA"],

    // Monitores permitidos (opcional - dejar vacío para aceptar cualquier monitor)
    MONITORES_IDS: [],

    // Hora mínima para buscar clases (formato 24h)
    HORA_MINIMA: 19,  // A partir de las 19:00

    // ============================================
    // CONFIGURACIÓN MULTI-TAB
    // ============================================

    // Número de pestañas a abrir en paralelo (recomendado: 3-7)
    // Más pestañas = mayor probabilidad, pero más uso de recursos
    NUM_TABS: 5,

    // Delays escalonados en milisegundos para cada tab
    // La primera dispara a las 22:30:00.000
    // La segunda a las 22:30:00.500
    // La tercera a las 22:30:01.000, etc.
    DELAYS_MS: [0, 500, 1000, 1500, 2000],

    // Hora de apertura de reservas (formato 24h)
    HORA_APERTURA: {
        hora: 19,
        minuto: 30,
        segundo: 0
    },

    // Segundos de anticipación para preparar tabs
    // Por ejemplo, con 10 segundos, las tabs estarán listas a las 22:29:50
    SEGUNDOS_ANTICIPACION: 10,

    // Activar estrategia multi-tab cuando falten X minutos
    // El bot esperará en modo "dormido" hasta este momento
    MINUTOS_ACTIVACION: 30,

    // ============================================
    // CONFIGURACIÓN GENERAL
    // ============================================

    // URL base del sitio
    URL_BASE: "https://eduardolatorre.deporsite.net",

    // ID de usuario (se detecta automáticamente, esto es fallback)
    ID_USUARIO_FALLBACK: 13257,

    // Ventana de reserva (en días desde las 22:30 de hoy)
    DIAS_VENTANA_RESERVA: 2,

    // ============================================
    // CONFIGURACIÓN DE PLAYWRIGHT
    // ============================================

    // Modo headless (true = invisible, false = ver navegador)
    // RECOMENDADO: false para debugging, true para producción
    HEADLESS: false,

    // Timeout general en milisegundos
    TIMEOUT: 15000,

    // ============================================
    // CONFIGURACIÓN AVANZADA
    // ============================================

    // Tomar screenshots en cada paso importante (útil para debugging)
    SCREENSHOTS_DEBUG: true,

    // Reintentar tabs que fallan durante preparación
    REINTENTAR_TABS_FALLIDAS: true,

    // Número máximo de reintentos por tab
    MAX_REINTENTOS_TAB: 2
};
