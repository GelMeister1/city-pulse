// Run with: electron test/control.js
// Opens the Control Center in a hidden, muted, off-screen window with a stand-in app bridge (two screens), steps through
// Customize, and checks each choice shows the right settings below. Saves a screenshot to test/control.png when asked (--shot).
const { app, BrowserWindow } = require('electron'), path = require('path'), fs = require('fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 460, height: 900, useContentSize: true, frame: false,
    webPreferences: { offscreen: true, backgroundThrottling: false, preload: path.join(__dirname, 'control-stub.js') } });
  win.webContents.setAudioMuted(true);
  const errors = [], fails = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  await win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { control: '1' } });
  await new Promise(r => setTimeout(r, 500));
  const js = s => win.webContents.executeJavaScript(s);
  const step = async (clicks, wantSrc, wantCrumb) => {
    for (const [seg, label] of clicks) await js(`[...document.querySelectorAll('#${seg} button')].find(b => b.textContent === ${JSON.stringify(label)}).click()`);
    const [src, crumb, whichShown] = await js(`[document.getElementById('ccSettings').dataset.src, document.getElementById('ccCrumb').textContent, !document.getElementById('ccWhichWrap').hidden]`);
    if (src !== wantSrc) fails.push(`${JSON.stringify(clicks)}: settings ${src}, want ${wantSrc}`);
    if (!crumb.includes(wantCrumb)) fails.push(`${JSON.stringify(clicks)}: crumb "${crumb}"`);
    return whichShown;
  };
  const which = () => js(`[...document.querySelectorAll('#ccWhich button')].map(b => b.textContent).join('|')`);
  // opens on the wallpaper; section 2's dropdowns light up when on, in the order wallpaper, widget, full screen
  const lit = () => js(`['ccWall', 'ccWidget', 'ccFull'].map(id => { const e = document.getElementById(id); return e.options[e.selectedIndex].text + (e.classList.contains('lit') ? '*' : ''); }).join('|') + ' ' + [...document.querySelectorAll('#ccWhat button')].map(b => b.textContent).join(',')`);
  if (!(await js(`document.getElementById('ccSettings').dataset.src`)).includes('for=wall')) fails.push('should open on the wallpaper');
  if (await lit() !== 'All screens: one tour across*|Shown*|Off Wallpaper,Widget,Full screen') fails.push('where it shows: ' + await lit());
  await js(`__setState({ widgetShown: false })`);
  if (!(await lit()).startsWith('All screens: one tour across*|Hidden|Off ')) fails.push('widget hidden: ' + await lit());
  await js(`__setState({ widgetShown: true })`);
  if (await step([['ccWhat', 'Widget']], 'index.html?settings=1&for=widget&embed=1', 'the widget')) fails.push('widget should not ask which screen');
  // full screen off: one look, no screen choice
  if (await step([['ccWhat', 'Full screen']], 'index.html?settings=1&for=full&embed=1', 'is off')) fails.push('full screen off should not ask which screen');
  // one screen: still no screen choice, never "all screens"
  await js(`__setState({ fullMode: 'one' })`);
  if (!(await js(`document.getElementById('ccWhichWrap').hidden`))) fails.push('one screen should not offer screens');
  // own city each: one screen at a time, no "all screens"
  await js(`__setState({ fullMode: 'per' })`);
  if (await which() !== 'Screen 1|Screen 2') fails.push('own city each offers ' + await which());
  await step([['ccWhich', 'Screen 2']], 'index.html?settings=1&for=full&embed=1&screen=1', 'own city');
  // the tour across all screens: the tour, or one screen's lights
  await step([['ccWhat', 'Wallpaper']], 'index.html?settings=1&for=wall&embed=1&mode=span', 'the tour');
  if (await which() !== "The tour|Screen 1's lights|Screen 2's lights") fails.push('tour offers ' + await which());
  await step([['ccWhich', "Screen 1's lights"]], 'index.html?settings=1&for=wall&embed=1&mode=span&screen=0', 'own lights');
  // the tray's Settings → Full screen lands on that step
  await js(`window.__goto({ target: 'full' })`);
  const src = await js(`document.getElementById('ccSettings').dataset.src`);
  if (src !== 'index.html?settings=1&for=full&embed=1&screen=0') fails.push('goto: ' + src);
  // the embedded settings page loads its panel without errors
  await new Promise(r => setTimeout(r, 800));
  const panel = await js(`!document.getElementById('ccSettings').contentDocument.getElementById('panel').hidden`);
  if (!panel) fails.push('embedded settings panel not shown');
  if (process.argv.includes('--shot')) fs.writeFileSync(path.join(__dirname, 'control.png'), (await win.webContents.capturePage()).toPNG());
  if (errors.length) fails.push(...errors.map(e => 'console: ' + e.slice(0, 200)));
  console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS control center');
  app.exit(fails.length ? 1 : 0);
});
