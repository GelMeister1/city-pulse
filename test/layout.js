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
  // Season: its weather only while the sky is otherwise clear; weather you pick and live weather win; Auto follows the date
  const season = await win.webContents.executeJavaScript(`(() => {
    const keep = { ...S }; S.city = 'nyc'; layout(); S.liveWx = 'off'; S.wxAuto = false; const out = [];
    for (const [season, weather, auto] of [['winter', 'none'], ['fall', 'none'], ['winter', 'rain'], ['winter', 'rain', true], ['summer', 'none'], ['off', 'fog']]) {
      S.season = season; S.weather = weather; S.wxAuto = !!auto; out.push(weatherNow());
    }
    S.season = 'winter'; S.weather = 'none'; S.liveWx = 'city'; out.push(weatherNow());
    S.season = 'auto'; out.push(['winter', 'spring', 'summer', 'fall'].includes(seasonNow()));
    Object.assign(S, keep); layout(); return out.join(',');
  })()`);
  if (season !== 'snow,leaves,rain,snow,none,fog,none,true') fails.push('season vs weather: ' + season);
  // Jungle City, on a simulated clock: the explorer looks around for at least 2 minutes before he steals the skull, and the
  // pedestal brings it back about 2 minutes after the theft. He never searches the skull tower before the heist, and the
  // boulder rolls after him, gaining, but never catches him.
  const heist = await win.webContents.executeJavaScript(`(() => {
    const keep = { ...S }, E0 = { ...E }, T = THEMES.jungle; S.city = 'jungle'; S.view = 'fit'; layout();
    let t = E.t + 1, enter = 0, stole = 0, back = 0, shrine = 0, rolled = false, caught = 0;
    for (let i = 0; i < 9000 && !back; i++) {            // up to 7.5 minutes in 50 ms steps
      t += 50; Object.assign(E, { t, dt: .05 }); T.drawTop(ctx, E);
      const s = T.explorerState();
      if (!enter && s.ph !== 'away') enter = t;
      if (!s.heist && s.bSkull && ['look', 'turn', 'fade', 'inside'].includes(s.ph)) shrine++;
      if (s.boulder) rolled = true;
      if (s.ph === 'run' && s.gap < 0) caught++;
      if (enter && !stole && !s.skull) stole = t;
      if (stole && s.skull && s.ped === 'up') back = t;
    }
    Object.assign(E, E0); Object.assign(S, keep); layout();
    return { found: (stole - enter) / 1000, back: (back - stole) / 1000, shrine, rolled, caught };
  })()`);
  if (!(heist.found >= 120 && heist.back >= 120 && heist.back < 135 && !heist.shrine && heist.rolled && !heist.caught)) fails.push('jungle heist timing: ' + JSON.stringify(heist));
  // Christmas Village over 3 simulated minutes: never more than 12 children or 2 carriages, 2 to 5 skaters once they've
  // come out, the snowball fight actually knocks someone over, and the tree stands on a spot in the town.
  const xmas = await win.webContents.executeJavaScript(`(() => {
    const keep = { ...S }, E0 = { ...E }, T = THEMES.xmas; S.city = 'xmas'; S.view = 'pan'; layout();
    let t = E.t + 1, kids = 0, cars = 0, iceMax = 0, iceMin = 99, downs = 0;
    for (let i = 0; i < 3600; i++) {
      t += 50; Object.assign(E, { t, dt: .05 }); T.drawTop(ctx, E);
      const s = T.crowdState(); kids = Math.max(kids, s.kids); cars = Math.max(cars, s.cars); iceMax = Math.max(iceMax, s.onIce);
      if (i > 400) iceMin = Math.min(iceMin, s.onIce); if (s.poses.includes('down')) downs++;
    }
    const tree = T.crowdState().treeX;
    Object.assign(E, E0); Object.assign(S, keep); layout();
    return { kids, cars, iceMax, iceMin, downs, tree: typeof tree === 'number' };
  })()`);
  if (!(xmas.kids > 0 && xmas.kids <= 12 && xmas.cars >= 1 && xmas.cars <= 2 && xmas.iceMax <= 5 && xmas.iceMin >= 2 && xmas.downs && xmas.tree)) fails.push('christmas crowd: ' + JSON.stringify(xmas));
  // A machine that can't keep up at Retina density drops to one pixel per point; a pause (hidden window) doesn't count.
  const slowDrop = await win.webContents.executeJavaScript(`(() => {
    const run = ms => { scaleCap = 4; slow = 0; dpr = 2; for (let i = 0; i < 40; i++) frame(last + ms); return scaleCap; };
    const paused = run(500), slowed = run(50); scaleCap = 4; slow = 0; layout(); return paused === 4 && slowed === 1;
  })()`);
  if (!slowDrop) fails.push('slow frames should lower the drawing resolution, pauses should not');
  // A window whose saved settings have live weather on starts up (the panel reads the live weather while the page loads).
  // Uses a screen's own key that nothing else uses, removed afterwards; the hidden window is left open (closing it quits).
  const LW = 'cityPulse:full:7';
  await win.webContents.executeJavaScript(`localStorage.setItem(${JSON.stringify(LW)}, JSON.stringify({ city: 'nyc', liveWx: 'city' }))`);
  const lw = new BrowserWindow({ show: false, width: 640, height: 360, useContentSize: true, frame: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  lw.webContents.setAudioMuted(true);
  const lwErr = []; lw.webContents.on('console-message', e => { if (e.level === 'error') lwErr.push(e.message); });
  await lw.loadFile(path.join(__dirname, '..', 'index.html'), { query: { full: '1', mode: 'per', screen: '7' } });
  await new Promise(r => setTimeout(r, 500));
  const lwN = await lw.webContents.executeJavaScript(`typeof buildings === 'undefined' ? -1 : buildings.length`).catch(() => -1);
  await win.webContents.executeJavaScript(`localStorage.removeItem(${JSON.stringify(LW)})`);
  if (!(lwN > 0) || lwErr.length) fails.push(`live weather on at start: ${lwN} buildings ${lwErr.join(' | ').slice(0, 200)}`);
  await new Promise(r => setTimeout(r, 500));            // let a few frames draw the last layout
  console.log(`${cities.length} cities x ${VIEWS.length} views x ${SIZES.length} sizes`);
  if (errors.length) fails.push(...errors.map(e => 'console: ' + e.slice(0, 200)));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS');
  app.exit(fails.length ? 1 : 0);
});
