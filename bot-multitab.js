const { chromium } = require('playwright');
const config = require('./config');

/**
 * Bot de reserva automática con estrategia MULTI-TAB optimizada
 *
 * ESTRATEGIA:
 * 1. Abre múltiples pestañas en paralelo (3-5)
 * 2. Cada pestaña llega hasta el paso PREVIO al click final "Reservar"
 * 3. Espera sincronizada hasta las 22:30:00
 * 4. Disparo escalonado con delays de 0ms, 500ms, 1000ms, 1500ms, 2000ms
 * 5. La primera que tenga éxito cancela automáticamente las demás
 */
class ReservaBotMultiTab {
    constructor() {
        this.browser = null;
        this.context = null;
        this.tabs = []; // Array de páginas (pestañas)
        this.exitoAlcanzado = false;
        this.tabExitosa = null;

        // Configuración de la estrategia multi-tab
        this.NUM_TABS = 5; // Número de pestañas a abrir
        this.DELAYS = [0, 500, 1000, 1500, 2000]; // Delays en ms para cada tab
        this.HORA_APERTURA = { hora: 22, minuto: 30, segundo: 0 }; // Hora de apertura de reservas
        this.SEGUNDOS_ANTICIPACION = 10; // Cuántos segundos antes de 22:30 comenzar a esperar
    }

