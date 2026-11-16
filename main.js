// Desktop widget: small, frameless, transparent, always-on-top window in the
// bottom-right corner that listens to system audio automatically (see index.html, ?widget=1).
const { app, BrowserWindow, screen, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// The only page this app ever shows. Anything else is refused.
const INDEX = pathToFileURL(path.join(__dirname, 'index.html')).href;
// (file: URLs have origin "null", so compare the URL with its query and hash cut off)
const isOurs = url => { try { const u = new URL(url); return u.protocol === 'file:' && u.href.split(/[?#]/)[0] === INDEX; } catch { return false; } };
const SAFE_PREFS = { contextIsolation: true, sandbox: true, nodeIntegration: false };

// Every window (including the full-screen one): no navigating away, no pop-ups except our own full-screen view.
app.on('web-contents-created', (_, wc) => {
  wc.on('will-navigate', (e, url) => { if (!isOurs(url)) e.preventDefault(); });
  // Full screen opens on whichever display the widget is sitting on: drag the widget to the TV, press full screen.
  const targetDisplay = () => {
    const owner = BrowserWindow.fromWebContents(wc);
    return screen.getDisplayMatching(owner ? owner.getBounds() : screen.getPrimaryDisplay().bounds);
  };
  wc.setWindowOpenHandler(({ url }) => {
    if (!isOurs(url) || new URL(url).searchParams.get('full') !== '1') return { action: 'deny' };
    const { bounds } = targetDisplay();
    return { action: 'allow', overrideBrowserWindowOptions: {
      ...bounds, show: false, frame: false, backgroundColor: '#05060c', title: 'City Pulse', autoHideMenuBar: true,
      webPreferences: SAFE_PREFS,
    } };
  });
  // Windows can drop a window created already-full-screen onto another display, so place it first, then go full screen.
  wc.on('did-create-window', child => {
    const { bounds } = targetDisplay();
    child.setBounds(bounds);
    child.setFullScreen(true);
    child.show();
  });
});

app.whenReady().then(() => {
  // Microphone and system-audio capture ('display-capture') are allowed for our own page only; everything else is refused.
  const ses = session.defaultSession, AUDIO = ['media', 'display-capture'];
  ses.setPermissionRequestHandler((wc, perm, cb, details) => cb(AUDIO.includes(perm) && isOurs(details.requestingUrl || wc.getURL())));
  ses.setPermissionCheckHandler((wc, perm, origin) => AUDIO.includes(perm) && (isOurs(wc ? wc.getURL() : '') || origin === 'file:///'));

  const w = 420, h = 240, { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: w, height: h,
    x: workArea.x + workArea.width - w - 16,
    y: workArea.y + workArea.height - h,
    frame: false, transparent: true, resizable: true,
    alwaysOnTop: true, hasShadow: false,
    title: 'City Pulse',
    webPreferences: SAFE_PREFS,
  });
  win.loadFile(path.join(__dirname, 'index.html'), { query: { widget: '1' } });
});

app.on('window-all-closed', () => app.quit());
