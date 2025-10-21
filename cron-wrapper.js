const cron = require('node-cron');
const { exec } = require('child_process');

/**
 * Wrapper de cron para ejecutar el bot a las 22:25 todos los días
 *
 * Este script mantiene el proceso vivo en Railway y ejecuta
 * el bot en el horario programado.
 */

console.log('====================================');
console.log('🤖 BOT DE RESERVAS - MODO CRON');
console.log('====================================');
console.log('[*] Programado para ejecutar a las 22:25 (hora de Madrid)');
console.log('[*] Zona horaria: Europe/Madrid');
console.log('[*] El contenedor permanecerá activo esperando...\n');

// Tarea programada: ejecutar todos los días a las 22:25 (hora de Madrid)
// Formato cron: minuto hora * * *
// 25 22 * * * = A las 22:25 todos los días
const task = cron.schedule('25 22 * * *', () => {
    const ahora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
    console.log(`\n[${ahora}] ⏰ ¡Hora de ejecutar el bot!`);
    console.log('[*] Iniciando bot-multitab.js...\n');

    // Ejecutar el bot
    const proceso = exec('node bot-multitab.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`[❌] Error al ejecutar el bot: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`[⚠️] stderr: ${stderr}`);
        }
        console.log(`[✅] Bot ejecutado exitosamente:\n${stdout}`);
    });

    // Mostrar salida en tiempo real
    proceso.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    proceso.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    proceso.on('close', (code) => {
        const horaFin = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
        console.log(`\n[${horaFin}] Bot finalizado con código: ${code}`);
        console.log('[*] Esperando próxima ejecución (mañana 22:25)...\n');
    });
}, {
    scheduled: true,
    timezone: "Europe/Madrid"
});

// Información de próxima ejecución
console.log('[✅] Tarea cron programada correctamente');
console.log('[*] Próximas ejecuciones:');

const ahora = new Date();
const proximasEjecuciones = [];

for (let i = 0; i < 3; i++) {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() + i);
    fecha.setHours(22, 25, 0, 0);

    // Si hoy ya pasó las 22:25, empezar desde mañana
    if (i === 0 && ahora.getHours() > 22 || (ahora.getHours() === 22 && ahora.getMinutes() >= 25)) {
        continue;
    }

    const fechaStr = fecha.toLocaleString("es-ES", {
        timeZone: "Europe/Madrid",
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    proximasEjecuciones.push(fechaStr);
}

proximasEjecuciones.forEach((fecha, index) => {
    console.log(`   ${index + 1}. ${fecha}`);
});

console.log('\n[*] El bot está activo y esperando...');
console.log('[*] Presiona Ctrl+C para detener\n');

// Mantener el proceso vivo
process.on('SIGINT', () => {
    console.log('\n[!] Deteniendo servicio cron...');
    task.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[!] Deteniendo servicio cron...');
    task.stop();
    process.exit(0);
});

// Heartbeat cada hora para confirmar que el servicio está vivo
setInterval(() => {
    const ahora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
    console.log(`[💓] Heartbeat: ${ahora} - Servicio activo`);
}, 60 * 60 * 1000); // Cada hora
