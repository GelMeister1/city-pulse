# City Pulse

A night-time city skyline whose windows pulse to your music. Run it as a small always-on-top widget in the corner of your desktop, or full screen on a TV while you have people over.

![New York skyline with windows lit like an equalizer](docs/skyline.png)

| Cyberpunk | Synthwave |
| --- | --- |
| ![Cyberpunk city with neon signs, hologram billboards and rain](docs/cyberpunk.png) | ![Synthwave city with a striped sunset and neon grid](docs/synthwave.png) |

## Features

- **Listens to whatever your PC is playing.** In the app, system audio is picked up automatically.
  - The song is split into 8 bands, from bass to treble (Bass, Kick, Low-mid, Mid, Upper-mid, Presence, Treble, Air).
  - Each building is assigned one band for good. Landmarks are spread from bass to treble, so each famous building owns a clear part of the song.
  - Buildings on the same band move together.
- **Pick your output:** the audio menu lists your speakers, headphones and monitors, like Windows sound settings. Picking one makes it the Windows default, and City Pulse follows it.
- **Loudness meter:** tops out at your Windows volume, so at 50% volume it peaks halfway.
- **Skylines:** New York, Chicago, Seattle, San Francisco, Dubai, Paris, Tokyo and London, each with hand-drawn landmarks. There are also four made-up cities: Neon City, Cyberpunk, Noir City and Synthwave.
- **Light styles:**
  - **Floors:** an equalizer that climbs each building, with a falling peak marker.
  - **Pulse:** each building's windows follow the volume.
  - **Beat flash:** a building lights up on a hit, then fades.
  - A **Reactivity** slider runs from calm (smooth swells, for background viewing) to wild (instant and punchy, for parties). Every building keeps reacting at any setting.
- **Color effects:** Spectrum, Wave, Fade, Solid, Breathing and Random, plus a brightness slider.
- **Scene:**
  - a street with traffic, a park, or a thin river with reflections
  - a hazy back skyline and 3D building detail
- **Weather:** rain, snow, thunderstorms (lightning on the bass), fog, cherry blossoms and autumn leaves.
- **Ambient motion:** each item can be switched on or off: blinking roof lights, windows switching on and off, searchlights, stars, shooting stars, moon, clouds, planes and flying cars.
- **Views:**
  - **Fit:** shows whole buildings only.
  - **Pan:** drag or scroll to choose your part of the city.
  - **Tour:** slowly scrolls through every city with name captions, made for a TV.
- **Presets:** four built in (Background, Chill Night, Party, Neon Tour). Your own presets are shared between the widget and full screen.
- **TV-friendly:**
  - full screen opens on whichever display the widget is on
  - the controls auto-hide
  - optional burn-in protection creeps the picture a few pixels over about 20 minutes
- **Lives in the tray:** no taskbar button. The tray icon by the clock shows or hides the widget, and also has full screen, Settings, Start with Windows and Quit.
- **Live wallpaper (experimental):** puts City Pulse behind your desktop icons on the display you choose. It relies on an unofficial Windows feature, so a future Windows update could break it. If that happens, it switches itself off.

## Install (Windows)

Download `City-Pulse-Setup-x.y.z.exe` (installer with Start-menu and desktop shortcuts) or `City-Pulse-Portable-x.y.z.exe` (runs without installing) from Releases, or build them yourself (see below).

The exe isn't code-signed yet, so Windows SmartScreen may warn on first run. Choose **More info → Run anyway**.

## Use

- The widget opens in the bottom-right corner. Hover over it to show the toolbar, drag the toolbar to move the widget, and drag the edges to resize it. **✕** tucks it into the tray.
- **⛶ Full screen** opens the big view on the widget's display: drag the widget to your TV first. Press **Esc** to close it.
- **⚙ Settings** opens a settings window with presets plus the Skyline, Lights, Scene, Weather and Ambient sections. Changes apply to the widget live. In full screen, ⚙ opens the panel on screen instead.
- **Right-click the tray icon** for full screen, Settings, Live wallpaper, Start with Windows and Quit.
- Keyboard shortcuts:

| Key | Action |
| --- | --- |
| F | Full screen |
| M | Light style |
| C | Color effect |
| V | View |
| W | Weather |

## Run from source

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm start
```

If the app doesn't start after `npm install`, Electron's download step was probably blocked. Newer npm versions skip install scripts by default. Run it yourself:

```bash
node node_modules/electron/install.js
```

You can also open `index.html` straight in a browser for the full-screen version. Use **🔊 Share audio** and tick "Share audio" in the picker. The browser version has no tray, output menu or wallpaper; those need the app.

## Build the exe

```bash
npm run dist
```

The installer and the portable exe are written to `dist/`.

## Notes

City skylines and landmarks are simplified illustrations. The project isn't affiliated with any city, building owner or brand.

## License

[MIT](LICENSE)
