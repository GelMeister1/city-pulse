// The only bridge between the page and the app. Pages get these few calls and nothing else.
const { contextBridge, ipcRenderer } = require('electron');
const listen = (channel, cb) => ipcRenderer.on(channel, (_, v) => cb(v));

contextBridge.exposeInMainWorld('cityPulse', {
  openFull: () => ipcRenderer.send('open-full'),
  openSettings: () => ipcRenderer.send('open-settings'),
  closeWindow: () => ipcRenderer.send('close-window'),
  volume: () => ipcRenderer.invoke('volume'),            // { vol 0..1, mute, id } of the Windows default output
  // Audio: the app captures one source natively and sends every window ~60 frames a second.
  onAudio: cb => listen('audio-frame', cb),              // { bins: Uint8Array(1024), peak, source }
  sources: () => ipcRenderer.invoke('sources'),          // [{ id, name, kind: 'output'|'input', selected }]
  setSource: id => ipcRenderer.invoke('set-source', id), // shared by all windows
  onSources: cb => listen('sources', cb),
  control: {
    open: () => ipcRenderer.send('open-control'),
    state: () => ipcRenderer.invoke('control-state'),    // { fullMode, wallMode, wallScreen, widgetShown, screens: [{ index, label, w, h }] }
    onState: cb => listen('control-state', cb),
    setFull: mode => ipcRenderer.send('control-full', mode),            // 'off' | 'one' | 'per' | 'span'
    setWall: (mode, screen) => ipcRenderer.send('control-wall', mode, screen),
    setWidget: shown => ipcRenderer.send('control-widget', !!shown),
    openSettings: (target, screen) => ipcRenderer.send('control-settings', target, screen),
  },
});
