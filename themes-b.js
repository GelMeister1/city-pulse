// City Pulse plugin: themed cities (themes-b). Loaded by index.html after the core script, before start().
// Register with CityPulse.registerTheme(key, def); see the field list above registerTheme in index.html.
// Lantern District, Desert Mirage, Brasshaven and Neon Strip. All sizes are in units (E.unit px) so they scale
// from the widget to a 4K TV; per-frame state that must advance once per frame uses a frame-stamp guard.
(() => {
  const CP = window.CityPulse;
  if (!CP) return;
  const { registerTheme, sprite, pixelArt, hash } = CP;
  const once = () => { let last = -1; return E => last !== E.t && (last = E.t, true); };   // true on the first call of each frame
  const topT = b => b.tiers[b.tiers.length - 1];

  // ---------- Lantern District ----------
  // Old town of curved, upturned tile roofs, a few tiered towers, and strings of paper lanterns between rooftops
  // that sway and flare on the bass.
  {
    const ROOF = '#1c0b0d';
    const roofH = w => Math.min(w * .28, 4.2);           // top roof height, units
    const halfAt = (b, h) => { let y = 0; for (const tr of b.tiers) { y += tr.h; if (h <= y) return tr.w / 2; } return topT(b).w / 2; };
    // A concave, bell-shaped roof with upturned eave tips. rw = ridge width (the next tier's width for an eave skirt).
    const roofPath = (g, cx, y, tw, rh, ov, rw) => {
      const x0 = cx - tw / 2, x1 = cx + tw / 2, ty = y - rh * .32, ry = y - rh;
      g.moveTo(x0 - ov, ty);
      g.quadraticCurveTo(cx - rw / 2, y - rh * .1, cx - rw / 2, ry);
      g.lineTo(cx + rw / 2, ry);
      g.quadraticCurveTo(cx + rw / 2, y - rh * .1, x1 + ov, ty);
      g.quadraticCurveTo(x1 + ov * .15, y + rh * .06, x1, y + rh * .1);
      g.lineTo(x0, y + rh * .1);
      g.quadraticCurveTo(x0 - ov * .15, y + rh * .06, x0 - ov, ty);
      g.closePath();
    };
    const trimPath = (g, cx, y, tw, rh, ov) => {
      const x0 = cx - tw / 2, x1 = cx + tw / 2, ty = y - rh * .32;
      g.moveTo(x0 - ov, ty); g.quadraticCurveTo(x0 - ov * .15, y + rh * .06, x0, y + rh * .1);
      g.lineTo(x1, y + rh * .1); g.quadraticCurveTo(x1 + ov * .15, y + rh * .06, x1 + ov, ty);
    };
    const drawRoofs = (g, b, cx, E) => {
      const u = E.unit, n = b.tiers.length, dims = [];
      let y = E.GY;
      for (let i = 0; i < n; i++) {
        const tr = b.tiers[i]; y -= tr.h * u;
        const top = i === n - 1, rh = (top ? roofH(tr.w) : 1.5) * u, ov = (top ? .9 + tr.w * .08 : .6 + tr.w * .05) * u;
        dims.push([y, tr.w * u, rh, ov, top ? tr.w * u * .3 : b.tiers[i + 1].w * u * .96]);
      }
      g.fillStyle = ROOF; g.beginPath();
      for (const [ry, tw, rh, ov, rw] of dims) roofPath(g, cx, ry, tw, rh, ov, rw);
      g.fill();
      g.strokeStyle = `rgba(255,176,80,${.3 + .35 * b.level})`; g.lineWidth = Math.max(1, u * .28); g.beginPath();   // gilded eave trim, warming with the building's band
      for (const [ry, tw, rh, ov] of dims) trimPath(g, cx, ry, tw, rh, ov);
      g.stroke();
      const [ry, , rh, , rw] = dims[n - 1], ridge = ry - rh;   // ridge horns, and a finial on the towers
      g.fillStyle = ROOF; g.beginPath();
      for (const s of [-1, 1]) { const x = cx + s * rw / 2; g.moveTo(x - s * u * .5, ridge + .5); g.lineTo(x + s * u * .7, ridge - u * .9); g.lineTo(x + s * u * .2, ridge + .5); }
      if (b.tower) { g.rect(cx - u * .18, ridge - u * 4, u * .36, u * 4); g.rect(cx - u * .6, ridge - u * 1.4, u * 1.2, u * .4); g.rect(cx - u * .45, ridge - u * 2.4, u * .9, u * .35); }
      g.fill();
      return ridge;
    };
    // Where a lantern string ties on: the roof ridge, or the wall of the taller neighbour at the other's height.
    const tie = (b, bcx, side, otherH, u, GY) => b.hU - otherH > 4
      ? [bcx + side * halfAt(b, otherH + 1) * u, GY - (otherH + 1) * u]
      : [bcx + side * topT(b).w * .2 * u, GY - (b.hU + roofH(topT(b).w) * .5) * u];
    const bodies = [], golds = [];
    const drawString = (g, x0, y0, x1, y1, sag, seed, E) => {
      const u = E.unit, span = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.floor(span / (u * 2.1)));
      const glow = Math.min(1, .3 + .7 * E.bassFlash + .15 * E.bands[3].level), swing = .1 + .3 * E.bassFlash;
      const rx = Math.max(1.3, u * .68), ry = Math.max(1.7, u * .88), cord = u * .6;
      g.strokeStyle = 'rgba(40,18,10,.9)'; g.lineWidth = 1; g.beginPath();
      g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 2 * sag, x1, y1);
      bodies.length = golds.length = 0;
      for (let i = 1; i <= n; i++) {
        const s = i / (n + 1), px = x0 + (x1 - x0) * s, py = y0 + (y1 - y0) * s + 4 * sag * s * (1 - s);
        const a = Math.sin(E.t / 1100 + i * .9 + seed) * swing, lx = px + Math.sin(a) * cord, ly = py + Math.cos(a) * cord + ry;
        g.moveTo(px, py); g.lineTo(lx, ly - ry);
        (hash(seed * 97 | 0, i, 5) < .25 ? golds : bodies).push(lx, ly);
      }
      g.stroke();
      const spr = sprite('255,110,50'), R = u * (1.6 + 1.4 * glow), pa = g.globalAlpha;
      g.globalAlpha = pa * (.22 + .5 * glow);
      for (const L of [bodies, golds]) for (let i = 0; i < L.length; i += 2) g.drawImage(spr, L[i] - R, L[i + 1] - R, R * 2, R * 2);
      g.globalAlpha = pa;
      for (const [L, h] of [[bodies, 6], [golds, 40]]) {
        if (!L.length) continue;
        g.fillStyle = `hsl(${h},92%,${30 + 32 * glow}%)`; g.beginPath();
        for (let i = 0; i < L.length; i += 2) { g.moveTo(L[i] + rx, L[i + 1]); g.ellipse(L[i], L[i + 1], rx, ry, 0, 0, 7); }
        g.fill();
      }
      g.fillStyle = '#2a0c06'; g.beginPath();              // dark caps top and bottom
      for (const L of [bodies, golds]) for (let i = 0; i < L.length; i += 2) {
        g.rect(L[i] - rx * .6, L[i + 1] - ry - 1, rx * 1.2, Math.max(1, ry * .3)); g.rect(L[i] - rx * .6, L[i + 1] + ry * .8, rx * 1.2, Math.max(1, ry * .3));
      }
      g.fill();
    };
    registerTheme('lantern', { name: 'Lantern District',
      kit: { styles: ['pairs', 'grid', 'wide', 'tall', 'pairs'], roofs: [null], tall: .18, shrink: .84, w0: 7, gaps: [.6, 2] },
      minF: .2, maxF: .62,
      sky: [[0, '#06061f'], [.55, '#151245'], [.85, '#2e1846'], [1, '#4a2238']],
      drawSky(g, { W, H, GY, S, bassFlash }) {
        const m = Math.min(W, H);
        if (S.skyBody) {                                   // a big warm moon
          const r = m * .075, x = W * .68, y = GY * .22, pa = g.globalAlpha;
          g.globalAlpha = pa * (.3 + .15 * bassFlash); g.drawImage(sprite('255,215,160'), x - r * 3.5, y - r * 3.5, r * 7, r * 7); g.globalAlpha = pa;
          g.fillStyle = '#f7e6c2'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          g.fillStyle = 'rgba(205,170,125,.3)'; g.beginPath();
          for (const [dx, dy, rr] of [[-.3, -.2, .22], [.25, .3, .16], [.35, -.35, .1]]) { g.moveTo(x + (dx + rr) * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, 7); }
          g.fill();
        }
        const hz = g.createLinearGradient(0, GY * .5, 0, GY);   // soft warm haze from all the lanterns
        hz.addColorStop(0, 'rgba(255,120,60,0)'); hz.addColorStop(1, 'rgba(255,120,60,.24)');
        g.fillStyle = hz; g.fillRect(0, GY * .5, W, GY * .5);
      },
      stars: true, moon: false, cloud: 'rgba(120,60,90,.22)', fogRGB: '255,150,100',
      body: '#0c0507', side: '#1b0b0b', top: '#2a120f', searchlights: false,
      win: c => ({ h: 8 + (c.h % 360) / 360 * 40, s: Math.max(70, c.s * .9), m: c.m }),   // warm reds to gold
      back: { h: .7, density: .9, body: '#160b1f', win: c => c < .6 ? 'rgba(255,120,60,.26)' : 'rgba(255,200,90,.22)' },
      decorate(b) { b.blink = false; },                    // the roofs replace the warning lights
      afterLayout(list, r) {
        const maxH = Math.max(...list.map(b => b.hU));
        for (const b of list) {                            // the tallest become tiered towers: 3-5 storeys of eaves
          if (b.hU < maxH * .7 || r() > .85) continue;
          const n = 3 + Math.floor(r() * 3), fr = [.3, .22, .18, .16, .14].slice(0, n), sum = fr.reduce((a, f) => a + f, 0);
          let floors = 0;
          b.tiers = fr.map((f, i) => { const h = b.hU * f / sum, fl = Math.max(1, Math.floor(h / b.st.ch + 1e-6)), t = { w: b.tiers[0].w * Math.pow(.84, i), h, f: fl, base: floors }; floors += fl; return t; });
          b.floors = floors; b.tower = true;
        }
        for (let i = 1; i < list.length; i++) if (r() < .85) list[i].str = { a: list[i - 1], sag: .8 + 1.6 * r(), seed: r() * 9, low: r() < .35 };
      },
      drawExtras(g, b, cx, tip, E) {
        drawRoofs(g, b, cx, E);
        if (!b.str) return;                                // the string from the left neighbour, drawn after both roofs
        const { a, sag, seed, low } = b.str, u = E.unit, acx = cx + a.cx - b.cx;
        const [x0, y0] = tie(a, acx, 1, b.hU, u, E.GY), [x1, y1] = tie(b, cx, -1, a.hU, u, E.GY);
        if (x1 - x0 > u * 2) drawString(g, x0, y0, x1, y1, sag * u, seed, E);
        if (low) {                                         // a second, lower string across the alley
          const h = Math.min(a.hU, b.hU) * .55, lx0 = acx + halfAt(a, h) * u, lx1 = cx - halfAt(b, h) * u;
          if (lx1 - lx0 > u * 3) drawString(g, lx0, E.GY - h * u, lx1, E.GY - h * u, (sag * .7 + .5) * u, seed + 3, E);
        }
      },
    });
  }

  // ---------- Desert Mirage ----------
  // Sandstone towers, domes and slender towers under a huge moon and a dense starfield; heat shimmer on the horizon,
  // rolling dunes with drifting sand. The moon's halo swells on the bass, the shimmer with the mids, the sand with the treble.
  {
    const BODY = '#22180f';
    let starC = null, starKey = '';
    const starField = (W, GY) => {                         // drawn once per size: many faint stars and a milky band
      const key = W + 'x' + GY;
      if (starKey === key) return starC;
      starKey = key; starC = document.createElement('canvas'); starC.width = W; starC.height = Math.ceil(GY);
      const x = starC.getContext('2d');
      for (let i = 0, n = Math.round(W * GY / 1500); i < n; i++) {
        const sx = Math.random() * W, sy = Math.random() ** 1.4 * GY * .85, b = Math.random();
        x.fillStyle = `rgba(${b > .9 ? '255,225,190' : b > .8 ? '190,215,255' : '255,255,255'},${.15 + .6 * b * (1 - sy / GY)})`;
        x.fillRect(sx, sy, b > .97 ? 2 : 1, b > .97 ? 2 : 1);
      }
      for (let i = 0, n = Math.round(W * 2.2); i < n; i++) {   // the galaxy: a soft diagonal river of tiny stars
        const p = Math.random(), off = (Math.random() + Math.random() + Math.random() - 1.5) * GY * .09;
        x.fillStyle = `rgba(230,225,255,${.08 + .25 * Math.random()})`;
        x.fillRect(p * W, GY * (.05 + .45 * p) + off, 1, 1);
      }
      return starC;
    };
    const CRATERS = [[-.35, -.2, .2], [.2, .25, .17], [.32, -.38, .1], [-.1, .45, .09], [.45, .05, .08]];
    const tc = document.createElement('canvas'), tcx = tc.getContext('2d');
    let sand = [];
    const tick = once();
    registerTheme('desert', { name: 'Desert Mirage',
      kit: { styles: ['tall', 'cols', 'pairs', 'grid', 'slim'], roofs: [null, ['dome', 5], null, ['dome', 4], ['spire', 7], null, ['dome', 6]], tall: .35, shrink: .8, w0: 6, gaps: [.5, 2] },
      minF: .25, maxF: .72,
      sky: [[0, '#02031a'], [.5, '#0a1440'], [.82, '#262a5c'], [1, '#5c3c4e']],
      drawSky(g, { W, H, GY, S, bassFlash, bands }) {
        const m = Math.min(W, H), pa = g.globalAlpha, clear = !['rain', 'storm', 'fog'].includes(S.weather);
        if (S.stars && clear) g.drawImage(starField(W, GY), 0, 0);
        if (S.skyBody) {                                   // the huge moon, its halo breathing with the bass
          const r = m * .1, x = W * .24, y = GY * .3;
          g.globalAlpha = pa * (.28 + .35 * bassFlash); g.drawImage(sprite('255,228,185'), x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4); g.globalAlpha = pa;
          g.fillStyle = '#f0e3c4'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          g.fillStyle = 'rgba(170,148,118,.35)'; g.beginPath();
          for (const [dx, dy, rr] of CRATERS) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, 7); }
          g.fill();
        }
        const hz = g.createLinearGradient(0, GY * .62, 0, GY);   // warm dusty haze on the horizon
        hz.addColorStop(0, 'rgba(255,170,110,0)'); hz.addColorStop(1, `rgba(255,160,100,${.22 + .1 * bands[3].level})`);
        g.fillStyle = hz; g.fillRect(0, GY * .62, W, GY * .38);
      },
      stars: true, moon: false, cloud: 'rgba(140,110,120,.16)', fogRGB: '220,170,120',
      body: BODY, side: '#33241a', top: '#46331f',
      win: (c, b) => ({ h: b.hue < 180 ? 36 : 175, s: 90, m: c.m }),   // each building stays amber or turquoise
      back: { h: .8, density: .7, body: '#16101e', win: c => c < .6 ? 'rgba(255,170,70,.25)' : 'rgba(70,220,210,.22)' },
      decorate(b, r) {
        if (!b.roof && r() < .75) b.parapet = true;        // crenellated rooftops
        if (r() < .3) b.mina = { side: r() < .5 ? -1 : 1, h: 9 + 12 * r() };   // a slender tower rising from the roof
      },
      drawExtras(g, b, cx, tip, E) {
        const u = E.unit, top = topT(b), tw = top.w * u, y = E.GY - b.hU * u;
        g.fillStyle = BODY; g.beginPath();
        if (b.parapet) for (let x = cx - tw / 2, k = 0; x < cx + tw / 2 - u * .3; x += u * 1.4, k++) g.rect(x, y - u * .8, Math.min(u * .8, cx + tw / 2 - x), u * .8 + .5);
        let mt;
        if (b.mina) {
          const { side, h } = b.mina, mx = cx + side * (tw / 2 - u * 1.1), mh = h * u;
          g.rect(mx - u * .8, y - mh, u * 1.6, mh + .5);
          g.rect(mx - u * 1.3, y - mh * .72, u * 2.6, u * .6);   // balcony
          g.moveTo(mx + u * .8, y - mh); g.ellipse(mx, y - mh, u * .8, u * 1.3, 0, Math.PI, 2 * Math.PI);   // small cap
          g.rect(mx - u * .1, y - mh - u * 3, u * .2, u * 1.8);   // plain needle
          mt = [mx, y, mh];
        }
        g.fill();
        if (b.roof && b.roof[0] === 'dome') {              // moonlight catching the dome from the left
          g.strokeStyle = 'rgba(255,225,180,.22)'; g.lineWidth = Math.max(1, u * .25); g.beginPath();
          g.ellipse(cx, y, tw / 2 - .5, b.roof[1] * u - .5, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
        }
        if (mt) {                                          // lit slits up the slender tower
          const [mx, by, mh] = mt, c = b.id % 2 ? 36 : 175;
          g.fillStyle = `hsl(${c},90%,${18 + 50 * b.level}%)`;
          for (let k = 1; k <= 3; k++) g.fillRect(mx - u * .2, by - mh * (.2 + k * .17), u * .4, u * 1.1);
        }
      },
      drawFront(g, E) {                                    // heat shimmer: the bottom of the skyline wobbles like a mirage
        if (E.widget) return;
        const { W, GY, unit: u, t } = E, cv = g.canvas, sc = cv.width / W, band = Math.round(Math.max(8, GY * .06));
        const bw = cv.width, bh = Math.ceil(band * sc);
        if (tc.width !== bw || tc.height !== bh) { tc.width = bw; tc.height = bh; } else tcx.clearRect(0, 0, bw, bh);
        tcx.drawImage(cv, 0, Math.round((GY - band) * sc), bw, bh, 0, 0, bw, bh);
        const amp = Math.max(.6, u * .12) * (1 + 1.8 * E.bands[3].level);
        for (let y = 0; y < band; y += 2) g.drawImage(tc, 0, y * sc, bw, 2 * sc, Math.sin(y * .14 + t / 260) * amp * (y / band), GY - band + y, W, 2);
        const hz = g.createLinearGradient(0, GY - band * 2, 0, GY);
        hz.addColorStop(0, 'rgba(255,175,110,0)'); hz.addColorStop(1, 'rgba(255,175,110,.12)');
        g.fillStyle = hz; g.fillRect(0, GY - band * 2, W, band * 2);
      },
      ground: { h: .12, draw(g, E) {                       // rolling dunes and wind-blown sand
        const { W, H, GY, unit: u, travel, dt, scrollV } = E, gh = H - GY;
        g.fillStyle = '#2c1f14'; g.fillRect(0, GY, W, gh);
        const dune = (base, amp, par, col) => {
          g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= W + 6; x += 6) {
            const X = (x + travel * par) / u;
            g.lineTo(x, GY + gh * (base + amp * (.55 * Math.sin(X / 26) + .3 * Math.sin(X / 11 + 1.7) + .15 * Math.sin(X / 5 + .4))));
          }
          g.lineTo(W, H); g.fill();
        };
        dune(.3, .16, .7, '#3b2a1b');
        dune(.62, .2, 1, '#1a110a');
        g.fillStyle = 'rgba(255,215,160,.08)'; g.fillRect(0, GY, W, Math.max(1, gh * .06));   // moonlit flat at the foot of the towers
        const n = Math.round(W / 12);
        if (sand.length !== n) sand = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random(), s: Math.random() }));
        const first = tick(E), wind = u * (5 + 14 * E.bands[6].level);
        g.fillStyle = 'rgba(240,205,155,.32)';
        for (const p of sand) {
          if (first) { p.x += (wind * (.5 + p.s) - scrollV) * dt; if (p.x > W + 8) p.x = -8; else if (p.x < -8) p.x = W + 8; }
          g.fillRect(p.x, GY - u * 1.2 + p.y * (gh + u * 1.2), 1 + p.s * 3, 1);
        }
      } },
    });
  }

  // ---------- Brasshaven ----------
  // Copper and brass towers with riveted bands, glowing clock faces that keep real time, gears that spin with each
  // building's band, smokestacks that puff steam on bass hits, and airships drifting through a smoggy sky.
  {
    const SHIP = [
      '.....oooooooooooo......',
      '...ooBBBBBBBBBBBBoo..ff',
      '.ooBbBBbBBbBBbBBbBBoofF',
      'oBBbBBbBBbBBbBBbBBBBBoF',
      'oBBbBBbBBbBBbBBbBBBBBoF',
      '.ooBbBBbBBbBBbBBbBBoofF',
      '...ooBBBBBBBBBBBBoo..ff',
      '.....oooooooooooo......',
      '.......o..o..o..o......',
      '......ggggggggggggp....',
      '......gwgwgwgwgwgg.....',
      '.......gggggggggg......',
    ];
    const SHIP_R = SHIP.map(r => [...r].reverse().join(''));
    const PAL = { o: '#1e130a', B: '#5e3e1e', b: '#9a6a34', f: '#3a2614', F: '#6a4520', g: '#2e1e10', p: '#a07a48', w: '#ffcc66' };
    let ships = [], shipKey = '';
    const tick = once();
    const drawShips = (g, E) => {
      if (E.widget || !E.S.planes) return;
      const { W, GY, unit: u, dt, scrollV, t } = E, key = W + 'x' + GY;
      if (key !== shipKey) {
        shipKey = key;
        ships = [0, 1, 2].map(i => ({ x: Math.random() * W, y: GY * (.1 + .13 * i + .05 * Math.random()), dir: Math.random() < .5 ? 1 : -1, v: u * (1 + .8 * Math.random()), k: 1 - i * .22 }));
      }
      const first = tick(E);
      PAL.w = `hsl(40,100%,${45 + 40 * E.bands[5].level}%)`;   // gondola lights flicker with the presence band
      for (const s of ships) {
        const px = Math.max(1, Math.round(u * .45 * s.k)), sw = 23 * px;
        if (first) { s.x += (s.dir * s.v - scrollV * .2) * dt; if (s.x > W + sw) s.x = -sw * 2; else if (s.x < -sw * 2) s.x = W + sw; }
        if (s === ships[0]) {                              // the lead ship sweeps a searchlight over the city
          const bx = s.x + sw / 2, by = s.y + 11 * px, ang = Math.PI / 2 + Math.sin(t / 2600) * .45, len = GY * .9, sp = .08;
          const gr = g.createLinearGradient(bx, by, bx + Math.cos(ang) * len, by + Math.sin(ang) * len);
          gr.addColorStop(0, `rgba(255,225,160,${.14 + .18 * E.bands[3].level})`); gr.addColorStop(1, 'rgba(255,225,160,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(bx, by);
          g.lineTo(bx + Math.cos(ang - sp) * len, by + Math.sin(ang - sp) * len); g.lineTo(bx + Math.cos(ang + sp) * len, by + Math.sin(ang + sp) * len); g.fill();
        }
        pixelArt(g, s.dir < 0 ? SHIP : SHIP_R, PAL, s.x, s.y, px);
      }
    };
    const drawClock = (g, x, y, R, lv, u) => {
      const d = new Date(), sec = d.getSeconds() + d.getMilliseconds() / 1000, mi = d.getMinutes() + sec / 60, hr = d.getHours() % 12 + mi / 60;
      const pa = g.globalAlpha;
      g.globalAlpha = pa * (.3 + .45 * lv); g.drawImage(sprite('255,190,110'), x - R * 2.2, y - R * 2.2, R * 4.4, R * 4.4); g.globalAlpha = pa;
      g.fillStyle = `hsl(40,70%,${52 + 22 * lv}%)`; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      g.strokeStyle = '#9a6a32'; g.lineWidth = Math.max(1, R * .14); g.stroke();
      g.strokeStyle = '#3a2410'; g.lineWidth = Math.max(1, R * .06); g.beginPath();
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, c = Math.cos(a), s = Math.sin(a); g.moveTo(x + c * R * .78, y + s * R * .78); g.lineTo(x + c * R * .92, y + s * R * .92); }
      const hand = (f, len) => { const a = f * Math.PI * 2 - Math.PI / 2; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R * len, y + Math.sin(a) * R * len); };
      g.stroke(); g.lineWidth = Math.max(1, R * .12); g.beginPath(); hand(hr / 12, .5); g.stroke();
      g.lineWidth = Math.max(1, R * .08); g.beginPath(); hand(mi / 60, .8); g.stroke();
      if (R > 8) { g.strokeStyle = '#a0201a'; g.lineWidth = 1; g.beginPath(); hand(sec / 60, .85); g.stroke(); }
    };
    const drawGear = (g, x, y, R, ang, u) => {
      const n = 10;
      g.fillStyle = '#3a2410'; g.beginPath();
      for (let k = 0; k < n * 4; k++) {
        const a = ang + k * Math.PI * 2 / (n * 4), rr = k % 4 < 2 ? R : R * .78;
        k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
      g.strokeStyle = '#b07a3a'; g.lineWidth = Math.max(1, u * .2); g.stroke();
      g.fillStyle = '#b07a3a'; g.beginPath(); g.arc(x, y, R * .25, 0, 7); g.fill();
    };
    const puffSpr = () => sprite('175,160,150');
    registerTheme('brass', { name: 'Brasshaven',
      kit: { styles: ['cols', 'pairs', 'tall', 'grid'], roofs: [null, ['dome', 4], ['pyramid', 4], null, ['antenna', 5], ['crown', 6]], tall: .4, shrink: .8, w0: 7, gaps: [.5, 1.5] },
      minF: .3, maxF: .78,
      sky: [[0, '#0c0812'], [.5, '#24162a'], [.8, '#3e2a30'], [1, '#5c402c']],
      drawSky(g, { W, H, GY, S }) {
        if (S.skyBody) {                                   // a hazy moon through the smog
          const r = Math.min(W, H) * .05, x = W * .6, y = GY * .18, pa = g.globalAlpha;
          g.globalAlpha = pa * .35; g.drawImage(sprite('255,200,140'), x - r * 4, y - r * 4, r * 8, r * 8);
          g.globalAlpha = pa * .75; g.fillStyle = '#e6c48c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.globalAlpha = pa;
        }
        const hz = g.createLinearGradient(0, GY * .45, 0, GY);   // sepia smog settling over the rooftops
        hz.addColorStop(0, 'rgba(200,140,90,0)'); hz.addColorStop(1, 'rgba(200,140,90,.22)');
        g.fillStyle = hz; g.fillRect(0, GY * .45, W, GY * .55);
      },
      stars: false, moon: false, overcast: true, cloud: 'rgba(70,48,44,.42)', fogRGB: '170,130,100',
      body: '#140d09', side: '#2c1b0f', top: '#3c2714', outline: () => 'rgba(184,115,51,.5)', searchlights: false,
      win: c => ({ h: 26 + (c.h % 360) / 360 * 22, s: Math.max(60, c.s * .85), m: c.m }),
      back: { h: .9, density: .9, body: '#1d131a', win: () => 'rgba(255,170,80,.22)' },
      decorate(b, r) {
        const top = topT(b);
        if (top.w >= 7 && top.h >= 9 && r() < .35) b.clock = true;
        if (r() < .45) { b.stacks = Array.from({ length: r() < .4 ? 2 : 1 }, () => ({ fx: r() - .5, w: 1.1 + r(), h: 5 + 8 * r() })); b.puffs = []; b.lastPuff = 0; b.nextIdle = 0; }
        if (b.tiers[0].w >= 9 && r() < .35) { b.gear = { fy: .12 + .3 * r(), R: 2 + 1.6 * r(), side: r() < .5 ? -1 : 1 }; b.gearA = 0; }
      },
      drawBehind: drawShips,
      drawExtras(g, b, cx, tip, E) {
        const u = E.unit, GY = E.GY;
        let y = GY;
        g.fillStyle = '#6a4422'; g.beginPath();            // riveted brass bands
        const rivets = [];
        for (const tr of b.tiers) {
          const tw = tr.w * u, x0 = cx - tw / 2;
          for (let h = 5; h < tr.h - 1; h += 7) {
            const by = y - h * u; g.rect(x0, by, tw, Math.max(1, u * .4));
            if (!E.widget) for (let x = x0 + u * .7; x < x0 + tw - u * .3; x += u * 1.5) rivets.push(x, by + u * .2);
          }
          y -= tr.h * u;
        }
        g.fill();
        if (rivets.length) { g.fillStyle = '#c99050'; g.beginPath(); const rs = Math.max(1, u * .22); for (let i = 0; i < rivets.length; i += 2) g.rect(rivets[i] - rs / 2, rivets[i + 1] - rs / 2, rs, rs); g.fill(); }
        const top = topT(b), ty = GY - b.hU * u, tw = top.w * u;
        if (b.clock) { const R = Math.min(tw * .3, 3.6 * u); drawClock(g, cx, ty + R + 1.3 * u, R, b.level, u); }
        if (b.gear) {                                      // spins with the building's band
          b.gearA += E.dt * (.2 + 3 * b.level) * b.gear.side;
          drawGear(g, cx + b.gear.side * b.wpx / 2, GY - b.hU * u * b.gear.fy, b.gear.R * u, b.gearA, u);
        }
        if (b.stacks) {
          const t = E.t, hit = E.bassFlash > .9 && t - b.lastPuff > 220, idle = t > b.nextIdle;
          for (const s of b.stacks) {                      // tall smokestacks with copper rings and a glowing throat
            const sx = cx + s.fx * (tw - s.w * u), sw = s.w * u, sh = s.h * u, st = ty - sh;
            g.fillStyle = '#1b120b'; g.fillRect(sx - sw / 2, st, sw, sh + 1); g.fillRect(sx - sw * .7, st, sw * 1.4, u * .7);
            g.fillStyle = '#9a6430'; g.fillRect(sx - sw / 2, st + sh * .35, sw, Math.max(1, u * .3)); g.fillRect(sx - sw / 2, st + sh * .7, sw, Math.max(1, u * .3));
            const pa = g.globalAlpha; g.globalAlpha = pa * (.25 + .6 * E.bassFlash);
            g.drawImage(sprite('255,120,40'), sx - u * 1.6, st - u * 1.6, u * 3.2, u * 3.2); g.globalAlpha = pa;
            if (hit || idle) for (let k = 0; k < (hit ? 3 : 1); k++)
              b.puffs.push({ x: (sx - cx) / u + (Math.random() - .5) * s.w, y: b.hU + s.h + .5, age: 0, life: hit ? 3.2 : 2.4, big: hit ? 1.4 : .8, vx: .8 + Math.random() });
          }
          if (hit) b.lastPuff = t;
          if (idle) b.nextIdle = t + 1200 + Math.random() * 1600;
          if (b.puffs.length > 45) b.puffs.splice(0, b.puffs.length - 45);
          const spr = puffSpr(), pa = g.globalAlpha;
          for (let i = b.puffs.length - 1; i >= 0; i--) {  // soft steam rising and fading
            const p = b.puffs[i]; p.age += E.dt;
            if (p.age > p.life) { b.puffs.splice(i, 1); continue; }
            p.y += (2.2 + p.age) * E.dt; p.x += p.vx * E.dt;
            const f = p.age / p.life, R = (1.2 + p.age * 1.8) * p.big * u;
            g.globalAlpha = pa * .5 * (1 - f) * Math.min(1, p.age * 6);
            g.drawImage(spr, cx + p.x * u - R, GY - p.y * u - R, R * 2, R * 2);
          }
          g.globalAlpha = pa;
        }
      },
    });
  }

  // ---------- Neon Strip ----------
  // A retro boulevard of low buildings under huge marquee signs: chasing bulbs whose speed follows the beat,
  // starbursts, boomerangs and arrows in neon, palms along the road. Abstract shapes only, no lettering.
  {
    const HUES = [330, 185, 52, 290, 15, 150];
    const tick = once();
    let chase = 0;
    const lit = [], dim = [];
    const bulb = (x, y, i) => (((i - Math.floor(chase)) % 3 + 3) % 3 === 0 ? lit : dim).push(x, y);
    const bulbRect = (x, y, w, h, sp) => {                 // bulbs all the way round a rectangle, numbered clockwise
      let i = 0;
      const nx = Math.max(2, Math.round(w / sp)), ny = Math.max(2, Math.round(h / sp));
      for (let k = 0; k < nx; k++) bulb(x + w * k / nx, y, i++);
      for (let k = 0; k < ny; k++) bulb(x + w, y + h * k / ny, i++);
      for (let k = 0; k < nx; k++) bulb(x + w - w * k / nx, y + h, i++);
      for (let k = 0; k < ny; k++) bulb(x, y + h - h * k / ny, i++);
    };
    const flushBulbs = (g, E) => {
      const u = E.unit, s = Math.max(1.5, u * .42), bass = E.bassFlash, pa = g.globalAlpha;
      if (dim.length) { g.fillStyle = `rgba(255,215,150,${.16 + .35 * bass})`; g.beginPath(); for (let i = 0; i < dim.length; i += 2) g.rect(dim[i] - s / 2, dim[i + 1] - s / 2, s, s); g.fill(); }
      if (lit.length) {
        const spr = sprite('255,205,120'), R = Math.max(3, u * 1.1);
        g.globalAlpha = pa * (.45 + .45 * bass);
        for (let i = 0; i < lit.length; i += 2) g.drawImage(spr, lit[i] - R, lit[i + 1] - R, R * 2, R * 2);
        g.globalAlpha = pa;
        g.fillStyle = '#fff4cc'; g.beginPath(); for (let i = 0; i < lit.length; i += 2) g.rect(lit[i] - s / 2, lit[i + 1] - s / 2, s, s); g.fill();
      }
      lit.length = dim.length = 0;
    };
    const neon = (g, hue, a, lw) => {                     // stroke the current path as a glowing tube
      g.strokeStyle = `hsla(${hue},100%,60%,${.22 * a})`; g.lineWidth = lw * 3.2; g.stroke();
      g.strokeStyle = `hsl(${hue},100%,${55 + 28 * a}%)`; g.lineWidth = lw; g.stroke();
    };
    const star = (g, x, y, r1, r2, n, rot) => {
      for (let k = 0; k < n * 2; k++) { const a = rot + k * Math.PI / n, r = k % 2 ? r2 : r1; k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.closePath();
    };
    // The art inside a marquee: starburst, boomerang, atom orbits or a zigzag with dots, centred in w x h.
    const motif = (g, sg, x, y, w, h, a, E) => {
      const lw = Math.max(1, E.unit * .3), cx = x + w / 2, cy = y + h / 2;
      g.beginPath();
      if (sg.shape === 0) star(g, cx, cy, Math.min(w, h) * (.36 + .1 * E.bands[6].level), Math.min(w, h) * .12, 8, E.t / 4000);
      else if (sg.shape === 1) { g.moveTo(cx - w * .38, cy + h * .22); g.quadraticCurveTo(cx, cy - h * .7, cx + w * .38, cy + h * .22); g.quadraticCurveTo(cx, cy - h * .2, cx - w * .38, cy + h * .22); }
      else if (sg.shape === 2) { const rx = Math.min(w * .4, h * .8), ry = h * .16; for (let k = 0; k < 3; k++) { const ang = E.t / 3000 + k * Math.PI / 3; g.moveTo(cx + Math.cos(ang) * rx, cy + Math.sin(ang) * rx); g.ellipse(cx, cy, rx, ry, ang, 0, 7); } }
      else { const n = 6; for (let k = 0; k <= n; k++) { const px = x + w * (.1 + .8 * k / n), py = cy + (k % 2 ? -1 : 1) * h * .2; k ? g.lineTo(px, py) : g.moveTo(px, py); } }
      neon(g, sg.hue, a, lw);
      if (sg.shape === 2 || sg.shape === 3) { g.fillStyle = `hsl(${sg.hue2},100%,${55 + 25 * a}%)`; g.beginPath(); g.arc(cx, cy, Math.max(1.5, E.unit * .6), 0, 7); g.fill(); }
    };
    registerTheme('strip', { name: 'Neon Strip',
      kit: { styles: ['wide', 'grid', 'ribbon', 'wide'], roofs: [null], tall: .12, shrink: .85, w0: 9, gaps: [.8, 2] },
      minF: .2, maxF: .5,
      sky: [[0, '#05030f'], [.55, '#140a2a'], [1, '#3a0f3c']],
      drawSky(g, { W, GY, bands }) {                       // the glow of the signs on the night sky
        const hz = g.createLinearGradient(0, GY * .35, 0, GY);
        hz.addColorStop(0, 'rgba(255,60,170,0)'); hz.addColorStop(.7, 'rgba(120,70,220,.12)'); hz.addColorStop(1, `rgba(255,80,170,${.26 + .12 * bands[0].level})`);
        g.fillStyle = hz; g.fillRect(0, GY * .35, W, GY * .65);
      },
      stars: true, moon: true, cloud: 'rgba(160,60,140,.14)', fogRGB: '255,120,200',
      body: '#07050b', side: '#130c1a', top: '#1d1226',
      win: c => ({ h: c.h, s: c.s * .7, m: c.m * .55 }),  // the signs are the show; windows stay low
      back: { h: .45, density: .6, body: '#120a20', win: c => c < .5 ? 'rgba(255,90,200,.2)' : 'rgba(90,220,255,.2)' },
      decorate(b, r) {
        const hue = HUES[Math.floor(r() * HUES.length)], hue2 = HUES[Math.floor(r() * HUES.length)];
        const kind = ['marquee', 'marquee', 'pylon', 'arrow', 'marquee', 'pylon'][Math.floor(r() * 6)];
        b.sg = { kind, hue, hue2, shape: Math.floor(r() * 4), ph: 4.5 + 3.5 * r(), side: r() < .5 ? -1 : 1 };
        if (kind !== 'marquee' && r() < .6 || r() < .2) b.burst = { hue: hue2, h: 3 + 3 * r(), fx: (r() - .5) * .6 };
      },
      drawExtras(g, b, cx, tip, E) {
        if (tick(E)) chase += E.dt * (3 + 16 * E.bands[1].level + 10 * E.bassFlash);   // the bulbs chase faster on a strong beat
        const u = E.unit, sg = b.sg, top = topT(b), tw = top.w * u, ty = E.GY - b.hU * u, sp = Math.max(3, u * 1.15);
        const a = (.55 + .45 * b.level) * (hash(b.id, Math.floor(E.t / 90), 3) < .012 ? .15 : 1);   // the odd tube flicker
        if (sg.kind === 'marquee') {                       // rooftop billboard on legs
          const pw = Math.max(7 * u, tw * .92), ph = sg.ph * u, px = cx - pw / 2, py = ty - u * 1.4 - ph;
          g.fillStyle = '#100a14'; g.fillRect(cx - pw * .3, py + ph, u * .4, u * 1.5); g.fillRect(cx + pw * .3 - u * .4, py + ph, u * .4, u * 1.5);
          g.fillStyle = '#0b0710'; g.fillRect(px, py, pw, ph);
          g.beginPath(); g.rect(px + u * .9, py + u * .9, pw - u * 1.8, ph - u * 1.8); neon(g, sg.hue2, a * .7, Math.max(1, u * .2));
          motif(g, sg, px + u * 1.2, py + u * 1.2, pw - u * 2.4, ph - u * 2.4, a, E);
          bulbRect(px + u * .35, py + u * .35, pw - u * .7, ph - u * .7, sp);
        } else if (sg.kind === 'pylon') {                  // tall blade sign: a stack of diamonds lit like a level meter
          const pw = 3.4 * u, ph = Math.min(b.hU * .65, 26) * u + 6 * u, px = cx + sg.side * (b.wpx / 2 - pw * .3) - pw / 2, py = ty - 6 * u;
          g.fillStyle = '#0b0710'; g.fillRect(px, py, pw, ph);
          const n = Math.max(3, Math.floor((ph - 2 * u) / (2.4 * u))), on = Math.round(b.level * n), dw = pw * .3;
          for (const [from, to, hue, al] of [[0, on, sg.hue, a], [on, n, sg.hue, .12]]) {
            if (to <= from) continue;
            g.fillStyle = `hsla(${hue},100%,${50 + 25 * al}%,${al < .2 ? .35 : 1})`; g.beginPath();
            for (let k = from; k < to; k++) { const dy = py + ph - u * 1.5 - k * (ph - 2 * u) / n, dx = px + pw / 2; g.moveTo(dx, dy - dw); g.lineTo(dx + dw, dy); g.lineTo(dx, dy + dw); g.lineTo(dx - dw, dy); g.closePath(); }
            g.fill();
          }
          g.beginPath(); g.rect(px, py, pw, ph); neon(g, sg.hue2, a, Math.max(1, u * .22));
          bulbRect(px + u * .5, py + u * .5, pw - u, ph - u, sp);
        } else {                                           // a giant bent arrow swooping down to the door, bulbs racing to the tip
          const s = sg.side, x0 = cx - s * tw * .25, y0 = ty - 6 * u, qx = cx + s * tw * .62, qy = ty - 9 * u, x1 = cx + s * tw * .4, y1 = ty + Math.min(b.hU * .4, 10) * u;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(qx, qy, x1, y1);
          g.strokeStyle = `hsla(${sg.hue},100%,60%,${.5 * a})`; g.lineWidth = u * 2.8; g.stroke();
          g.strokeStyle = '#0b0710'; g.lineWidth = u * 2.1; g.stroke();
          const dx = x1 - qx, dy = y1 - qy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, hw = u * 2.2;
          g.beginPath(); g.moveTo(x1 + ux * hw * 1.4, y1 + uy * hw * 1.4); g.lineTo(x1 - uy * hw, y1 + ux * hw); g.lineTo(x1 + uy * hw, y1 - ux * hw); g.closePath();
          g.fillStyle = '#0b0710'; g.fill(); neon(g, sg.hue, a, Math.max(1, u * .25));
          const n = Math.max(6, Math.round(Math.hypot(qx - x0, qy - y0) * 1.6 / sp));
          for (let k = 0; k <= n; k++) { const t = k / n, it = 1 - t; bulb(it * it * x0 + 2 * it * t * qx + t * t * x1, it * it * y0 + 2 * it * t * qy + t * t * y1, -k); }
        }
        if (b.burst) {                                     // a starburst on a pole, flaring on the presence band
          const bx = cx + b.burst.fx * tw, by = ty - (sg.kind === 'marquee' ? sg.ph + 1.4 : 0) * u - b.burst.h * u;
          g.fillStyle = '#100a14'; g.fillRect(bx - u * .2, by, u * .4, b.burst.h * u + (sg.kind === 'marquee' ? sg.ph * u : 0));
          const f = E.bands[5].flash;
          g.beginPath(); star(g, bx, by, u * (2.2 + 1.3 * f), u * .5, 6, E.t / 2500); neon(g, b.burst.hue, Math.max(a, f), Math.max(1, u * .22));
          g.fillStyle = `hsl(${b.burst.hue},100%,${60 + 30 * f}%)`; g.beginPath(); g.arc(bx, by, Math.max(1.5, u * .5), 0, 7); g.fill();
        }
        flushBulbs(g, E);
      },
      ground: { h: .16, draw(g, E) {                       // wide boulevard: sidewalk, lanes, light streaks and palms
        const { W, H, GY, unit: u, travel, t } = E, gh = H - GY;
        g.fillStyle = '#17111f'; g.fillRect(0, GY, W, gh * .14);
        g.fillStyle = '#09070e'; g.fillRect(0, GY + gh * .14, W, gh * .86);
        const rf = g.createLinearGradient(0, GY + gh * .14, 0, H);   // sign glow on the wet-look tarmac
        rf.addColorStop(0, 'rgba(255,70,180,.16)'); rf.addColorStop(1, 'rgba(80,200,255,.05)');
        g.fillStyle = rf; g.fillRect(0, GY + gh * .14, W, gh * .86);
        g.fillStyle = 'rgba(255,120,210,.35)'; g.fillRect(0, GY + gh * .14, W, 1);
        g.fillStyle = 'rgba(255,220,120,.45)';
        const dash = 3 * u;
        for (const ly of [.42, .72]) for (let x = -(travel % (dash * 2)) - dash * 2; x < W; x += dash * 2) g.fillRect(x, GY + gh * ly, dash, Math.max(1, gh * .025));
        const streak = (lane, dir, col, n) => {            // cruising cars as light streaks
          g.fillStyle = col;
          for (let k = 0; k < n; k++) {
            const span = W + 20 * u, x = ((hash(k, lane, 7) * span + dir * t / 1000 * u * (6 + 4 * hash(k, lane, 8)) - travel) % span + span) % span - 10 * u;
            g.fillRect(x, GY + gh * lane, u * 2.5, Math.max(1, gh * .035));
          }
        };
        const n = Math.max(2, Math.round(W / (u * 22)));
        streak(.3, -1, 'rgba(255,60,60,.75)', n); streak(.56, -1, 'rgba(255,60,60,.6)', n);
        streak(.84, 1, 'rgba(255,245,210,.8)', n); streak(.62, 1, 'rgba(255,245,210,.6)', n);
        const spc = 26 * u, ph = 13 * u;                   // palm silhouettes along the sidewalk
        g.strokeStyle = g.fillStyle = '#050309';
        for (let k = Math.floor((travel - spc) / spc); k * spc - travel < W + spc; k++) {
          const x = k * spc - travel + hash(k, 3, 3) * spc * .4, by = GY + gh * .12, lean = (hash(k, 4, 4) - .5) * 4 * u, tx = x + lean, ty = by - ph * (.8 + .3 * hash(k, 5, 5));
          g.lineWidth = Math.max(1.5, u * .55); g.beginPath(); g.moveTo(x, by); g.quadraticCurveTo(x + lean * .1, (by + ty) / 2, tx, ty); g.stroke();
          g.lineWidth = Math.max(1, u * .5); g.beginPath();
          for (let f = 0; f < 7; f++) {
            const a = -Math.PI * (.05 + f * .15) + Math.sin(t / 1600 + k + f) * .04, L = u * (4 + 1.5 * hash(k, f, 6));
            g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * .7, ty + Math.sin(a) * L * .7 - u, tx + Math.cos(a) * L, ty + Math.sin(a) * L + u * 1.6);
          }
          g.stroke();
        }
      } },
    });
  }
})();
