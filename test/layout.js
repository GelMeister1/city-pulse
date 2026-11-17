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
  // Scroll view repeats one city across the screen: its set pieces (the Synthwave car, Mt. Fuji) are drawn once, not per copy.
  win.setContentSize(1920, 1080); await new Promise(r => setTimeout(r, 300));
  for (const [city, hook] of [['synth', 'drawTop'], ['lantern', 'drawFar']]) {
    const n = await win.webContents.executeJavaScript(`(async () => {
      S.city = '${city}'; S.view = 'scroll'; layout();
      const T = THEMES['${city}'], orig = T.${hook}; let max = 0, n = 0;
      T.${hook} = function (g, E) { n++; return orig.call(this, g, E); };
      for (let i = 0; i < 30; i++) { n = 0; await new Promise(r => requestAnimationFrame(r)); max = Math.max(max, n); }
      T.${hook} = orig; return max;
    })()`);
    if (n !== 1) fails.push(`${city} scroll draws ${hook} ${n} times a frame`);
  }
  // Recent colors: newest first, no repeats, at most 8, and a swatch sets the color.
  const recent = await win.webContents.executeJavaScript(`(() => {
    const kept = localStorage.getItem(KEY); localStorage.removeItem(RECENT_KEY);
    for (const c of ['#111111', '#222222', '#111111', ...Array.from({ length: 9 }, (_, i) => '#00000' + i)]) rememberColor(c);
    const list = recentColors();
    document.querySelector('#recentColors button[data-c="#000003"]').click();
    localStorage.removeItem(RECENT_KEY); kept === null ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, kept);   // leave saved settings as they were
    return list.length === 8 && list[0] === '#000008' && !list.includes('#111111') && S.color === '#000003';
  })()`);
  if (!recent) fails.push('recent colors');
  // Live weather ignores a saved place that isn't a real position (it would throw every minute)
  const badPlace = await win.webContents.executeJavaScript(`(() => { const k = [S.liveWx, S.wxLat, S.wxLon]; S.liveWx = 'place'; S.wxLat = '40'; S.wxLon = null; const w = liveWhere(); [S.liveWx, S.wxLat, S.wxLon] = k; return w; })()`);
  if (badPlace !== null) fails.push('live weather accepted a bad place');
  await new Promise(r => setTimeout(r, 500));            // let a few frames draw the last layout
  console.log(`${cities.length} cities x ${VIEWS.length} views x ${SIZES.length} sizes`);
  if (errors.length) fails.push(...errors.map(e => 'console: ' + e.slice(0, 200)));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  app.exit(fails.length ? 1 : 0);
});
