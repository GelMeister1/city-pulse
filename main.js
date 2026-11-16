// The visualizer itself is index.html; windows differ only by URL flags.
const { app, BrowserWindow, screen, session, ipcMain, Tray, Menu, nativeImage, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const win32 = require('./winhelper');
const audiocap = require('./audiocap');
const { autoUpdater } = require('electron-updater');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Chromium stops painting windows it thinks are covered; the live wallpaper sits behind the desktop, so it always looks covered.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
if (!app.requestSingleInstanceLock()) app.quit();

// The only page this app ever shows. Anything else is refused. (file: URLs have origin "null",
// so compare the URL with its query and hash cut off.)
const INDEX = pathToFileURL(path.join(__dirname, 'index.html')).href;
const isOurs = url => { try { const u = new URL(url); return u.protocol === 'file:' && u.href.split(/[?#]/)[0] === INDEX; } catch { return false; } };
const PREFS = { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') };
const ICON = path.join(__dirname, 'assets', 'icon.png');
const load = (win, query) => win.loadFile(path.join(__dirname, 'index.html'), { query });

// Small app preferences kept outside the page (which display the wallpaper uses).
const prefsFile = () => path.join(app.getPath('userData'), 'app-prefs.json');
let prefs = {};
const savePrefs = () => { try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch {} };

let tray, widget, control;
let fulls = [], walls = [];                                  // one per screen in multi-screen modes
const settings = {};

// No navigating away and no pop-ups, in every window. All new windows are opened by this file.
app.on('web-contents-created', (_, wc) => {
  wc.on('will-navigate', (e, url) => { if (!isOurs(url)) e.preventDefault(); });
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
});

const displayOf = w => screen.getDisplayMatching(w && !w.isDestroyed() ? w.getBounds() : screen.getPrimaryDisplay().bounds);

function createWidget() {
  const w = 420, h = 240, { workArea } = screen.getPrimaryDisplay();
  widget = new BrowserWindow({
    width: w, height: h, x: workArea.x + workArea.width - w - 16, y: workArea.y + workArea.height - h,
    frame: false, transparent: true, resizable: true, alwaysOnTop: true, hasShadow: false,
    skipTaskbar: true, title: 'City Pulse', icon: ICON, webPreferences: PREFS,
  });
  load(widget, { widget: '1' });
  widget.on('close', e => { if (!app.quitting) { e.preventDefault(); widget.hide(); } });
}

// Screens left to right, as arranged in Windows. "Screen 1" is the left-most.
const screensLR = () => screen.getAllDisplays().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
const screensParam = list => list.map(d => `${d.bounds.width}x${d.bounds.height}`).join(',');
const alive = list => list.filter(w => !w.isDestroyed());

// Multi-screen modes, shared by full screen and the wallpaper:
//   one  - a single screen (full screen: the widget's screen; wallpaper: the chosen screen)
//   per  - every screen, each with its own city and settings
//   span - every screen showing one continuous tour that scrolls from screen to screen
function windowsFor(mode, oneDisplay) {
  const list = screensLR();
  if (mode === 'one') return [{ d: oneDisplay, query: {} }];
  return list.map((d, i) => ({ d, query: { mode, screen: String(i), screens: screensParam(list) } }));
}

// In 'one' mode it opens on whichever screen the widget is on: drag the widget to the TV, press full screen.
function openFull(mode = prefs.fullMode || 'one') {
  if (alive(fulls).length) return closeFull();
  prefs.fullMode = mode; savePrefs();
  const home = displayOf(widget);
  fulls = windowsFor(mode, home).map(({ d, query }) => {
    const w = new BrowserWindow({ ...d.bounds, show: false, frame: false, backgroundColor: '#05060c', skipTaskbar: true,
      title: 'City Pulse', icon: ICON, autoHideMenuBar: true, webPreferences: PREFS });
    load(w, { full: '1', ...query });
    w.once('ready-to-show', () => {
      w.setBounds(d.bounds); w.setFullScreen(true);       // place first: Windows can move a window created already full screen
      d.id === home.id ? w.show() : w.showInactive();      // keyboard focus goes to the widget's screen
    });
    w.on('closed', () => { if (!alive(fulls).length) closeFull(); });
    return w;
  });
  // Full screen can cover every screen, taskbar and tray included, so Esc must always get you out,
  // whichever window has focus. It's claimed only while full screen is showing.
  globalShortcut.register('Escape', closeFull);
  if (control && !control.isDestroyed()) control.setAlwaysOnTop(true, 'screen-saver');   // the Control Center stays reachable
  updateTray();
}
function closeFull() {
  globalShortcut.unregister('Escape');
  alive(fulls).forEach(w => w.close()); fulls = [];
  [...Object.values(settings), control].forEach(w => { if (w && !w.isDestroyed()) w.setAlwaysOnTop(false); });
  updateTray();
}

// It opens on the screen it's about: that screen for per-screen settings, otherwise the widget's screen.
async function openSettings(target = 'widget', screenIdx = null) {
  // Per-screen settings only show while that view runs as "own city each". If it's running another way, offer to switch.
  const running = target === 'full' ? (alive(fulls).length ? prefs.fullMode : null) : target === 'wall' ? (prefs.wall || {}).mode : null;
  if (screenIdx !== null && running && running !== 'off' && running !== 'per') {
    const what = target === 'full' ? 'Full screen' : 'The wallpaper';
    const parent = alive(fulls)[0];                       // attach to full screen so the question can't hide behind it
    const { response } = await dialog.showMessageBox(...(parent ? [parent] : []), { type: 'question', buttons: ['Switch to own city each', 'Just edit settings'], defaultId: 0, cancelId: 1,
      message: `${what} is showing one ${running === 'span' ? 'tour across all screens' : 'screen'} right now.`,
      detail: 'Per-screen settings apply when every screen shows its own city. Switch so your changes show?' });
    if (response === 0) target === 'full' ? (closeFull(), openFull('per')) : await setWallpaper({ mode: 'per' });
  }
  const id = screenIdx === null ? target : `${target}:${screenIdx}`, open = settings[id];
  if (open && !open.isDestroyed()) return raise(open);
  const d = screenIdx === null ? displayOf(widget) : (screensLR()[screenIdx] || displayOf(widget));
  const wa = d.workArea, ww = 380, wh = Math.min(760, wa.height - 40);
  const w = settings[id] = new BrowserWindow({ width: ww, height: wh, minWidth: 320, x: Math.round(wa.x + (wa.width - ww) / 2), y: Math.round(wa.y + (wa.height - wh) / 2),
    title: 'City Pulse Settings', icon: ICON, autoHideMenuBar: true, backgroundColor: '#0b0e1c', webPreferences: PREFS });
  load(w, { settings: '1', for: target, ...(screenIdx === null ? {} : { screen: String(screenIdx) }) });
  raise(w);
}
// Settings must sit above full screen, which otherwise covers it and swallows the clicks.
function raise(w) { if (alive(fulls).length) w.setAlwaysOnTop(true, 'screen-saver'); w.show(); w.focus(); }

// prefs.wall = { mode: 'off' | 'one' | 'per' | 'span', display: id (for 'one') }
async function setWallpaper(cfg) {
  if (alive(walls).length) {
    alive(walls).forEach(w => w.destroy()); walls = [];
    await Promise.race([win32.refreshWallpaper(), new Promise(r => setTimeout(r, 3000))]);
  }
  prefs.wall = cfg; savePrefs();
  const one = cfg.mode === 'one' && screen.getAllDisplays().find(x => x.id === cfg.display);
  if (cfg.mode === 'off' || (cfg.mode === 'one' && !one)) return updateTray();
  const all = screen.getAllDisplays(), vx = Math.min(...all.map(x => x.bounds.x)), vy = Math.min(...all.map(x => x.bounds.y));
  walls = windowsFor(cfg.mode, one).map(({ d, query }) => {
    const w = new BrowserWindow({ ...d.bounds, show: false, frame: false, skipTaskbar: true, focusable: false,
      backgroundColor: '#05060c', title: 'City Pulse Wallpaper', webPreferences: { ...PREFS, backgroundThrottling: false } });
    load(w, { full: '1', wall: '1', ...query });
    w.once('ready-to-show', async () => {
      const hwnd = w.getNativeWindowHandle().readBigUInt64LE(0), rel = { x: d.bounds.x - vx, y: d.bounds.y - vy, width: d.bounds.width, height: d.bounds.height };
      const res = await win32.wallpaper(hwnd, rel);
      if (!res || !res.ok) {                              // Windows didn't allow it: back out quietly
        await setWallpaper({ mode: 'off' });
        tray.displayBalloon?.({ title: 'City Pulse', content: 'Live wallpaper isn’t available on this version of Windows.' });
      } else {
        w.showInactive();                                 // tell Chromium it's visible so it actually draws
        await win32.wallpaper(hwnd, rel);                 // and re-seat it in case showing moved it
      }
    });
    return w;
  });
  updateTray();
}

// The installed app checks GitHub Releases at startup and every 6 hours, downloads a newer version in the
// background, and installs it over itself the next time City Pulse quits (or right away from the tray).
let update = { state: 'idle' };                            // idle | checking | downloading | ready | latest | error
function checkForUpdates(manual) {
  if (!app.isPackaged) return manual && dialog.showMessageBox({ message: 'Updates only work in the installed app.' });
  update = { state: 'checking', manual }; updateTray();
  autoUpdater.checkForUpdates().catch(() => {});         // results arrive as events below
}
function setupUpdates() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', i => { update = { state: 'downloading', version: i.version }; updateTray(); });
  autoUpdater.on('update-not-available', () => {
    if (update.manual) dialog.showMessageBox({ message: `City Pulse ${app.getVersion()} is the latest version.` });
    update = { state: 'latest' }; updateTray();
  });
  autoUpdater.on('update-downloaded', i => {
    update = { state: 'ready', version: i.version }; updateTray();
    tray.displayBalloon?.({ title: 'City Pulse update ready', content: `Version ${i.version} installs when City Pulse restarts.` });
  });
  autoUpdater.on('error', () => {                         // offline, or the release page isn't reachable: try again later
    if (update.manual) dialog.showMessageBox({ message: 'Couldn’t check for updates right now. Try again later.' });
    update = { state: 'error' }; updateTray();
  });
  checkForUpdates(false);
  setInterval(() => checkForUpdates(false), 6 * 60 * 60 * 1000);
}
function updateMenuItem() {
  switch (update.state) {
    case 'checking': return { label: 'Checking for updates…', enabled: false };
    case 'downloading': return { label: `Downloading version ${update.version}…`, enabled: false };
    case 'ready': return { label: `Restart to update to ${update.version}`, click: () => { app.quitting = true; autoUpdater.quitAndInstall(); } };
    default: return { label: 'Check for updates', click: () => checkForUpdates(true) };
  }
}

async function uninstall() {
  const exe = path.join(path.dirname(app.getPath('exe')), `Uninstall ${app.getName()}.exe`);
  if (!app.isPackaged || !fs.existsSync(exe)) return dialog.showMessageBox({ message: 'Uninstall City Pulse from Windows Settings → Apps.' });
  const { response } = await dialog.showMessageBox({ type: 'question', buttons: ['Uninstall', 'Cancel'], defaultId: 1, cancelId: 1,
    message: 'Uninstall City Pulse?', detail: 'This removes the app, its settings and presets, and its Start with Windows entry.' });
  if (response !== 0) return;
  spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
  app.quit();
}

const LOGIN = { name: 'CityPulse' };                        // fixed name, so the uninstaller can remove it
function updateTray() {
  const list = screensLR(), shown = widget && !widget.isDestroyed() && widget.isVisible();
  const wall = prefs.wall || { mode: 'off' }, fullOpen = alive(fulls).length > 0, fm = prefs.fullMode || 'one';
  const screenName = (d, i) => `Screen ${i + 1}: ${d.label || 'display'} (${d.bounds.width}×${d.bounds.height})`;
  const perScreen = target => list.map((d, i) => ({ label: `${screenName(d, i)}…`, click: () => openSettings(target, i) }));
  if (control && !control.isDestroyed()) control.webContents.send('control-state', controlState());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Control Center…', click: openControl },
    { label: shown ? 'Hide widget' : 'Show widget', click: () => { shown ? widget.hide() : widget.show(); updateTray(); } },
    { label: 'Full screen', submenu: [
      ...(fullOpen ? [{ label: 'Close full screen', click: closeFull }, { type: 'separator' }] : []),
      { label: 'On the widget’s screen', type: 'radio', checked: fm === 'one', click: () => { closeFull(); openFull('one'); } },
      { label: 'All screens: own city each', type: 'radio', checked: fm === 'per', click: () => { closeFull(); openFull('per'); } },
      { label: 'All screens: one tour across', type: 'radio', checked: fm === 'span', click: () => { closeFull(); openFull('span'); } },
    ] },
    { label: 'Live wallpaper (experimental)', submenu: [
      { label: 'Off', type: 'radio', checked: wall.mode === 'off', click: () => setWallpaper({ mode: 'off' }) },
      ...list.map((d, i) => ({ label: screenName(d, i), type: 'radio', checked: wall.mode === 'one' && wall.display === d.id,
        click: () => setWallpaper({ mode: 'one', display: d.id }) })),
      { label: 'All screens: own city each', type: 'radio', checked: wall.mode === 'per', click: () => setWallpaper({ mode: 'per' }) },
      { label: 'All screens: one tour across', type: 'radio', checked: wall.mode === 'span', click: () => setWallpaper({ mode: 'span' }) },
    ] },
    { label: 'Settings', submenu: [
      { label: 'Widget…', click: () => openSettings('widget') },
      { label: 'Full screen (one screen or tour across)…', click: () => openSettings('full') },
      { label: 'Wallpaper (one screen or tour across)…', click: () => openSettings('wall') },
      { type: 'separator' },
      { label: 'Full screen, own city per screen', submenu: perScreen('full') },
      { label: 'Wallpaper, own city per screen', submenu: perScreen('wall') },
    ] },
    { type: 'separator' },
    { label: 'Start with Windows', type: 'checkbox', enabled: app.isPackaged, checked: app.getLoginItemSettings(LOGIN).openAtLogin,
      click: m => app.setLoginItemSettings({ ...LOGIN, openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: `City Pulse ${app.getVersion()}`, enabled: false },
    updateMenuItem(),
    { label: 'Uninstall City Pulse…', click: uninstall },
    { type: 'separator' },
    { label: 'Quit City Pulse', click: () => app.quit() },
  ]));
}

// One native capture, sent to every window that draws a city.
// prefs.source = { id, input }: id '' = the Windows default output (followed if it changes).
let stopCapture = null, captureKey = '', defaultOut = null, retry = null;
const cityWindows = () => [widget, ...fulls, ...walls].filter(w => w && !w.isDestroyed());
function startCapture() {
  const src = prefs.source || { id: '', input: false }, key = `${src.input}:${src.id}:${src.id ? '' : defaultOut}`;
  if (stopCapture && key === captureKey) return;
  stopCapture?.(); captureKey = key; clearTimeout(retry);
  stopCapture = audiocap.start(src.id, src.input,
    f => { const frame = { bins: f.bins, peak: f.peak, source: src.id }; for (const w of cityWindows()) w.webContents.send('audio-frame', frame); },
    () => {                                              // device unplugged or capture failed: back to the default output, try again shortly
      stopCapture = null; captureKey = '';
      if (src.id) { prefs.source = { id: '', input: false }; savePrefs(); broadcastSources(); }
      retry = setTimeout(startCapture, 3000);
    });
}
async function sourceList() {
  const [outs, ins] = await Promise.all([win32.outputs(), win32.inputs()]), cur = prefs.source || { id: '' };
  return [{ id: '', name: 'Default output (follows Windows)', kind: 'output', selected: !cur.id },
    ...(outs || []).map(o => ({ id: o.id, name: o.name, kind: 'output', selected: cur.id === o.id })),
    ...(ins || []).map(i => ({ id: i.id, name: i.name, kind: 'input', selected: cur.id === i.id }))];
}
async function broadcastSources() {
  const list = await sourceList();
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('sources', list);
}
async function setSource(id) {
  const match = (await sourceList()).find(s => s.id === (id || ''));
  if (!match) return false;
  prefs.source = { id: match.id, input: match.kind === 'input' }; savePrefs();
  startCapture(); broadcastSources();
  return true;
}
async function watchDefault() {
  const v = await win32.volume();
  if (v && v.id !== defaultOut) { defaultOut = v.id; if (!(prefs.source || {}).id) startCapture(); broadcastSources(); }
}

function openControl() {
  if (control && !control.isDestroyed()) { control.show(); return control.focus(); }
  const d = displayOf(widget), wa = d.workArea, b = prefs.controlBounds;
  const onScreen = b && screen.getAllDisplays().some(x => b.x >= x.workArea.x && b.y >= x.workArea.y && b.x < x.workArea.x + x.workArea.width && b.y < x.workArea.y + x.workArea.height);
  control = new BrowserWindow({ width: 440, height: Math.min(720, wa.height - 40), minWidth: 360,
    ...(onScreen ? { x: b.x, y: b.y } : { x: Math.round(wa.x + (wa.width - 440) / 2), y: Math.round(wa.y + 20) }),
    title: 'City Pulse Control Center', icon: ICON, autoHideMenuBar: true, backgroundColor: '#0b0e1c', webPreferences: PREFS });
  load(control, { control: '1' });
  if (alive(fulls).length) control.setAlwaysOnTop(true, 'screen-saver');   // stays reachable over full screen
  control.on('close', () => { const { x, y } = control.getBounds(); prefs.controlBounds = { x, y }; savePrefs(); });
}
function controlState() {
  const list = screensLR(), wall = prefs.wall || { mode: 'off' };
  return { fullMode: alive(fulls).length ? (prefs.fullMode || 'one') : 'off', wallMode: wall.mode || 'off',
    wallScreen: wall.mode === 'one' ? list.findIndex(d => d.id === wall.display) : null,
    widgetShown: !!(widget && !widget.isDestroyed() && widget.isVisible()),
    screens: list.map((d, i) => ({ index: i, label: d.label || `Screen ${i + 1}`, w: d.bounds.width, h: d.bounds.height })) };
}

// Page → app calls. Only our own page may use them.
const fromUs = e => isOurs(e.senderFrame && e.senderFrame.url);
ipcMain.on('open-full', e => { if (fromUs(e)) openFull(); });
ipcMain.on('open-settings', e => { if (fromUs(e)) openSettings('widget'); });   // only the widget's ⚙ asks; full screen has its own panel
ipcMain.on('close-window', e => {
  if (!fromUs(e)) return;
  const w = BrowserWindow.fromWebContents(e.sender);
  if (fulls.includes(w)) closeFull();                     // Esc on any full-screen window closes all of them
  else w?.close();
});
ipcMain.handle('volume', e => fromUs(e) ? win32.volume() : null);
ipcMain.handle('sources', e => fromUs(e) ? sourceList() : null);
ipcMain.handle('set-source', (e, id) => fromUs(e) && typeof id === 'string' ? setSource(id) : false);
ipcMain.on('open-control', e => { if (fromUs(e)) openControl(); });
ipcMain.handle('control-state', e => fromUs(e) ? controlState() : null);
const MODES = ['off', 'one', 'per', 'span'];
ipcMain.on('control-full', (e, mode) => {
  if (!fromUs(e) || !MODES.includes(mode)) return;
  closeFull(); if (mode !== 'off') openFull(mode);
});
ipcMain.on('control-wall', (e, mode, idx) => {
  if (!fromUs(e) || !MODES.includes(mode)) return;
  const d = mode === 'one' && screensLR()[idx | 0];
  if (mode === 'one' && !d) return;
  setWallpaper(mode === 'one' ? { mode, display: d.id } : { mode });
});
ipcMain.on('control-widget', (e, shown) => { if (fromUs(e)) { shown ? widget.show() : widget.hide(); updateTray(); } });
ipcMain.on('control-settings', (e, target, idx) => {
  if (fromUs(e) && ['widget', 'full', 'wall'].includes(target)) openSettings(target, Number.isInteger(idx) ? idx : null);
});

app.on('second-instance', () => { widget?.show(); openControl(); updateTray(); });

app.whenReady().then(() => {
  try { prefs = JSON.parse(fs.readFileSync(prefsFile(), 'utf8')); } catch { prefs = {}; }
  // Microphone and system-audio capture ('display-capture') are allowed for our own page only; everything else is refused.
  const ses = session.defaultSession, AUDIO = ['media', 'display-capture'];
  ses.setPermissionRequestHandler((wc, perm, cb, details) => cb(AUDIO.includes(perm) && isOurs(details.requestingUrl || wc.getURL())));
  ses.setPermissionCheckHandler((wc, perm, origin) => AUDIO.includes(perm) && (isOurs(wc ? wc.getURL() : '') || origin === 'file:///'));

  win32.start();
  createWidget();
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('City Pulse');
  tray.on('click', openControl);
  startCapture();
  watchDefault(); setInterval(watchDefault, 2000);
  widget.on('show', updateTray); widget.on('hide', updateTray);
  updateTray();
  if (prefs.wallpaper && !prefs.wall) prefs.wall = { mode: 'one', display: prefs.wallpaper };
  if (prefs.wall && prefs.wall.mode !== 'off') setWallpaper(prefs.wall);
  setupUpdates();
  const rearranged = () => { updateTray(); if (prefs.wall && ['per', 'span'].includes(prefs.wall.mode)) setWallpaper(prefs.wall); };
  screen.on('display-added', rearranged); screen.on('display-removed', rearranged);
});

app.on('before-quit', e => {
  app.quitting = true;
  stopCapture?.(); clearTimeout(retry);
  if (alive(walls).length) {
    e.preventDefault();
    alive(walls).forEach(w => w.destroy()); walls = [];
    // never let a slow wallpaper repaint hold up quitting
    Promise.race([win32.refreshWallpaper(), new Promise(r => setTimeout(r, 3000))]).finally(() => { win32.stop(); app.quit(); });
  } else win32.stop();
});
app.on('window-all-closed', () => {});                     // keep running in the tray