    /**
     * Inicializa el navegador
     */
    async init() {
        console.log('[*] Iniciando navegador con estrategia MULTI-TAB...');
        this.browser = await chromium.launch({
            headless: config.HEADLESS,
            slowMo: 0 // Sin ralentización para máxima velocidad
        });

        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'es-ES',
            timezoneId: 'Europe/Madrid'
        });

        console.log('[✓] Navegador iniciado');
    }

    /**
     * Realiza login en una pestaña específica
     */
    async loginEnTab(page, tabId) {
        console.log(`[TAB ${tabId}] Iniciando sesión...`);

        try {
            await page.goto(`${config.URL_BASE}/loginmenu`, {
                waitUntil: 'domcontentloaded',
                timeout: 10000
            });

            await page.waitForSelector('input[name="email"]', { timeout: 8000 });
            await page.fill('input[name="email"]', config.EMAIL);
            await page.fill('input[name="password"]', config.PASSWORD);
            await page.click('#enviarFormulario');

            await page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 12000
            });

            const url = page.url();
            if (url.includes('login')) {
                throw new Error('Login falló - seguimos en página de login');
            }

            console.log(`[TAB ${tabId}] ✓ Login exitoso`);
            return true;

        } catch (error) {
            console.log(`[TAB ${tabId}] ❌ Error en login: ${error.message}`);
            return false;
        }
    }

    /**
     * Navega a la página de reservas en una pestaña
     */
    async navegarAReservasEnTab(page, tabId) {
        console.log(`[TAB ${tabId}] Navegando a página de reservas...`);

        try {
            await page.goto(`${config.URL_BASE}/reserva-clases?IdCentro=1`, {
                waitUntil: 'domcontentloaded',
                timeout: 12000
            });

            await page.waitForSelector('.clase[data-idactividad]', { timeout: 8000 });
            console.log(`[TAB ${tabId}] ✓ Página de reservas cargada`);
            return true;

        } catch (error) {
            console.log(`[TAB ${tabId}] ⚠️ Error navegando a reservas: ${error.message}`);
            return false;
        }
    }

    /**
     * Obtiene clases disponibles desde una pestaña
     */
    async obtenerClasesDisponibles(page, tabId) {
        console.log(`[TAB ${tabId}] Obteniendo clases disponibles...`);

        try {
            await page.waitForSelector('.clase[data-idactividad]', { timeout: 5000 });

            const clases = await page.evaluate(() => {
                const resultado = [];
                const elementosClases = document.querySelectorAll('.clase[data-idactividad]');

                elementosClases.forEach(el => {
                    try {
                        const idActividad = el.getAttribute('data-idactividad');
                        const fecha = el.getAttribute('data-idfecha');
                        const horaInicio = el.getAttribute('data-horainicio');
                        const horaFin = el.getAttribute('data-horafin');

                        const classes = el.className;
                        const nombreMatch = classes.match(/clase-nombre-([A-Z-]+)/);
                        const nombreActividad = nombreMatch ? nombreMatch[1].replace(/-/g, ' ') : '';

                        const popupContent = el.querySelector('.pop-up-content');
                        let plazasLibres = 0;
                        if (popupContent) {
                            const plazasText = popupContent.textContent;
                            const plazasMatch = plazasText.match(/(\d+)\s*\/\s*\d+\s*Plazas libres/);
                            plazasLibres = plazasMatch ? parseInt(plazasMatch[1]) : 0;
                        }

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

            console.log(`[TAB ${tabId}] Encontradas ${clases.length} clases en el DOM`);
            return clases;

        } catch (error) {
            console.log(`[TAB ${tabId}] ❌ Error obteniendo clases: ${error.message}`);
            return [];
        }
    }

    /**
     * Filtra clases según criterios de configuración
     */
    filtrarClases(clases, tabId) {
        const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const horaBase = new Date(ahora);
        horaBase.setHours(22, 30, 0, 0);
        const limiteReserva = new Date(horaBase.getTime() + config.DIAS_VENTANA_RESERVA * 24 * 60 * 60 * 1000);

        return clases.filter(clase => {
            const nombreClase = clase.nombreActividad.toLowerCase();

            const actividadCoincide = config.ACTIVIDADES.some(act =>
                nombreClase.includes(act.toLowerCase())
            );

            if (!actividadCoincide) return false;

            if (clase.hora) {
                const hora = parseInt(clase.hora.split(':')[0]);
                if (hora < config.HORA_MINIMA) return false;
            }

            if (config.MONITORES_IDS.length > 0 && clase.idMonitor) {
                if (!config.MONITORES_IDS.includes(parseInt(clase.idMonitor))) return false;
            }

            if (clase.plazasLibres <= 0) return false;

            if (clase.fecha && clase.fecha !== 'undefined') {
                try {
                    const claseDateTime = new Date(`${clase.fecha} ${clase.hora}`);
                    if (claseDateTime <= ahora || claseDateTime > limiteReserva) return false;
                } catch (e) {
                    // Si no podemos parsear la fecha, incluir la clase
                }
            } else {
                return false;
            }

            return true;
        });
    }

    /**
     * Prepara una pestaña hasta el PASO PREVIO al click final
     * Retorna true si llegó exitosamente al botón "Reservar" final
     */
    async prepararTabHastaBotonFinal(page, tabId, clase) {
        console.log(`[TAB ${tabId}] 🎯 Preparando hasta botón final: ${clase.nombreActividad} - ${clase.fecha} ${clase.hora}`);

        try {
            // PASO 1: Click en la clase para abrir el modal
            const selectorClase = `.clase[data-idactividad="${clase.idActividad}"][data-idfecha="${clase.fecha}"][data-horainicio="${clase.hora}"]`;

            await page.waitForSelector(selectorClase, { timeout: 3000 });
            await page.click(selectorClase);
            console.log(`[TAB ${tabId}] ✓ Click en la clase realizado`);

            // Esperar modal
            await page.waitForSelector('.well.modal-detalle-actividad', { timeout: 3000 });
            console.log(`[TAB ${tabId}] ✓ Modal de detalle abierto`);

            // PASO 2: Click en "Inscribirme"
            const botonInscribirme = await page.waitForSelector('.btn-reservar', { timeout: 3000 });
            if (!botonInscribirme) {
                console.log(`[TAB ${tabId}] ❌ No se encontró el botón Inscribirme`);
                return false;
            }

            console.log(`[TAB ${tabId}] ✓ Haciendo click en "Inscribirme"...`);
            await page.click('.btn-reservar');

            // Esperar navegación a página de pago/reserva
            await page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 8000
            });
            console.log(`[TAB ${tabId}] ✓ Navegado a página de reserva`);

            // PASO 3: LOCALIZAR el botón "Reservar" final pero NO hacer click aún
            const botonReservar = await page.waitForSelector('.btn-siguiente:has-text("Reservar")', { timeout: 5000 });

            if (!botonReservar) {
                console.log(`[TAB ${tabId}] ❌ No se encontró el botón Reservar final`);
                await page.screenshot({ path: `screenshot-tab${tabId}-no-reservar-${Date.now()}.png` });
                return false;
            }

            const textoBoton = await botonReservar.textContent();
            console.log(`[TAB ${tabId}] ✅ PREPARADA - Botón final encontrado: "${textoBoton.trim()}"`);
            console.log(`[TAB ${tabId}] 🎯 Lista para disparar en el momento indicado`);

            return true;

        } catch (error) {
            console.log(`[TAB ${tabId}] ❌ Error al preparar tab: ${error.message}`);
            await page.screenshot({ path: `screenshot-tab${tabId}-error-prep-${Date.now()}.png` });
            return false;
        }
    }

    /**
     * Ejecuta el click final en el botón "Reservar"
     * Esta función se ejecuta en el momento exacto (22:30 + delay)
     */
    async ejecutarClickFinal(page, tabId, delay) {
        if (this.exitoAlcanzado) {
            console.log(`[TAB ${tabId}] ⏭️ Cancelada - otra tab ya tuvo éxito`);
            return false;
        }

        try {
            console.log(`[TAB ${tabId}] ⏳ Esperando ${delay}ms antes de disparar...`);
            await page.waitForTimeout(delay);

            if (this.exitoAlcanzado) {
                console.log(`[TAB ${tabId}] ⏭️ Cancelada durante delay - otra tab ya tuvo éxito`);
                return false;
            }

            console.log(`[TAB ${tabId}] 🚀 DISPARANDO click final en "Reservar"...`);
            await page.click('.btn-siguiente:has-text("Reservar")');

            // Esperar confirmación
            await page.waitForTimeout(1500);

            // Verificar éxito
            const textoExito = await page.evaluate(() => {
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

            if (textoExito.confirmada || textoExito.exito || textoExito.correctamente || textoExito.reservada) {
                console.log(`[TAB ${tabId}] ✅✅✅ ¡RESERVA EXITOSA!`);
                this.exitoAlcanzado = true;
                this.tabExitosa = tabId;
                await page.screenshot({ path: `screenshot-EXITO-tab${tabId}-${Date.now()}.png` });
                return true;
            } else {
                // Verificar si hay error
                const hayError = await page.evaluate(() => {
                    const body = document.body.textContent.toLowerCase();
                    return body.includes('error') ||
                           body.includes('no se pudo') ||
                           body.includes('no disponible') ||
                           body.includes('completo');
                });

                if (!hayError) {
                    console.log(`[TAB ${tabId}] ✅ No hay mensajes de error - asumiendo éxito`);
                    this.exitoAlcanzado = true;
                    this.tabExitosa = tabId;
                    await page.screenshot({ path: `screenshot-EXITO-tab${tabId}-${Date.now()}.png` });
                    return true;
                } else {
                    console.log(`[TAB ${tabId}] ❌ Reserva fallida - hay mensaje de error`);
                    await page.screenshot({ path: `screenshot-tab${tabId}-error-${Date.now()}.png` });
                    return false;
                }
            }

        } catch (error) {
            console.log(`[TAB ${tabId}] ❌ Error al ejecutar click final: ${error.message}`);
            await page.screenshot({ path: `screenshot-tab${tabId}-crash-${Date.now()}.png` });
            return false;
        }
    }

    /**
     * Calcula cuántos milisegundos faltan para la hora de apertura
     */
    calcularMilisegundosHastaApertura() {
        const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const horaApertura = new Date(ahora);
        horaApertura.setHours(this.HORA_APERTURA.hora, this.HORA_APERTURA.minuto, this.HORA_APERTURA.segundo, 0);

        // Si ya pasó la hora de apertura hoy, calcular para mañana
        if (ahora >= horaApertura) {
            horaApertura.setDate(horaApertura.getDate() + 1);
        }

        const diferencia = horaApertura.getTime() - ahora.getTime();
        return diferencia;
    }

    /**
     * Espera hasta N segundos antes de la hora de apertura
     */
    async esperarHastaHoraObjetivo() {
        const msHastaApertura = this.calcularMilisegundosHastaApertura();
        const msAnticipacion = this.SEGUNDOS_ANTICIPACION * 1000;
        const msEspera = msHastaApertura - msAnticipacion;

        if (msEspera > 0) {
            const minutosEspera = Math.floor(msEspera / 60000);
            const segundosEspera = Math.floor((msEspera % 60000) / 1000);
            console.log(`\n⏰ Esperando ${minutosEspera}m ${segundosEspera}s hasta ${this.SEGUNDOS_ANTICIPACION}s antes de las ${this.HORA_APERTURA.hora}:${this.HORA_APERTURA.minuto}...\n`);
            await new Promise(resolve => setTimeout(resolve, msEspera));
        }

        console.log(`\n🎯 ¡Momento objetivo alcanzado! Preparadas para disparar en ${this.SEGUNDOS_ANTICIPACION}s\n`);
    }

    /**
     * Espera sincronizada hasta el momento exacto de apertura
     */
    async esperarHastaMomentoExacto() {
        const ahora = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
        const horaApertura = new Date(ahora);
        horaApertura.setHours(this.HORA_APERTURA.hora, this.HORA_APERTURA.minuto, this.HORA_APERTURA.segundo, 0);

        const msHastaApertura = horaApertura.getTime() - ahora.getTime();

        if (msHastaApertura > 0) {
            console.log(`\n⏱️ Esperando ${msHastaApertura}ms hasta el momento exacto...\n`);
            await new Promise(resolve => setTimeout(resolve, msHastaApertura));
        }

        console.log(`\n🚀🚀🚀 ¡MOMENTO EXACTO! Disparando todas las tabs...\n`);
    }

    /**
     * Estrategia principal multi-tab
     */
    async ejecutarEstrategiaMultiTab() {
        console.log('\n========================================');
        console.log('🚀 ESTRATEGIA MULTI-TAB ACTIVADA');
        console.log(`📊 Número de pestañas: ${this.NUM_TABS}`);
        console.log(`⏱️ Delays escalonados: ${this.DELAYS.join('ms, ')}ms`);
        console.log(`🎯 Hora objetivo: ${this.HORA_APERTURA.hora}:${String(this.HORA_APERTURA.minuto).padStart(2, '0')}:${String(this.HORA_APERTURA.segundo).padStart(2, '0')}`);
        console.log('========================================\n');

        // PASO 1: Crear la primera pestaña y hacer login UNA SOLA VEZ
        console.log('[FASE 1] Creando primera pestaña y autenticando (login único)...\n');

        const primeraPage = await this.context.newPage();
        primeraPage.setDefaultTimeout(15000);
        this.tabs.push({ page: primeraPage, id: 1, preparada: false });

        const loginExitoso = await this.loginEnTab(primeraPage, 1);
        if (!loginExitoso) {
            console.log('[❌] Login falló en la primera tab - abortando');
            return false;
        }

        console.log('[✅] Sesión iniciada - las demás tabs heredarán automáticamente las cookies\n');

        // PASO 2: Crear las pestañas restantes (ya comparten la sesión)
        console.log(`[FASE 2] Creando ${this.NUM_TABS - 1} pestañas adicionales (sin login - sesión compartida)...\n`);

        for (let i = 1; i < this.NUM_TABS; i++) {
            const page = await this.context.newPage();
            page.setDefaultTimeout(15000);
            this.tabs.push({ page, id: i + 1, preparada: false });
            console.log(`[TAB ${i + 1}] ✓ Pestaña creada (sesión heredada)`);
        }

        console.log('\n[FASE 3] Navegando a página de reservas en TODAS las tabs en paralelo...\n');

        // PASO 3: Navegar a reservas en todas las tabs (en paralelo para mayor velocidad)
        const promesasNavegacion = this.tabs.map(tab =>
            this.navegarAReservasEnTab(tab.page, tab.id)
        );
        await Promise.all(promesasNavegacion);

        console.log('\n[✅] Todas las tabs han navegado a reservas exitosamente\n');

        console.log('[FASE 4] Buscando clases disponibles...\n');

        // PASO 4: Obtener y filtrar clases (usando la primera tab)
        const clasesTodas = await this.obtenerClasesDisponibles(this.tabs[0].page, 1);

        if (clasesTodas.length === 0) {
            console.log('[❌] No se encontraron clases - abortando');
            return false;
        }

        const clasesFiltradas = this.filtrarClases(clasesTodas, 1);

        if (clasesFiltradas.length === 0) {
            console.log(`[❌] No hay clases de ${config.ACTIVIDADES.join(', ')} disponibles - abortando`);
            return false;
        }

        console.log(`\n[🔥] Encontradas ${clasesFiltradas.length} clases disponibles:`);
        clasesFiltradas.forEach(c => {
            console.log(`   - ${c.nombreActividad} | ${c.fecha} ${c.hora} | Plazas: ${c.plazasLibres} | Monitor: ${c.nombreMonitor || 'N/A'}`);
        });

        const claseObjetivo = clasesFiltradas[0];
        console.log(`\n[🎯] Clase objetivo seleccionada: ${claseObjetivo.nombreActividad} - ${claseObjetivo.fecha} ${claseObjetivo.hora}\n`);

        // PASO 5: Preparar todas las tabs hasta el botón final
        console.log('[FASE 5] Preparando todas las tabs hasta el botón final (en paralelo)...\n');

        const promesasPreparacion = this.tabs.map(tab =>
            this.prepararTabHastaBotonFinal(tab.page, tab.id, claseObjetivo)
                .then(preparada => {
                    tab.preparada = preparada;
                    return { tabId: tab.id, preparada };
                })
        );

        const resultadosPreparacion = await Promise.all(promesasPreparacion);
        const tabsPreparadas = this.tabs.filter(tab => tab.preparada);

        console.log(`\n[📊] Resumen de preparación:`);
        console.log(`   ✅ Tabs preparadas: ${tabsPreparadas.length}/${this.NUM_TABS}`);
        console.log(`   ❌ Tabs fallidas: ${this.NUM_TABS - tabsPreparadas.length}`);

        if (tabsPreparadas.length === 0) {
            console.log('\n[❌] Ninguna tab se preparó correctamente - abortando');
            return false;
        }

        console.log(`\n[✅] ${tabsPreparadas.length} tabs listas para disparar\n`);

        // PASO 6: Esperar hasta el momento objetivo
        console.log('[FASE 6] Esperando hasta el momento de apertura...\n');
        await this.esperarHastaHoraObjetivo();

        // PASO 7: Espera final hasta el momento exacto
        await this.esperarHastaMomentoExacto();

        // PASO 8: Disparar todas las tabs en paralelo con delays escalonados
        console.log('[FASE 7] 🚀🚀🚀 DISPARANDO TODAS LAS TABS...\n');

        const promesasDisparo = tabsPreparadas.map((tab, index) => {
            const delay = this.DELAYS[index] || 0;
            return this.ejecutarClickFinal(tab.page, tab.id, delay);
        });

        const resultados = await Promise.all(promesasDisparo);

        // PASO 9: Evaluar resultados
        console.log('\n========================================');
        console.log('📊 RESULTADOS FINALES');
        console.log('========================================\n');

        if (this.exitoAlcanzado) {
            console.log(`✅✅✅ ¡RESERVA EXITOSA EN TAB ${this.tabExitosa}!`);
            console.log(`\n[*] Cerrando tabs no utilizadas...`);

            // Cerrar tabs que no tuvieron éxito
            for (const tab of this.tabs) {
                if (tab.id !== this.tabExitosa) {
                    await tab.page.close();
                }
            }

            return true;
        } else {
            console.log('❌❌❌ Ninguna tab logró reservar exitosamente');
            console.log('\n[*] Resumen de intentos:');
            resultados.forEach((resultado, index) => {
                console.log(`   Tab ${tabsPreparadas[index].id}: ${resultado ? '✅ Éxito' : '❌ Fallo'}`);
            });
            return false;
        }
    }

    /**
     * Bucle principal - modo normal hasta cerca de la hora objetivo
     */
    async iniciar() {
        await this.init();

        console.log('\n[*] Bot Multi-Tab iniciado');
        console.log(`[*] Comprobando si es momento de activar estrategia multi-tab...\n`);

        // Calcular si falta poco para la hora de apertura
        const msHastaApertura = this.calcularMilisegundosHastaApertura();
        const minutosHastaApertura = Math.floor(msHastaApertura / 60000);

        console.log(`[*] Faltan ${minutosHastaApertura} minutos para las ${this.HORA_APERTURA.hora}:${String(this.HORA_APERTURA.minuto).padStart(2, '0')}\n`);

        // Si faltan menos de 30 minutos, activar estrategia multi-tab directamente
        if (minutosHastaApertura <= 30) {
            console.log('[🔥] Menos de 30 minutos para apertura - ACTIVANDO ESTRATEGIA MULTI-TAB\n');
            const exito = await this.ejecutarEstrategiaMultiTab();

            if (exito) {
                console.log('\n[✅] ¡Reserva completada! Manteniendo navegador abierto para verificar...');
                // Mantener abierto 30 segundos para que veas el resultado
                await new Promise(resolve => setTimeout(resolve, 30000));
            }

            await this.cerrar();
            process.exit(exito ? 0 : 1);
        } else {
            console.log(`[*] Faltan más de 30 minutos - esperando...\n`);
            console.log('[*] El bot se reactivará automáticamente cuando falten 30 minutos\n');

            // Esperar hasta 30 minutos antes
            const msEspera = msHastaApertura - (30 * 60 * 1000);
            await new Promise(resolve => setTimeout(resolve, msEspera));

            // Reiniciar para activar estrategia
            console.log('\n[🔥] ¡30 minutos para apertura! Activando estrategia multi-tab...\n');
            const exito = await this.ejecutarEstrategiaMultiTab();

            if (exito) {
                console.log('\n[✅] ¡Reserva completada! Manteniendo navegador abierto para verificar...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }

            await this.cerrar();
            process.exit(exito ? 0 : 1);
        }
    }

    /**
     * Cierra el navegador
     */
    async cerrar() {
        if (this.browser) {
            console.log('\n[*] Cerrando navegador...');
            await this.browser.close();
        }
    }
}

// Ejecutar el bot
(async () => {
    const bot = new ReservaBotMultiTab();

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
