// Desktop widget: small, frameless, transparent, always-on-top window in the
// bottom-right corner that listens to system audio automatically (see index.html, ?widget=1).
const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(() => {
  const w = 420, h = 240, { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: w, height: h,
    x: workArea.x + workArea.width - w - 16,
    y: workArea.y + workArea.height - h,
    frame: false, transparent: true, resizable: true,
    alwaysOnTop: true, hasShadow: false,
    title: 'City Pulse',
  });
  win.loadFile(path.join(__dirname, 'index.html'), { query: { widget: '1' } });

  // The widget's ⛶ button opens index.html?full=1: a full-screen window, preferably on another
  // display (a TV or second monitor). Same app, so presets are shared through localStorage.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('full=1')) return { action: 'deny' };
    const here = screen.getDisplayMatching(win.getBounds());
    const target = screen.getAllDisplays().find(d => d.id !== here.id) || here;
    return { action: 'allow', overrideBrowserWindowOptions: {
      x: target.bounds.x, y: target.bounds.y, width: target.bounds.width, height: target.bounds.height,
      fullscreen: true, frame: false, backgroundColor: '#05060c', title: 'City Pulse', autoHideMenuBar: true,
    } };
  });
});

app.on('window-all-closed', () => app.quit());
