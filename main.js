// City Pulse app: a tray icon, the desktop widget, a full-screen view, a settings window and an
// experimental live wallpaper. The visualizer itself is index.html; windows differ only by URL flags.
const { app, BrowserWindow, screen, session, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const win32 = require('./winhelper');
const { autoUpdater } = require('electron-updater');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Chromium stops painting windows it thinks are covered; the live wallpaper sits behind the desktop, so it always looks covered.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
if (!app.requestSingleInstanceLock()) app.quit();           // one City Pulse at a time; a second launch shows the widget

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

let tray, widget, full, settings, wall;

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
  widget.on('close', e => { if (!app.quitting) { e.preventDefault(); widget.hide(); } });   // ✕ tucks it into the tray
}

// Full screen opens on whichever display the widget is on: drag the widget to the TV, press full screen.
function openFull() {
  if (full && !full.isDestroyed()) return full.focus();
  const d = displayOf(widget);
  full = new BrowserWindow({ ...d.bounds, show: false, frame: false, backgroundColor: '#05060c', skipTaskbar: true,
    title: 'City Pulse', icon: ICON, autoHideMenuBar: true, webPreferences: PREFS });
  load(full, { full: '1' });
  full.once('ready-to-show', () => { full.setBounds(d.bounds); full.setFullScreen(true); full.show(); });   // place first: Windows can move a window created already full screen
}

function openSettings() {
  if (settings && !settings.isDestroyed()) return settings.focus();
  settings = new BrowserWindow({ width: 380, height: 760, minWidth: 320, title: 'City Pulse Settings', icon: ICON,
    autoHideMenuBar: true, backgroundColor: '#0b0e1c', webPreferences: PREFS });
  load(settings, { settings: '1' });
}

// Experimental live wallpaper: a full-screen view parented behind the desktop icons on one display.
async function setWallpaper(displayId) {
  if (wall && !wall.isDestroyed()) { wall.destroy(); wall = null; await win32.refreshWallpaper(); }
  prefs.wallpaper = displayId || null; savePrefs();
  const d = displayId && screen.getAllDisplays().find(x => x.id === displayId);
  if (d) {
    const all = screen.getAllDisplays(), vx = Math.min(...all.map(x => x.bounds.x)), vy = Math.min(...all.map(x => x.bounds.y));
    wall = new BrowserWindow({ ...d.bounds, show: false, frame: false, skipTaskbar: true, focusable: false,
      backgroundColor: '#05060c', title: 'City Pulse Wallpaper', webPreferences: { ...PREFS, backgroundThrottling: false } });
    load(wall, { full: '1', wall: '1' });
    wall.once('ready-to-show', async () => {
      const hwnd = wall.getNativeWindowHandle().readBigUInt64LE(0), rel = { x: d.bounds.x - vx, y: d.bounds.y - vy, width: d.bounds.width, height: d.bounds.height };
      const res = await win32.wallpaper(hwnd, rel);
      if (!res || !res.ok) {                              // Windows didn't allow it: back out quietly
        wall.destroy(); wall = null; prefs.wallpaper = null; savePrefs();
        tray.displayBalloon?.({ title: 'City Pulse', content: 'Live wallpaper isn’t available on this version of Windows.' });
      } else {
        wall.showInactive();                              // tell Chromium it's visible so it actually draws (it was black before)
        await win32.wallpaper(hwnd, rel);                 // and re-seat it in case showing moved it
      }
      updateTray();
    });
  }
  updateTray();
}

// ---- updates: one installed copy that keeps itself current ----
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

// ---- uninstall: runs the app's own uninstaller (also in Windows Settings → Apps) ----
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
  const displays = screen.getAllDisplays();
  const shown = widget && !widget.isDestroyed() && widget.isVisible();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: shown ? 'Hide widget' : 'Show widget', click: () => { shown ? widget.hide() : widget.show(); updateTray(); } },
    { label: 'Full screen (on the widget’s display)', click: openFull },
    { label: 'Settings…', click: openSettings },
    { type: 'separator' },
    { label: 'Live wallpaper (experimental)', submenu: [
      { label: 'Off', type: 'radio', checked: !prefs.wallpaper, click: () => setWallpaper(null) },
      ...displays.map((d, i) => ({ label: `Display ${i + 1}: ${d.label || ''} (${d.bounds.width}×${d.bounds.height})`,
        type: 'radio', checked: prefs.wallpaper === d.id, click: () => setWallpaper(d.id) })),
    ] },
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

// Page → app calls. Only our own page may use them.
const fromUs = e => isOurs(e.senderFrame && e.senderFrame.url);
ipcMain.on('open-full', e => { if (fromUs(e)) openFull(); });
ipcMain.on('open-settings', e => { if (fromUs(e)) openSettings(); });
ipcMain.on('close-window', e => { if (fromUs(e)) BrowserWindow.fromWebContents(e.sender)?.close(); });
ipcMain.handle('volume', e => fromUs(e) ? win32.volume() : null);
ipcMain.handle('outputs', e => fromUs(e) ? win32.outputs() : null);
ipcMain.handle('set-output', (e, id) => fromUs(e) ? win32.setDefault(id) : null);

app.on('second-instance', () => { widget?.show(); updateTray(); });

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
  tray.on('click', () => { widget.isVisible() ? widget.hide() : widget.show(); updateTray(); });
  widget.on('show', updateTray); widget.on('hide', updateTray);
  updateTray();
  if (prefs.wallpaper) setWallpaper(prefs.wallpaper);
  setupUpdates();
  screen.on('display-added', updateTray); screen.on('display-removed', updateTray);
});

// Leaving: take the wallpaper down and repaint the normal one, then stop the helper.
app.on('before-quit', e => {
  app.quitting = true;
  if (wall && !wall.isDestroyed()) {
    e.preventDefault();
    wall.destroy(); wall = null;
    // never let a slow wallpaper repaint hold up quitting
    Promise.race([win32.refreshWallpaper(), new Promise(r => setTimeout(r, 3000))]).finally(() => { win32.stop(); app.quit(); });
  } else win32.stop();
});
app.on('window-all-closed', () => {});                     // keep running in the tray
