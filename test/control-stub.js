// A stand-in for the app's bridge in test/control.js: two screens; __setState pushes a new state as the app would.
const { contextBridge } = require('electron');
let goto = null, onState = null;
const state = { fullMode: 'off', wallMode: 'span', wallScreen: null, widgetShown: true,
  screens: [{ index: 0, label: 'Left', w: 1920, h: 1080 }, { index: 1, label: 'Right', w: 1920, h: 1080 }] };
contextBridge.exposeInMainWorld('cityPulse', {
  platform: 'win32', volume: async () => null, sources: async () => [], onSources() {}, onAudio() {},
  control: { open() {}, state: async () => state, onState: cb => { onState = cb; }, setFull() {}, setWall() {}, setWidget() {}, onGoto: cb => { goto = cb; } },
});
contextBridge.exposeInMainWorld('__goto', x => goto(x));
contextBridge.exposeInMainWorld('__setState', x => onState({ ...state, ...x }));
