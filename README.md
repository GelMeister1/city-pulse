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
- **Listen to anything:** choose any output (speakers, headphones, TV) or input (microphone, line-in). City Pulse listens to that device directly, so you never have to change your Windows default. "Default output" follows whatever Windows is playing through.
- **Calm when quiet:** with no music playing, the city sits still.
- **Loudness meter:** tops out at your Windows volume, so at 50% volume it peaks halfway.
- **Skylines:**
  - **12 real cities** with hand-drawn landmarks: New York, Chicago, Seattle, San Francisco, Toronto, Dubai, Paris, London, Tokyo, Sydney, Hong Kong and Shanghai.
  - **13 themed cities**: Neon City, Cyberpunk, Noir City, Synthwave, Aero, Atlantis, Abyssal City, Aurora Harbor, Lantern District, Desert Mirage, Brasshaven, Lunar Colony and Neon Strip. Each has its own sky, ground, creatures or machines, and something unique that moves with the music.
- **Light styles:**
  - **Floors:** an equalizer that climbs each building, with a falling peak marker.
  - **Pulse:** each building's windows follow the volume.
  - **Beat flash:** a building lights up on a hit, then fades.
  - **Fill by loudness:** buildings rise with how loud the song really is, so a quiet song gives a low city and a loud chorus a tall one.
  - **City line:** one flat height for the whole city. Buildings light up to the same real height and the peaks line up level. Drag the dotted line on screen, or use the slider in Settings.
  - A **Reactivity** slider runs from calm (smooth swells, for background viewing) to wild (instant and punchy, for parties). Every building keeps reacting at any setting.
- **Color effects:** Spectrum, Wave, Fade, Solid, Breathing, Random and Smooth random, plus a brightness slider.
- **Scene:**
  - a street with traffic, a park, or a thin river with reflections
  - a hazy back skyline and 3D building detail
- **Weather:** rain, snow, thunderstorms (lightning on the bass), fog, cherry blossoms and autumn leaves.
- **Ambient motion:** each item can be switched on or off: blinking roof lights, windows switching on and off, searchlights, stars, shooting stars, moon, clouds, planes and flying cars.
- **Views:**
  - **Fit:** shows whole buildings only.
  - **Pan:** drag or scroll to choose your part of the city.
  - **Tour:** slowly scrolls through every city, real and themed, with name captions. Made for a TV. Choose the speed and direction (right to left or left to right).
- **Presets:** four built in (Lounge, Chill Night, Party, Neon Tour). Your own presets are shared between the widget and full screen.
- **TV-friendly:**
  - full screen opens on whichever display the widget is on
  - **multiple screens:** full screen and the live wallpaper can each run on all screens, with either **its own city on each screen** or **one tour across all of them**. In the tour, cities scroll from screen to screen, and each screen shows its own city name.
  - the controls auto-hide
  - optional burn-in protection creeps the picture a few pixels over about 20 minutes
- **Control Center:** a window you can keep open on any screen. It has the audio source, full screen and wallpaper modes, a city for each screen, a **Tour on every screen** button, and links to every settings window. Click the tray icon, the ☰ button, or launch City Pulse again to open it.
- **Lives in the tray:** no taskbar button. The tray icon by the clock shows or hides the widget, and also has full screen, Settings, Start with Windows and Quit.
- **Live wallpaper (experimental):** puts City Pulse behind your desktop icons on the display you choose, with its own look (tray → Wallpaper settings…). It relies on an unofficial Windows feature, so a future Windows update could break it. If that happens, it switches itself off.

## Install (Windows)

Download `City-Pulse-Setup-x.y.z.exe` from Releases and run it. It adds Start-menu and desktop shortcuts.

The exe isn't code-signed yet, so Windows SmartScreen may warn on first run. Choose **More info → Run anyway**.

### Updates

City Pulse updates itself, so you never need to download a new installer.
- It checks for a new version when it starts and every 6 hours.
- A new version downloads in the background and installs the next time City Pulse restarts. To install it straight away, use the tray's **Restart to update**.
- There's only ever one copy installed. Running a newer installer by hand also replaces the old version and keeps your settings and presets.

### Uninstall

Use the tray's **Uninstall City Pulse…**, or go to Windows **Settings → Apps → Installed apps → City Pulse → Uninstall**. Either one removes:
- the app
- its settings and presets
- its Start with Windows entry

## Use

- The widget opens in the bottom-right corner. Hover over it to show the toolbar, drag the toolbar to move the widget, and drag the edges to resize it. **✕** tucks it into the tray.
- **⛶ Full screen** opens the big view on the widget's display: drag the widget to your TV first. **Esc** always closes full screen, on every screen at once, even when it covers the taskbar.
- **⚙ Settings** opens a settings window with presets plus the Skyline, Lights, Scene, Weather and Ambient sections. Changes apply to the widget live. In full screen, ⚙ opens the panel on screen instead.
- **Right-click the tray icon** for full screen, separate settings for the widget, full screen and wallpaper, Live wallpaper, Start with Windows, Check for updates, Uninstall and Quit.
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

The installer is written to `dist/`.

## Publish a new version (maintainers)

1. Bump `"version"` in `package.json`, for example from 0.2.0 to 0.2.1.
2. Run the release script with a GitHub token:

```bash
GH_TOKEN=$(gh auth token) npm run release
```

This builds the installer and publishes it as a GitHub Release, together with `latest.yml`, the file installed copies check to find updates. Every installed copy then updates itself.

Automatic updates need the repository to be **public**, because installed copies read the Releases page without signing in.

## Notes

City skylines and landmarks are simplified illustrations. The project isn't affiliated with any city, building owner or brand.

## License

[MIT](LICENSE)
