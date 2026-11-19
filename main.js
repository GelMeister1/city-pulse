// The visualizer itself is index.html; windows differ only by URL flags.
const { app, BrowserWindow, screen, session, ipcMain, Tray, Menu, nativeImage, dialog, globalShortcut, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const win32 = require('./winhelper');
const audiocap = require('./audiocap');
const { autoUpdater } = require('electron-updater');
// On a Mac the pages listen to an input themselves (see index.html), the wallpaper is a desktop-level window, and updates
// are downloaded by hand: an unsigned Mac app can't update itself.
const MAC = process.platform === 'darwin';
const RELEASES = 'https://github.com/GelMeister1/city-pulse/releases/latest';

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Chromium stops painting windows it thinks are covered; the live wallpaper sits behind the desktop, so it always looks covered.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
if (!app.requestSingleInstanceLock()) app.quit();

// The only page this app ever shows. Anything else is refused.
const isOurs = require('./isours')(pathToFileURL(path.join(__dirname, 'index.html')).href);
const PREFS = { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') };
const ICON = path.join(__dirname, 'assets', 'icon.png');
const load = (win, query) => win.loadFile(path.join(__dirname, 'index.html'), { query });

// Small app preferences kept outside the page (which display the wallpaper uses).
const prefsFile = () => path.join(app.getPath('userData'), 'app-prefs.json');
let prefs = {};
const savePrefs = () => { try { fs.writeFileSync(prefsFile(), JSON.stringify(prefs)); } catch {} };

let tray, widget, control;
let fulls = [], walls = [];                                  // one per screen in multi-screen modes

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
const alive = list => list.filter(w => !w.isDestroyed());

// Multi-screen modes, shared by full screen and the wallpaper:
//   one  - a single screen (full screen: the widget's screen; wallpaper: the chosen screen)
//   per  - every screen, each with its own city and settings
//   span - every screen showing one continuous tour that scrolls from screen to screen
// wall: the city stays above the taskbar, so each screen is described by the height above it.
const insetOf = d => Math.max(0, d.bounds.y + d.bounds.height - (d.workArea.y + d.workArea.height));
function windowsFor(mode, oneDisplay, wall = false) {
  const list = screensLR(), inset = d => (wall ? { inset: String(insetOf(d)) } : {});
  if (mode === 'one') return [{ d: oneDisplay, query: inset(oneDisplay) }];
  const sizes = list.map(d => `${d.bounds.width}x${d.bounds.height - (wall ? insetOf(d) : 0)}`).join(',');
  return list.map((d, i) => ({ d, query: { mode, screen: String(i), screens: sizes, ...inset(d) } }));
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
      w.setBounds(d.bounds);                              // place first: Windows can move a window created already full screen
      MAC ? w.setSimpleFullScreen(true) : w.setFullScreen(true);   // simple: no separate Space per screen on a Mac
      d.id === home.id ? w.show() : w.showInactive();      // keyboard focus goes to the widget's screen
    });
    w.on('closed', () => { if (!alive(fulls).length) closeFull(); });
    return w;
  });
  // Full screen on every screen covers the taskbar and tray too, so Esc must always get you out, whichever window has focus.
  // It's claimed only then: on one screen the window's own Esc works and other apps keep theirs.
  if (mode !== 'one') globalShortcut.register('Escape', closeFull);
  if (control && !control.isDestroyed()) control.setAlwaysOnTop(true, 'screen-saver');   // the Control Center stays reachable
  updateTray();
}
function closeFull() {
  globalShortcut.unregister('Escape');
  alive(fulls).forEach(w => w.close()); fulls = [];
  if (control && !control.isDestroyed()) control.setAlwaysOnTop(false);
  updateTray();
}

// Every way into settings (the widget's gear, the tray) opens the Control Center at its Customize step for that target.
function openSettings(target = 'widget') {
  openControl();
  const go = () => control.webContents.send('control-goto', { target });
  control.webContents.isLoading() ? control.webContents.once('did-finish-load', go) : go();   // a new window is still loading
  raise(control);
}
// Settings must sit above full screen, which otherwise covers it and swallows the clicks.
function raise(w) { if (alive(fulls).length) w.setAlwaysOnTop(true, 'screen-saver'); w.show(); w.focus(); }

