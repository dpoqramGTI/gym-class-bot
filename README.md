# Bot de Reserva Automática con Playwright

Bot automatizado para reservar clases en DeporSite usando Playwright (simulación de navegador real).

## Instalación

```bash
cd playwright-auto-reserva
npm install
npm run install-browsers
```

## Configuración

Edita el archivo `config.js` para ajustar:

- **Credenciales**: EMAIL y PASSWORD
- **Actividades**: Array de nombres de clases a buscar
- **Monitores**: IDs de monitores específicos (opcional)
- **Hora mínima**: A partir de qué hora buscar
- **Intervalo**: Cada cuántos segundos comprobar
- **Modo headless**: `true` para navegador invisible, `false` para ver el navegador

## Ejecución

```bash
npm start
```

## Características

- ✅ Simula navegador real (evita detección)
- ✅ Login automático
- ✅ Búsqueda de clases según criterios
- ✅ Reserva automática
- ✅ Screenshots automáticos para debugging
- ✅ Reintentos automáticos
- ✅ Modo visible o invisible

## Debugging

Si el bot no encuentra las clases o botones, revisa:

1. Los screenshots generados en caso de error
2. Ajusta los selectores CSS en `bot.js` según la estructura del sitio
3. Ejecuta con `HEADLESS: false` para ver qué está haciendo el navegador

## Próximas mejoras

- [ ] Notificaciones por Telegram
- [ ] Soporte para múltiples usuarios
- [ ] Modo dry-run (sin reservar realmente)
- [ ] Logs más estructurados