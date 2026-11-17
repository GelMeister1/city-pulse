// Run with: electron test/layout.js
// Lays out every city in every view at a few window sizes, in a hidden, muted, off-screen window, and checks each has buildings.
const { app, BrowserWindow } = require('electron'), path = require('path');
const SIZES = [[45, 60], [420, 240], [1920, 1080]], VIEWS = ['fit', 'pan', 'tour', 'scroll'];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600, useContentSize: true, frame: false,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true);
  const errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { full: '1' } });
  const cities = await win.webContents.executeJavaScript(`[...document.getElementById('city').options].map(o => o.value)`);
  const fails = [];
  for (const [w, h] of SIZES) {
    win.setContentSize(w, h);
    await new Promise(r => setTimeout(r, 300));
    for (const view of VIEWS) for (const city of view === 'tour' ? [cities[0]] : cities) {
      const n = await win.webContents.executeJavaScript(`(() => { S.view = ${JSON.stringify(view)}; S.city = ${JSON.stringify(city)};
        try { layout(); return buildings.length; } catch (e) { return 'threw ' + e.stack.split('\\n').slice(0, 3).join(' | '); } })()`);
      if (!(n > 0)) fails.push(`${city} ${view} ${w}x${h}: ${n}`);
    }
  }
  // The tour picker: any choice of cities, even a single one or none at all, still builds a tour.
  const realKeys = await win.webContents.executeJavaScript(`Object.keys(CITIES)`);
  for (const off of [cities.slice(1), cities, cities.filter((_, i) => i % 2), realKeys, cities.filter(k => !realKeys.includes(k))]) {
    const n = await win.webContents.executeJavaScript(`(() => { S.view = 'tour'; S.tourOff = ${JSON.stringify(off)};
      try { layout(); return buildings.length && tourStops().length === ${off.length === cities.length ? cities.length : cities.length - off.length} && tourStops().length; } catch (e) { return 'threw ' + e.message; } })()`);
    if (!(n > 0)) fails.push(`tour leaving out ${off.length} cities: ${n}`);
  }
  const first = await win.webContents.executeJavaScript(`(S.tourOff = [], document.getElementById('city').options[0].parentElement.label)`);
  if (first !== 'Real cities') fails.push('City menu should start with real cities, starts with ' + first);
  await new Promise(r => setTimeout(r, 500));            // let a few frames draw the last layout
  console.log(`${cities.length} cities x ${VIEWS.length} views x ${SIZES.length} sizes`);
  if (errors.length) fails.push(...errors.map(e => 'console: ' + e.slice(0, 200)));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  app.exit(fails.length ? 1 : 0);
});
