const { chromium } = require('playwright');
const config = require('./config');

/**
 * Bot de reserva automática usando Playwright
 */
class ReservaBot {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.idUsuario = config.ID_USUARIO_FALLBACK;
    }

    /**
     * Inicializa el navegador
     */
    async init() {
        console.log('[*] Iniciando navegador...');
        this.browser = await chromium.launch({
            headless: config.HEADLESS,
            slowMo: config.SLOW_MO
        });

        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'es-ES',
            timezoneId: 'Europe/Madrid'
        });

        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(config.TIMEOUT);

        console.log('[✓] Navegador iniciado');
    }

    /**
     * Realiza login en la plataforma con optimizaciones de velocidad
     */
    async login() {
        console.log('[*] Iniciando sesión...');

        try {
            // Navegar a la página de login con timeout reducido
            await this.page.goto(`${config.URL_BASE}/loginmenu`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });

            // Esperar a que cargue el formulario (más rápido)
            await this.page.waitForSelector('input[name="email"]', { timeout: 8000 });

            // Completar formulario en paralelo para mayor velocidad
            await this.page.fill('input[name="email"]', config.EMAIL);
            await this.page.fill('input[name="password"]', config.PASSWORD);

            // Click en el botón específico de login
            await this.page.click('#enviarFormulario');

            // Esperar a que se complete el login con timeout optimizado
            await this.page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 12000
            });

            // Verificar que el login fue exitoso
            const url = this.page.url();
            if (url.includes('login')) {
                throw new Error('Login falló - seguimos en página de login');
            }

            console.log('[✓] Login exitoso');
            return true;

        } catch (error) {
            console.log(`[❌] Error en login: ${error.message}`);
            return false;
        }
    }

    /**
     * Navega a la página de reservas
     */
    async navegarAReservas() {
        console.log('[*] Navegando a página de reservas...');

        try {
            await this.page.goto(`${config.URL_BASE}/reserva-clases?IdCentro=1`, {
                waitUntil: 'domcontentloaded',
                timeout: 12000
            });

            // Esperar a que carguen las clases
            await this.page.waitForSelector('.clase[data-idactividad]', {
                timeout: 8000
            });
            console.log('[✓] Página de reservas cargada');
            return true;

        } catch (error) {
            console.log(`[⚠️] Error navegando a reservas: ${error.message}`);
            return false;
        }
    }

    /**
     * Obtiene la lista de clases disponibles
     */
    async obtenerClasesDisponibles() {
        console.log('[*] Obteniendo clases disponibles...');

        try {
            // Esperar a que se carguen las clases (ya esperamos en navegarAReservas)
            await this.page.waitForSelector('.clase[data-idactividad]', { timeout: 5000 });

            // Extraer información de las clases del DOM inmediatamente
            const clases = await this.page.evaluate(() => {
                const resultado = [];

                // Buscar elementos de clases con el selector específico de DeporSite
                const elementosClases = document.querySelectorAll('.clase[data-idactividad]');

                elementosClases.forEach(el => {
                    try {
                        const idActividad = el.getAttribute('data-idactividad');
                        const fecha = el.getAttribute('data-idfecha');
                        const horaInicio = el.getAttribute('data-horainicio');
                        const horaFin = el.getAttribute('data-horafin');

                        // Extraer nombre de la clase desde las clases CSS
                        const classes = el.className;
                        const nombreMatch = classes.match(/clase-nombre-([A-Z-]+)/);
                        const nombreActividad = nombreMatch ? nombreMatch[1].replace(/-/g, ' ') : '';

                        // Extraer plazas libres del popup interno
                        const popupContent = el.querySelector('.pop-up-content');
                        let plazasLibres = 0;
                        if (popupContent) {
                            const plazasText = popupContent.textContent;
                            const plazasMatch = plazasText.match(/(\d+)\s*\/\s*\d+\s*Plazas libres/);
                            plazasLibres = plazasMatch ? parseInt(plazasMatch[1]) : 0;
                        }

                        // Extraer monitor - buscar en el popup de manera más robusta
                        let nombreMonitor = '';
                        if (popupContent) {
                            const monitorMatch = popupContent.textContent.match(/MONITOR\s+([^\n\r\t]+)/);
                            if (monitorMatch) {
                                nombreMonitor = monitorMatch[1].trim();
                            }
                        }

                        if (idActividad && nombreActividad && plazasLibres > 0) {
                            resultado.push({
                                idActividad,
                                nombreActividad,
                                fecha,
                                hora: horaInicio,
                                horaFin,
                                plazasLibres,
                                nombreMonitor,
                                claseElement: true
                            });
                        }
                    } catch (e) {
                        // Ignorar errores en clases individuales
                    }
                });

                return resultado;
            });

            console.log(`[*] Encontradas ${clases.length} clases en el DOM`);

            if (clases.length > 0) {
                console.log(`[DEBUG] Primeras 3 clases:`, clases.slice(0, 3));
            }

            return clases;

        } catch (error) {
            console.log(`[❌] Error obteniendo clases: ${error.message}`);
            return [];
        }
    }

    /**
     * Filtra clases según criterios de configuración
     */
    filtrarClases(clases) {
        const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const horaBase = new Date(ahora);
        horaBase.setHours(22, 30, 0, 0);
        const limiteReserva = new Date(horaBase.getTime() + config.DIAS_VENTANA_RESERVA * 24 * 60 * 60 * 1000);

        console.log(`[*] Filtrando clases...`);
        console.log(`[*] Hora actual: ${ahora.toISOString().substring(0, 19)}`);
        console.log(`[*] Ventana de reserva: hasta ${limiteReserva.toISOString().substring(0, 19)}`);

        return clases.filter(clase => {
            const nombreClase = clase.nombreActividad.toLowerCase();

            // Verificar actividad
            const actividadCoincide = config.ACTIVIDADES.some(act =>
                nombreClase.includes(act.toLowerCase())
            );

            if (!actividadCoincide) return false;

            // Verificar hora mínima
            if (clase.hora) {
                const hora = parseInt(clase.hora.split(':')[0]);
                if (hora < config.HORA_MINIMA) return false;
            }

            // Verificar monitor (si se especifica)
            if (config.MONITORES_IDS.length > 0 && clase.idMonitor) {
                if (!config.MONITORES_IDS.includes(parseInt(clase.idMonitor))) return false;
            }

            // Verificar plazas
            if (clase.plazasLibres <= 0) return false;

            // Verificar fecha (si está disponible)
            if (clase.fecha && clase.fecha !== 'undefined') {
                try {
                    const claseDateTime = new Date(`${clase.fecha} ${clase.hora}`);
                    if (claseDateTime <= ahora || claseDateTime > limiteReserva) return false;
                } catch (e) {
                    // Si no podemos parsear la fecha, incluir la clase
                }
            } else {
                // Excluir clases sin fecha definida (no se pueden reservar)
                return false;
            }

            return true;
        });
    }

    /**
     * Intenta reservar una clase específica con optimizaciones de velocidad
     */
    async reservarClase(clase) {
        console.log(`[*] Intentando reservar: ${clase.nombreActividad} - ${clase.fecha} ${clase.hora}`);
        console.log(`[*] ID Actividad: ${clase.idActividad}, Plazas: ${clase.plazasLibres}`);

        try {
            // PASO 1: Hacer click en la clase para abrir el modal
            const selectorClase = `.clase[data-idactividad="${clase.idActividad}"][data-idfecha="${clase.fecha}"][data-horainicio="${clase.hora}"]`;
            console.log(`[*] Buscando clase con selector: ${selectorClase}`);

            await this.page.waitForSelector(selectorClase, { timeout: 3000 });
            await this.page.click(selectorClase);
            console.log('[✓] Click en la clase realizado');

            // Esperar a que aparezca el modal (tiempo reducido)
            await this.page.waitForSelector('.well.modal-detalle-actividad', { timeout: 3000 });
            console.log('[✓] Modal de detalle abierto');

            // PASO 2: Click en botón "Inscribirme" dentro del modal
            const botonInscribirme = await this.page.waitForSelector('.btn-reservar', { timeout: 3000 });

            if (!botonInscribirme) {
                console.log('[❌] No se encontró el botón Inscribirme');
                await this.page.screenshot({ path: `screenshot-no-inscribirme-${Date.now()}.png` });
                return false;
            }

            console.log('[*] Haciendo click en "Inscribirme"...');
            await this.page.click('.btn-reservar');

            // Esperar navegación a página de pago/reserva (timeout reducido)
            await this.page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 8000
            });
            console.log('[✓] Navegado a página de reserva');

            // PASO 3: Click en botón "Reservar" (paso final) - sin delay fijo
            // Usar selector más específico que incluye el texto "Reservar"
            const botonReservar = await this.page.waitForSelector('.btn-siguiente:has-text("Reservar")', { timeout: 5000 });

            if (!botonReservar) {
                console.log('[❌] No se encontró el botón Reservar final');
                await this.page.screenshot({ path: `screenshot-no-reservar-${Date.now()}.png` });
                return false;
            }

            // Verificar que el botón dice "Reservar"
            const textoBoton = await botonReservar.textContent();
            console.log(`[*] Texto del botón: "${textoBoton.trim()}"`);

            console.log('[*] Haciendo click en "Reservar" (confirmación final)...');
            await this.page.click('.btn-siguiente:has-text("Reservar")');

            // Esperar confirmación (tiempo reducido)
            await this.page.waitForTimeout(1500);

            // Verificar éxito - buscar indicadores de reserva exitosa
            const urlActual = this.page.url();
            console.log(`[DEBUG] URL actual: ${urlActual}`);

            const textoExito = await this.page.evaluate(() => {
                const body = document.body.textContent.toLowerCase();
                return {
                    confirmada: body.includes('reserva confirmada') ||
                               body.includes('reserva realizada') ||
                               body.includes('inscripción confirmada'),
                    exito: body.includes('éxito') || body.includes('exitosa'),
                    correctamente: body.includes('correctamente'),
                    reservada: body.includes('reservada'),
                    bodyText: document.body.textContent.substring(0, 500)
                };
            });

            console.log('[DEBUG] Verificación de éxito:', textoExito);

            if (textoExito.confirmada || textoExito.exito || textoExito.correctamente || textoExito.reservada) {
                console.log('[✅] ¡Reserva completada exitosamente!');
                await this.page.screenshot({ path: `screenshot-exito-${Date.now()}.png` });
                return true;
            } else {
                console.log('[⚠️] No se pudo confirmar el éxito de la reserva');
                console.log('[DEBUG] Texto del body:', textoExito.bodyText);
                await this.page.screenshot({ path: `screenshot-resultado-${Date.now()}.png` });

                // Asumir éxito si no hay mensaje de error
                const hayError = await this.page.evaluate(() => {
                    const body = document.body.textContent.toLowerCase();
                    return body.includes('error') ||
                           body.includes('no se pudo') ||
                           body.includes('no disponible') ||
                           body.includes('completo');
                });

                if (!hayError) {
                    console.log('[✓] No hay mensajes de error - asumiendo éxito');
                    return true;
                }

                return false;
            }

        } catch (error) {
            console.log(`[❌] Error al reservar: ${error.message}`);
            console.log(`[DEBUG] Stack: ${error.stack}`);
            await this.page.screenshot({ path: `screenshot-error-${Date.now()}.png` });
            return false;
        }
    }

    /**
     * Ejecuta un ciclo de búsqueda y reserva con optimizaciones
     */
    async ejecutarCiclo() {
        try {
            // Navegar a reservas (sin recargar si ya estamos ahí)
            const currentUrl = this.page.url();
            if (!currentUrl.includes('reserva-clases')) {
                await this.navegarAReservas();
            }

            // Obtener clases
            const clasesTodas = await this.obtenerClasesDisponibles();

            if (clasesTodas.length === 0) {
                console.log('[·] No se encontraron clases en el DOM');
                return;
            }

            // Filtrar según criterios
            const clasesFiltradas = this.filtrarClases(clasesTodas);

            if (clasesFiltradas.length === 0) {
                console.log(`[·] No hay clases de ${config.ACTIVIDADES.join(', ')} disponibles`);
                return;
            }

            console.log(`[🔥] Encontradas ${clasesFiltradas.length} clases disponibles:`);
            clasesFiltradas.forEach(c => {
                console.log(`   - ${c.nombreActividad} | ${c.fecha} ${c.hora} | Plazas: ${c.plazasLibres}`);
            });

            // Intentar reservar la primera clase disponible
            const exito = await this.reservarClase(clasesFiltradas[0]);

            if (exito) {
                console.log('[✅] Reserva exitosa - deteniendo bot');
                await this.cerrar();
                process.exit(0);
            }

        } catch (error) {
            console.log(`[❌] Error en ciclo: ${error.message}`);
        }
    }

    /**
     * Bucle principal
     */
    async iniciar() {
        await this.init();

        const loginExitoso = await this.login();
        if (!loginExitoso) {
            console.log('[❌] No se pudo iniciar sesión - abortando');
            await this.cerrar();
            return;
        }

        console.log(`[*] Iniciando bucle de comprobación cada ${config.CHECK_INTERVAL} segundos...`);

        while (true) {
            await this.ejecutarCiclo();

            console.log(`[*] Esperando ${config.CHECK_INTERVAL} segundos...`);
            await this.page.waitForTimeout(config.CHECK_INTERVAL * 1000);
        }
    }

    /**
     * Cierra el navegador
     */
    async cerrar() {
        if (this.browser) {
            console.log('[*] Cerrando navegador...');
            await this.browser.close();
        }
    }
}

// Ejecutar el bot
(async () => {
    const bot = new ReservaBot();

    // Manejar señales de terminación
    process.on('SIGINT', async () => {
        console.log('\n[!] Deteniendo bot...');
        await bot.cerrar();
        process.exit(0);
    });

    try {
        await bot.iniciar();
    } catch (error) {
        console.error('[❌] Error fatal:', error);
        await bot.cerrar();
        process.exit(1);
    }
})();