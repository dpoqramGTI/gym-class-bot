const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://eduardolatorre.deporsite.net/loginmenu');
  await page.fill('input[name="email"]', '21658008');
  await page.fill('input[name="password"]', '8008torre');
  await page.click('#enviarFormulario');
  await page.waitForNavigation();

  await page.goto('https://eduardolatorre.deporsite.net/reserva-clases?IdCentro=1');
  await page.waitForSelector('.clase[data-idactividad]');

  const clasesSpinning = await page.evaluate(() => {
    const elementos = document.querySelectorAll('.clase[data-idactividad]');
    const resultado = [];

    elementos.forEach((el) => {
      // Buscar solo clases de SPINNING FUERZA
      if (el.className.includes('clase-nombre-SPINNING-FUERZA')) {
        const attrs = {};
        for (let attr of el.attributes) {
          attrs[attr.name] = attr.value;
        }

        const popup = el.querySelector('.pop-up-content');
        const popupText = popup ? popup.textContent : '';

        resultado.push({
          idActividad: attrs['data-idactividad'],
          fecha: attrs['data-idfecha'],
          horaInicio: attrs['data-horainicio'],
          horaFin: attrs['data-horafin'],
          popupText: popupText,
          nombreMonitor: popupText.match(/MONITOR\s+([^\n]+)/)?.[1]?.trim() || 'No encontrado'
        });
      }
    });

    return resultado;
  });

  console.log('Clases de SPINNING FUERZA encontradas:');
  console.log(JSON.stringify(clasesSpinning, null, 2));
  await browser.close();
})();
