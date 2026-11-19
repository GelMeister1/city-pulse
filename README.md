# City Pulse

A night-time city skyline whose windows pulse to your music. Run it as a small always-on-top widget in the corner of your desktop, or full screen on a TV while you have people over.

![New York skyline with windows lit like an equalizer](docs/skyline.png)

| Cyberpunk | Synthwave |
| --- | --- |
| ![Cyberpunk city with neon signs, hologram billboards and rain](docs/cyberpunk.png) | ![Synthwave city with a striped sunset and neon grid](docs/synthwave.png) |

**Beat flash:** buildings light up on their part of the beat and go dark in between.

![Chicago skyline with some buildings lit and others dark on the beat](docs/beat.png)

| Shanghai: Floors with random colors, during a loud song | Dark Night City in the rain: one solid color |
| --- | --- |
| ![Shanghai skyline with buildings filled almost to the top in random colors](docs/shanghai.png) | ![Dark Night City in grey rain with every window in one dark teal](docs/noir.png) |

**Pan view:** the city keeps going past the screen edges. Drag or scroll to choose your part of it.

| Abyssal City | Aero |
| --- | --- |
| ![Underwater city with glass domes and jellyfish, buildings running off both edges](docs/abyssal.png) | ![Bright daytime city of white glass towers, buildings running off both edges](docs/aero.png) |

## Features

