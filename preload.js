// The only bridge between the page and the app. Pages get these few calls and nothing else.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cityPulse', {
  openFull: () => ipcRenderer.send('open-full'),
  openSettings: () => ipcRenderer.send('open-settings'),
  closeWindow: () => ipcRenderer.send('close-window'),
  volume: () => ipcRenderer.invoke('volume'),           // { vol 0..1, mute, id } of the Windows default output
  outputs: () => ipcRenderer.invoke('outputs'),         // [{ id, name, default }]
  setOutput: id => ipcRenderer.invoke('set-output', id),
});