// prefs.wall = { mode: 'off' | 'one' | 'per' | 'span', display: id (for 'one') }
// Calls run one at a time: a second call during the old windows' teardown would otherwise build a set nobody tracks.
let wallJob = Promise.resolve();
const setWallpaper = cfg => (wallJob = wallJob.catch(() => {}).then(() => applyWallpaper(cfg)));
// Take the wallpaper windows down. They are child windows of Explorer's desktop layer, and destroying them there makes this
// process wait on Explorer (the Control Center stops painting meanwhile), so the helper first hands each one back as a
// hidden top-level window. Then the normal wallpaper is repainted. Neither step may hold things up for long.
async function releaseWalls() {
  const old = alive(walls); walls = [];
  if (!old.length) return;
  const hwnd = w => w.getNativeWindowHandle().readBigUInt64LE(0), soon = ms => new Promise(r => setTimeout(r, ms));
  if (!MAC) await Promise.race([Promise.all(old.map(w => win32.unwall(hwnd(w)))), soon(2000)]);
  old.forEach(w => { if (!w.isDestroyed()) w.destroy(); });
  await Promise.race([win32.refreshWallpaper(), soon(3000)]);
}
async function applyWallpaper(cfg) {
  await releaseWalls();
  prefs.wall = cfg; savePrefs();
  const one = cfg.mode === 'one' && screen.getAllDisplays().find(x => x.id === cfg.display);
  if (cfg.mode === 'off' || (cfg.mode === 'one' && !one)) return updateTray();
  // Windows places the window in physical pixels, measured from the top-left of the whole desktop; Electron's display
  // bounds are scaled (DIP). Convert, so a monitor at 125% or 150%, or a mix of scalings, is still covered edge to edge.
  const phys = r => (MAC ? r : screen.dipToScreenRect(null, r));
  const all = screen.getAllDisplays().map(x => phys(x.bounds)), vx = Math.min(...all.map(b => b.x)), vy = Math.min(...all.map(b => b.y));
  walls = windowsFor(cfg.mode, one, true).map(({ d, query }) => {
    const w = new BrowserWindow({ ...d.bounds, show: false, frame: false, thickFrame: false, resizable: false, skipTaskbar: true, focusable: false,
      backgroundColor: '#05060c', title: 'City Pulse Wallpaper', ...(MAC ? { type: 'desktop' } : {}), webPreferences: { ...PREFS, backgroundThrottling: false } });
    load(w, { full: '1', wall: '1', ...query });
    w.once('ready-to-show', async () => {
      if (w.isDestroyed()) return;
      if (MAC) { w.setVisibleOnAllWorkspaces(true); return w.showInactive(); }   // type 'desktop' already sits behind the icons
      const hwnd = w.getNativeWindowHandle().readBigUInt64LE(0), pb = phys(d.bounds), rel = { x: pb.x - vx, y: pb.y - vy, width: pb.width, height: pb.height };
      const res = await win32.wallpaper(hwnd, rel);
      if (w.isDestroyed() || !res) return;                // replaced meanwhile, or the helper restarted (it isn't a "no")
      if (!res.ok) {                                      // Windows didn't allow it: back out quietly
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
  if (MAC) return;
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
    default: return MAC ? { label: 'Check for updates…', click: () => shell.openExternal(RELEASES) } : { label: 'Check for updates', click: () => checkForUpdates(true) };
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
  if (control && !control.isDestroyed()) control.webContents.send('control-state', controlState());
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Control Center…', click: openControl },
    { label: shown ? 'Hide widget' : 'Show widget', click: () => { shown ? widget.hide() : widget.show(); updateTray(); } },
    { label: 'Full screen', submenu: [
      { label: 'Off', type: 'radio', checked: !fullOpen, click: closeFull },   // exactly one of these is ticked
      { label: 'On the widget’s screen', type: 'radio', checked: fullOpen && fm === 'one', click: () => { closeFull(); openFull('one'); } },
      { label: 'All screens: own city each', type: 'radio', checked: fullOpen && fm === 'per', click: () => { closeFull(); openFull('per'); } },
      { label: 'All screens: one tour across', type: 'radio', checked: fullOpen && fm === 'span', click: () => { closeFull(); openFull('span'); } },
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
      { label: 'Full screen…', click: () => openSettings('full') },     // the Control Center offers the screens the running mode has
      { label: 'Wallpaper…', click: () => openSettings('wall') },
    ] },
    { type: 'separator' },
    { label: MAC ? 'Open at login' : 'Start with Windows', type: 'checkbox', enabled: app.isPackaged, checked: app.getLoginItemSettings(LOGIN).openAtLogin,
      click: m => app.setLoginItemSettings({ ...LOGIN, openAtLogin: m.checked }) },
    { type: 'separator' },
    { label: `City Pulse ${app.getVersion()}`, enabled: false },
    updateMenuItem(),
    ...(MAC ? [] : [{ label: 'Uninstall City Pulse…', click: uninstall }]),   // on a Mac: drag the app to the Bin
    { type: 'separator' },
    { label: 'Quit City Pulse', click: () => app.quit() },
  ]));
}

// One native capture, sent to every window that draws a city.
// prefs.source = { id, input }: id '' = the Windows default output (followed if it changes).
// If the chosen device fails, this session falls back to the default output; the saved choice is tried again next launch.
let stopCapture = null, captureKey = '', defaultOut = null, retry = null, fellBack = false, backoff = 3000, sysVol = null;
const cityWindows = () => [widget, ...fulls, ...walls].filter(w => w && !w.isDestroyed());
const currentSource = () => (!fellBack && prefs.source) || { id: '', input: false };
function startCapture() {
  if (MAC) return;
  const src = currentSource(), key = `${src.input}:${src.id}:${src.id ? '' : defaultOut}`;
  if (stopCapture && key === captureKey) return;
  stopCapture?.(); captureKey = key; clearTimeout(retry);
  stopCapture = audiocap.start(src.id, src.input,
    f => { backoff = 3000; const frame = { bins: f.bins, peak: f.peak, source: src.id }; for (const w of cityWindows()) w.webContents.send('audio-frame', frame); },
    () => {                                              // device unplugged or capture failed: back to the default output, try again
      stopCapture = null; captureKey = '';
      if (src.id) { fellBack = true; broadcastSources(); }
      retry = setTimeout(startCapture, backoff);
      backoff = Math.min(60000, backoff * 2);            // each try compiles the C# helper: don't do that every 3 s for days
    });
}
async function sourceList() {
  const [outs, ins] = await Promise.all([win32.outputs(), win32.inputs()]), cur = currentSource();
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
  prefs.source = { id: match.id, input: match.kind === 'input' }; savePrefs(); fellBack = false; backoff = 3000;
  startCapture(); broadcastSources();
  return true;
}
// Read once here for every window: the meter's volume and the default output to follow.
let watching = false;                                      // one read at a time: a stalled helper mustn't pile up reads
async function watchDefault() {
  if (watching) return; watching = true;
  const v = await win32.volume().finally(() => { watching = false; });
  sysVol = v;
  if (v && v.id !== defaultOut) { defaultOut = v.id; if (!currentSource().id) startCapture(); broadcastSources(); }
}

function openControl() {
  if (control && !control.isDestroyed()) { control.show(); return control.focus(); }
  const d = displayOf(widget), wa = d.workArea, b = prefs.controlBounds;
  const onScreen = b && screen.getAllDisplays().some(x => b.x >= x.workArea.x && b.y >= x.workArea.y && b.x < x.workArea.x + x.workArea.width && b.y < x.workArea.y + x.workArea.height);
  control = new BrowserWindow({ width: 460, height: Math.min(900, wa.height - 40), minWidth: 380,
    ...(onScreen ? { x: b.x, y: b.y } : { x: Math.round(wa.x + (wa.width - 460) / 2), y: Math.round(wa.y + 20) }),
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
ipcMain.handle('volume', e => fromUs(e) ? sysVol : null);
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
  watchDefault(); setInterval(watchDefault, 500);
  widget.on('show', updateTray); widget.on('hide', updateTray);
  updateTray();
  if (prefs.wall && prefs.wall.mode !== 'off') setWallpaper(prefs.wall);
  setupUpdates();
  // Screens added, removed, resized or rescaled, or the taskbar moved: rebuild the wallpaper and full screen to fit.
  // Waits a moment, since Windows sends a burst of these while it rearranges.
  let rearrangeTimer;
  const rearranged = () => { clearTimeout(rearrangeTimer); rearrangeTimer = setTimeout(() => {
    if (prefs.wall && prefs.wall.mode !== 'off') setWallpaper(prefs.wall);
    if (alive(fulls).length) { const mode = prefs.fullMode; closeFull(); openFull(mode); }   // the tour needs the new list of screens
    updateTray();
  }, 800); };
  screen.on('display-added', rearranged); screen.on('display-removed', rearranged);
  screen.on('display-metrics-changed', (_, d, changed) => { if (changed.some(c => ['bounds', 'workArea', 'scaleFactor'].includes(c))) rearranged(); });
});

app.on('before-quit', e => {
  app.quitting = true;
  stopCapture?.(); clearTimeout(retry);
  if (alive(walls).length) {
    e.preventDefault();
    releaseWalls().finally(() => { win32.stop(); app.quit(); });   // each step is capped, so quitting is never held up long
  } else win32.stop();
});
app.on('window-all-closed', () => {});                     // keep running in the tray