- **Listens to whatever your PC is playing.** On Windows, system audio is picked up automatically. On a Mac, see [Listening on a Mac](#listening-on-a-mac).
  - The song is split into 8 bands, from bass to treble (Bass, Kick, Low-mid, Mid, Upper-mid, Presence, Treble, Air).
  - Each building is assigned one band for good. Landmarks are spread from bass to treble, so each famous building owns a clear part of the song.
  - Buildings on the same band move together.
- **Listen to anything (Windows):** choose any output (speakers, headphones, TV) or input (microphone, line-in). City Pulse listens to that device directly, so you never have to change your Windows default. "Default output" follows whatever Windows is playing through.
- **Calm when quiet:** with no music playing, the city sits still.
- **Loudness meter:** on Windows, tops out at your Windows volume, so at 50% volume it peaks halfway.
- **Skylines:**
  - **14 real cities** with hand-drawn landmarks: Charlotte, Chicago, Dubai, Hong Kong, London, New York, Paris, San Francisco, Seattle, Shanghai, Sydney, Tampa, Tokyo and Toronto. New York is the first one you see.
  - **16 themed cities**: Abyssal City, Aero, Atlantis, Aurora Harbor, Brasshaven, Christmas Village, Cyberpunk, Dark Night City, Desert Mirage, The Grid, Jungle City, Lantern District, Lunar Colony, Neon City, Neon Strip and Synthwave. Each has its own sky, ground, creatures or machines, and something unique that moves with the music.
- **Light styles:**
  - **Floors:** an equalizer that climbs each building, with a falling peak marker.
  - **Pulse:** each building's windows follow the volume.
  - **Beat flash:** a building lights up on a hit, then fades.
  - **Fill by loudness:** buildings rise with how loud the song really is, so a quiet song gives a low city and a loud chorus a tall one.
  - **City line:** one flat height for the whole city. Buildings light up to the same real height and the peaks line up level. Drag the dotted line on screen, or use the slider in Settings.
  - A **Reactivity** slider runs from calm (smooth swells, for background viewing) to wild (instant and punchy, for parties). Every building keeps reacting at any setting.
- **Color effects:** Spectrum, Wave, Fade, Solid, Breathing, Random and Smooth random, plus a brightness slider. Solid and Breathing use **Pick color**, which keeps your last 8 colors as swatches.
- **Scene:**
  - a street with traffic, a park, or a thin river with reflections
  - a hazy back skyline and 3D building detail
- **Weather:** rain, snow, blizzards (dense, wind-driven snow, a whiteout haze and snow lying deeper on roofs and streets), thunderstorms (lightning on the bass), fog, cherry blossoms and autumn leaves. **Wind** sets which way rain and snow fall: straight down, left to right, right to left, or Auto, which shifts direction every minute or so.
- **Seasons:** Spring, Summer, Fall or Winter, or Auto to follow today's date. A season brings its weather (cherry blossoms, autumn leaves, snow) while the Weather setting is Clear; a weather you pick, or live weather, always wins. Winter also puts snow on the rooftops, streets and parks, and each season tints the park trees.
- **Christmas Village:** a big snowy village under snow-capped mountains and a ridge of pines, its cottages in deep reds, pines, slates and plums with lit front doors, lanterns and shop awnings, decked in all kinds of lights that chase and twinkle with the music (coloured strings, warm icicles, candy-cane garlands) and smoking chimneys, wreaths, a half-timbered inn, a bakery with cakes in the window, a tall townhouse with a candle in every window, a clock tower that keeps the real time, a log cabin, a little church, a toy workshop factory with candy-striped smokestacks and a conveyor of presents, gingerbread cottages, candy canes and presents along a snowy road, and a frozen river. A great four-pointed star gleams in the top left, a big, richly decorated Christmas tree (tinsel, baubles, presents underneath) stands fixed in the bottom right and lights up with the music under a gold star, now and then a faint aurora comes in with pale angels gliding through it for 10 to 20 seconds, a sleigh pulled by reindeer (a glowing red nose in front) crosses the sky every 30 to 90 seconds, and three travellers on camels, in green, red and blue robes with small gold crowns, ride single file along the road from right to left.
- **Jungle City:** aged stone towers deep in a rainforest, hung with ivy and lit by torches that flare with the music, a great stepped temple looming in the misty background, carved stone heads with glowing eyes, waterfalls in the misty hills, fireflies and glowing mushrooms that pulse with the music. A golden skull shimmers on a pedestal in a shrine atop the widest tower, between braziers and glowing glyphs, a shaft of gold light rising from it. Macaws, a swinging monkey and blue butterflies over the ferns bring it to life, and leafy brush frames the view. A pixel explorer in a fedora and leather jacket wanders the city, looking up at buildings and searching them: their rooms light up one by one, going up, as he checks each. After two to three minutes he finds the skull and takes it, the temple shudders, the pedestal sinks into the tower, and as he comes out a huge stone boulder comes rolling down the street after him. He runs for it, skull in hand. About two minutes later the pedestal rises with the skull again, and he comes back.
- **Live weather (optional):** mirror the real current weather of the skyline's city, or of any city you type, refreshed every 15 minutes from [Open-Meteo](https://open-meteo.com) (free, no account). City Pulse never looks up where you are: only the name you search for, and then that place's rounded coordinates, are sent. It's always night in City Pulse, so a sunny day shows as a clear night.
- **Ambient motion:** each item can be switched on or off: blinking roof lights, windows switching on and off, searchlights, stars, shooting stars, moon, clouds, planes and flying cars.
- **Views:**
  - **Fit:** the whole city on one screen. In the widget it shows whole buildings only; on full screen and the wallpaper the skyline runs off the edges.
  - **Pan:** drag or scroll to choose your part of the city, or use the **Position** slider (handy for the wallpaper, which can't be dragged).
  - **Scroll:** the city you picked scrolls past endlessly.
  - **Tour:** slowly scrolls through every city, real and themed, with name captions. Made for a TV. Choose the speed, the direction (right to left or left to right) and which cities it visits.
- **Presets:** four built in (Lounge, Chill Night, Party, Neon Tour). Your own presets are shared between the widget and full screen.
- **TV-friendly:**
  - full screen opens on whichever display the widget is on
  - **multiple screens:** full screen and the live wallpaper can each run on all screens, with either **its own city on each screen** or **one tour across all of them**. In the tour, cities scroll from screen to screen, each screen shows its own city name, and each screen can have **its own lights** (colors, style, brightness): in the Control Center, choose **Customize → Full screen** (or Wallpaper) and pick the screen.
  - the controls auto-hide
  - optional burn-in protection creeps the picture a few pixels over about 20 minutes
- **Control Center:** the one window for everything, in three steps: **1. Listen to** (the audio source), **2. Where the city shows** (widget, full screen, wallpaper, and a **Tour across every screen** button), **3. Customize**: pick Widget, Full screen or Wallpaper, then the screen if you have several, and its settings appear right below. Click the tray icon, the ☰ button, or launch City Pulse again to open it.
- **Lives in the tray:** no taskbar button. The tray icon by the clock shows or hides the widget, and also has full screen, Settings, Start with Windows and Quit.
- **Live wallpaper:** puts City Pulse behind your desktop icons on the display you choose, with its own look (Control Center → Customize → Wallpaper). It relies on an unofficial Windows feature, so a future Windows update could break it. If that happens, it switches itself off.

## Install (Windows)

Download `City-Pulse-Setup-x.y.z.exe` from Releases and run it. It adds Start-menu and desktop shortcuts.

The exe isn't code-signed yet, so Windows SmartScreen may warn on first run. Choose **More info → Run anyway**.

### Mac (preview)

The Mac version is new and not signed by Apple yet.

1. From Releases, download `City-Pulse-x.y.z-arm64.dmg` for Apple Silicon (M1 and later) or `City-Pulse-x.y.z-x64.dmg` for Intel Macs.
2. Open it and drag **City Pulse** into **Applications**.
3. The first time, macOS blocks it. Open **System Settings → Privacy & Security**, scroll down and choose **Open Anyway**. If macOS says the app "is damaged", run this in Terminal, then open it again:

```bash
xattr -cr "/Applications/City Pulse.app"
```

4. Allow microphone access when asked. City Pulse lives in the menu bar, not the Dock: click the skyline icon at the top right of the screen for the Control Center, the widget, full screen, wallpaper, settings and Quit.

#### Listening on a Mac

macOS doesn't let apps hear what's playing, so City Pulse listens to an input you pick under **Listen to**. That can be a microphone, a line-in, or [BlackHole](https://existential.audio/blackhole/), a free driver that carries your Mac's sound. The steps below set up BlackHole so you can switch between your Mac's speakers and AirPods (or other Bluetooth headphones) in one click, with City Pulse reacting either way.

**1. Install BlackHole.** Install **BlackHole 2ch** and restart. It isn't an app, so it won't appear in Applications. It appears as a sound device named **BlackHole 2ch** in **System Settings → Sound**, under both Output and Input.

**2. Connect your headphones.** Connect your AirPods, from the menu bar or **System Settings → Bluetooth**. They must be connected to show up in the next steps.

**3. Create one output for each way you listen.** Open **Audio MIDI Setup** (press ⌘ Space and type its name, or find it in Applications → Utilities).

Mac speakers:
1. Click **+** at the bottom left, then **Create Multi-Output Device**.
2. Under **Use**, tick **MacBook Speakers** (your Mac's speakers) first, then **BlackHole 2ch**, and nothing else. The order matters: the speakers must be listed above BlackHole.
3. Set **Primary Device** to **MacBook Speakers**.
4. Tick **Drift Correction** for **BlackHole 2ch** only.
5. Double-click the new device's name in the list and rename it **Speakers + City Pulse**.

AirPods:
1. Click **+**, then **Create Multi-Output Device**.
2. Under **Use**, tick **AirPods** first, then **BlackHole 2ch**, and nothing else. The order matters: the AirPods must be listed above BlackHole.
3. Set **Primary Device** to **AirPods**.
4. Tick **Drift Correction** for **BlackHole 2ch** only.
5. Rename it **AirPods + City Pulse**.

**4. Put sound in the menu bar.** **System Settings → Control Center → Sound → Always Show in Menu Bar.**

**5. Point City Pulse at BlackHole (once).** In City Pulse's **Control Center**, choose **BlackHole 2ch** under **Listen to**. This works for both outputs.

**6. Switch.** Click the speaker icon in the menu bar and choose **Speakers + City Pulse** or **AirPods + City Pulse**.

**Calls (FaceTime, Zoom and others).** Bluetooth headphones can't use their microphone while they're part of a Multi-Output Device. If they try, the mic goes silent. Pick one of these:

- **Keep City Pulse running:** listen with **AirPods + City Pulse** and talk through the Mac's microphone.
  - **System Settings → Sound → Input:** **MacBook Microphone**.
  - In FaceTime, open the **Video** menu and set **Microphone** to **MacBook Microphone**. Other call apps have the same choice in their audio settings.
- **Use the AirPods microphone:** for the call, choose plain **AirPods** from the menu bar, and set **Input** to **AirPods**. City Pulse goes quiet until you switch back to **AirPods + City Pulse** after the call.

**Good to know**
- **Never choose BlackHole 2ch as your Input** in Sound settings or a call app, or the other person won't hear you.
- **Volume:** a Multi-Output Device has no volume control of its own, so the volume keys may do nothing. Set the volume in your music app, or select the speakers or AirPods in Audio MIDI Setup and change it there.
- **When the AirPods connect**, the Mac may switch straight to plain **AirPods**, and City Pulse goes dark. Choose **AirPods + City Pulse** again.
- **AirPods missing** from the AirPods device: reconnect them, then check that **AirPods** is still ticked in Audio MIDI Setup.
- **Echo or delay:** make sure **Drift Correction** is ticked only for **BlackHole 2ch**.
- **Crackling** when music starts, clearing up after a while: BlackHole is listed above your speakers or AirPods. Untick both, then tick them again, speakers or AirPods first and **BlackHole 2ch** second, and check **Drift Correction** is ticked for **BlackHole 2ch** only.

Mac differences: updates are downloaded by hand (the menu's **Check for updates…** opens the Releases page), the loudness meter isn't scaled by the Mac volume, and to uninstall you drag the app to the Bin.

### Updates

On Windows, City Pulse updates itself, so you never need to download a new installer.
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
- **⛶ Full screen** opens the big view on the widget's display: drag the widget to your TV first. **Esc** closes full screen. When it covers all screens, Esc closes every screen at once, whichever window has focus.
- **⚙ Settings** opens the Control Center at the widget’s settings: presets plus the Skyline, Lights, Scene, Weather and Ambient sections. Changes apply to the widget live. In full screen, ⚙ opens the panel on screen instead.
- **Right-click the tray icon** for full screen, settings for the widget, full screen and wallpaper (each opens the Control Center there), Live wallpaper, Start with Windows, Check for updates, Uninstall and Quit.
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

`npm test` checks the page-access gate and lays out every city in every view at a few window sizes, in a hidden, muted window.

## Build the exe

```bash
npm run dist
```

The installer is written to `dist/`.

On a Mac, `npm run dist:mac` builds the `.dmg` files. Without a Mac, GitHub builds them: run **Mac build** from the repository's **Actions** tab and download the result from the run's page.

## Publish a new version (maintainers)

1. Bump `"version"` in `package.json`, for example from 0.6.1 to 0.6.2, then commit and push.
2. Create the release, which also makes its tag. Doing this first matters: if the release script has to create it, it can end up making two.

```bash
gh release create v0.6.2 --title "City Pulse 0.6.2" --generate-notes
```

3. Within two hours, run the release script with a GitHub token. It uploads into that release:

```bash
GH_TOKEN=$(gh auth token) npm run release
```

This builds the installer and adds it to the release, together with `latest.yml`, the file installed copies check to find updates. Every installed Windows copy then updates itself. Creating the release also starts the **Mac build**, which adds the two `.dmg` files to it a few minutes later.

Automatic updates need the repository to be **public**, because installed copies read the Releases page without signing in.

## Notes

City skylines and landmarks are simplified illustrations. The project isn't affiliated with any city, building owner or brand.

## License

[MIT](LICENSE)
