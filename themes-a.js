// City Pulse plugin: themed cities (themes-a). Loaded by index.html after the core script, before start().
// Register with CityPulse.registerTheme(key, def); see the field list above registerTheme in index.html.
// Aero, Atlantis, Abyssal City, Aurora Harbor and Lunar Colony.
(() => {
'use strict';
const CP = window.CityPulse;
if (!CP) return;
const { registerTheme, hash, sprite, pixelArt } = CP;
const TAU = Math.PI * 2, CLEAR = 'rgba(0,0,0,0)';

// ---------- shared helpers ----------
const mk = (w, h, draw) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); draw(c.getContext('2d'), c.width, c.height); return c; };
const dpr = () => window.devicePixelRatio || 1;
// Hooks may run at partial opacity (the tour's crossfade), so alpha is always multiplied, then restored.
const withAlpha = (g, a, fn) => { const a0 = g.globalAlpha; g.globalAlpha = a0 * Math.max(0, Math.min(1, a)); fn(); g.globalAlpha = a0; };
const glow = (g, rgb, x, y, r, a) => withAlpha(g, a, () => g.drawImage(sprite(rgb), x - r, y - r, 2 * r, 2 * r));
const lin = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [p, c] of stops) gr.addColorStop(p, c); return gr; };
const keyOf = E => `${E.W}x${E.H}x${E.unit}x${E.widget}`;

// Pixel sprites (rows of palette keys, facing right), rendered once per size and direction, then blitted.
function pix(sp, px, flip) {
  const d = dpr(), P = Math.max(1, Math.round(px * d)), k = P + (flip ? 'f' : 'r'), c = sp.c || (sp.c = {});
  if (!c[k]) {
    const n = Math.max(...sp.rows.map(r => r.length)), rows = sp.rows.map(r => r.padEnd(n, '.'));
    const rr = flip ? rows.map(r => [...r].reverse().join('')) : rows;
    c[k] = mk(n * P, rows.length * P, g => pixelArt(g, rr, sp.pal, 0, 0, P));
  }
  return c[k];
}
const drawPix = (g, sp, px, x, y, flip) => { const c = pix(sp, px, flip), d = dpr(); g.drawImage(c, Math.round(x), Math.round(y), c.width / d, c.height / d); };
const pxOf = (E, k = .38) => Math.max(1, Math.round(E.unit * k));
const spW = (sp, px) => Math.max(...sp.rows.map(r => r.length)) * Math.max(1, Math.round(px));
const spH = (sp, px) => sp.rows.length * Math.max(1, Math.round(px));
const PAL = (rows, pal) => ({ rows, pal });

// A swimmer wraps by a fixed span, so a school keeps its shape across the wrap. par = how much it moves with the scroll.
function swim(c, E, speedMul = 1) {
  const span = E.W + 2 * c.m;
  c.x += (c.dir * c.v * speedMul - E.scrollV * (c.par ?? 1)) * E.dt;
  if (c.x > E.W + c.m) c.x -= span; else if (c.x < -c.m) c.x += span;
}

// A glossy soap/air bubble, drawn once and scaled.
const BUB = mk(64, 64, x => {
  const rg = x.createRadialGradient(32, 32, 8, 32, 32, 31);
  rg.addColorStop(0, 'rgba(255,255,255,.03)'); rg.addColorStop(.72, 'rgba(200,255,255,.14)'); rg.addColorStop(1, 'rgba(235,255,255,.6)');
  x.fillStyle = rg; x.beginPath(); x.arc(32, 32, 30.5, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.65)'; x.lineWidth = 1.5; x.stroke();
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(22, 20, 8, 4.5, -.7, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(43, 45, 4, 2, -.7, 0, TAU); x.fill();
});
// Rising bubbles: `rate` new ones per second from pickX(), y0; they wobble up and vanish above the top.
function bubbleStep(st, E, rate, max, pickX, y0, r0, r1, v0) {
  st.acc = (st.acc || 0) + rate * E.dt;
  for (; st.acc >= 1; st.acc--) if (st.list.length < max) st.list.push({ x: pickX(), y: y0(), r: r0 + (r1 - r0) * Math.random(), v: v0 * (.7 + .6 * Math.random()), ph: Math.random() * TAU });
  const u = E.unit;
  for (let i = st.list.length - 1; i >= 0; i--) {
    const b = st.list[i];
    b.y -= b.v * E.dt; b.x += (Math.cos(E.t / 650 + b.ph) * u * .8 - E.scrollV) * E.dt;
    if (b.y < -b.r * 2) st.list.splice(i, 1);
  }
}
const bubbleDraw = (g, list) => { for (const b of list) g.drawImage(BUB, b.x - b.r, b.y - b.r, 2 * b.r, 2 * b.r); };

// Tileable caustic net (Voronoi cell edges), built once on first use: dancing sunlight on sand and marble.
let causticC = null;
function caustic() {
  if (causticC) return causticC;
  const n = 192, pts = Array.from({ length: 16 }, (_, i) => [hash(i, 1, 77) * n, hash(i, 2, 77) * n]);
  return causticC = mk(n, n, x => {
    const img = x.createImageData(n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let xx = 0; xx < n; xx++) {
      let f1 = 1e9, f2 = 1e9;
      for (const [px, py] of pts) {
        let dx = Math.abs(xx - px), dy = Math.abs(y - py);
        if (dx > n / 2) dx = n - dx; if (dy > n / 2) dy = n - dy;
        const dd = dx * dx + dy * dy;
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const v = Math.max(0, 1 - (Math.sqrt(f2) - Math.sqrt(f1)) / 6), i = (y * n + xx) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = v * v * 255;
    }
    x.putImageData(img, 0, 0);
  });
}
const pats = new WeakMap();
function causticFill(g, ox, oy, x, y, w, h, s) {        // pattern fill of a rect, the net shifted by (ox, oy) and scaled s
  let p = pats.get(g); if (!p) pats.set(g, p = g.createPattern(caustic(), 'repeat'));
  g.save(); g.translate(ox, oy); g.scale(s, s); g.fillStyle = p; g.fillRect((x - ox) / s, (y - oy) / s, w / s, h / s); g.restore();
}
// Walk the stacked tiers of a generated building: fn(x0, yTop, w, h, tier).
function eachTier(b, cx, E, fn) { let y = E.GY; for (const tr of b.tiers) { const tw = tr.w * E.unit, th = tr.h * E.unit; fn(cx - tw / 2, y - th, tw, th, tr); y -= th; } }
const avg = (bands, a, z) => { let s = 0; for (let k = a; k <= z; k++) s += bands[k].level; return s / (z - a + 1); };

// =====================================================================================================
// Aero: glossy glass towers in a bright aqua sky, a green park, wind turbines on the hills and soap bubbles.
// Music: turbines spin up on the bass, the sun swells with the kick, glass glints on each building's hits.
{
  const st = { key: '', bub: { list: [] }, rot: 0, hills: null, hk: '', tree: null, tk: 0, gk: '', gg: null };
  const sheen = mk(64, 2, (x, w) => { x.fillStyle = lin(x, 0, 0, w, 0, [[0, 'rgba(255,255,255,.6)'], [.16, 'rgba(255,255,255,.14)'], [.42, 'rgba(255,255,255,0)'],
    [.62, 'rgba(255,255,255,.22)'], [.7, 'rgba(255,255,255,0)'], [1, 'rgba(0,70,110,.16)']]); x.fillRect(0, 0, w, 2); });
  const gloss = mk(2, 64, (x, w, h) => { x.fillStyle = lin(x, 0, 0, 0, h, [[0, 'rgba(255,255,255,.4)'], [.48, 'rgba(255,255,255,.1)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, w, h); });
  const TURB = [[.08, .95], [.24, 1.15], [.61, 1], [.83, 1.2]];   // turbine spots (share of the hill strip) and sizes
  const hillY = (xf, back, hh) => back ? hh * (1 - .62 - .22 * Math.sin(TAU * 2 * xf + 1.3) - .1 * Math.sin(TAU * 5 * xf + .4))
                                       : hh * (1 - .3 - .14 * Math.sin(TAU * 3 * xf + 2) - .06 * Math.sin(TAU * 7 * xf));
  function hills(E) {                                     // two rolling hill layers, one strip per layer, as wide as the screen
    const k = keyOf(E); if (st.hk === k) return st.hills; st.hk = k;
    const { W, GY } = E, hh = GY * (E.widget ? .2 : .16), d = dpr();
    const layer = back => mk(W * d, hh * d, x => {
      x.scale(d, d); x.beginPath(); x.moveTo(0, hh);
      for (let i = 0; i <= 120; i++) x.lineTo(W * i / 120, hillY(i / 120, back, hh));
      x.lineTo(W, hh); x.closePath();
      x.fillStyle = lin(x, 0, 0, 0, hh, back ? [[0, '#a6e88a'], [1, '#62c24c']] : [[0, '#7fe05a'], [1, '#3da42e']]); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.5; x.beginPath();
      for (let i = 0; i <= 120; i++) x[i ? 'lineTo' : 'moveTo'](W * i / 120, hillY(i / 120, back, hh) + 1);
      x.stroke();
    });
    return st.hills = { back: layer(true), front: layer(false), hh };
  }
  function turbine(g, x, by, ht, rot) {
    const w0 = Math.max(1, ht * .028), w1 = Math.max(.6, ht * .012), L = ht * .55, hy = by - ht;
    g.fillStyle = '#f6fcff'; g.beginPath(); g.moveTo(x - w0, by); g.lineTo(x - w1, hy); g.lineTo(x + w1, hy); g.lineTo(x + w0, by); g.fill();
    g.fillStyle = 'rgba(120,170,200,.35)'; g.beginPath(); g.moveTo(x, by); g.lineTo(x, hy); g.lineTo(x + w1, hy); g.lineTo(x + w0, by); g.fill();
    g.fillStyle = '#eef7fb'; g.fillRect(x - ht * .03, hy - ht * .018, ht * .075, ht * .036);
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) { g.save(); g.translate(x, hy); g.rotate(rot + k * TAU / 3); g.beginPath(); g.ellipse(0, -L / 2, Math.max(.8, L * .045), L / 2, 0, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = '#d7e9f2'; g.beginPath(); g.arc(x, hy, Math.max(1, ht * .022), 0, TAU); g.fill();
  }
  function treeSprite(u) {
    if (st.tk === u) return st.tree; st.tk = u;
    const d = dpr(), r = 2.3 * u, w = r * 2.6, h = r * 3.2;
    return st.tree = mk(w * d, h * d, x => {
      x.scale(d, d);
      x.fillStyle = '#8a5a34'; x.fillRect(w / 2 - u * .3, h - r * 1.2, u * .6, r * 1.2);
      const cy = h - r * 1.15 - r * .9;
      const rg = x.createRadialGradient(w / 2 - r * .35, cy - r * .4, r * .1, w / 2, cy, r * 1.15);
      rg.addColorStop(0, '#c6f78a'); rg.addColorStop(.5, '#5ccf3e'); rg.addColorStop(1, '#2f8f2a');
      x.fillStyle = rg; x.beginPath(); x.arc(w / 2, cy, r, 0, TAU); x.arc(w / 2 - r * .55, cy + r * .35, r * .65, 0, TAU); x.arc(w / 2 + r * .55, cy + r * .35, r * .65, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(w / 2 - r * .35, cy - r * .5, r * .38, r * .2, -.5, 0, TAU); x.fill();
    });
  }
  const sync = E => { const k = keyOf(E); if (st.key === k) return; st.key = k;
    st.bub.list = Array.from({ length: E.widget ? 4 : 9 }, () => ({ x: Math.random() * E.W, y: Math.random() * E.GY, r: E.unit * (1 + 1.6 * Math.random()) * (E.widget ? 1.4 : 1.2), v: E.unit * (1.6 + Math.random() * 1.6), ph: Math.random() * TAU })); };
  const glint = (g, x, y, s, a) => withAlpha(g, a, () => {
    g.drawImage(sprite('255,255,255'), x - s, y - s, 2 * s, 2 * s);
    g.fillStyle = '#fff'; g.fillRect(x - s * 1.7, y - .6, s * 3.4, 1.2); g.fillRect(x - .6, y - s * 1.7, 1.2, s * 3.4);
  });
  registerTheme('aero', { name: 'Aero',
    kit: { styles: ['ribbon', 'grid', 'slim', 'ribbon', 'tall'], roofs: [null, null, ['dome', 4], ['antenna', 5], ['spire', 6], null], tall: .35, shrink: .82, w0: 7, gaps: [.6, 1.6] },
    minF: .25, maxF: .75,
    sky: [[0, '#0a6fd6'], [.4, '#2fb0f0'], [.78, '#a6e6ff'], [1, '#effcff']], skyToGround: true,
    drawSky(g, E) {                                      // the sun's glow with a soft lens flare across the sky
      const { W, GY } = E, m = Math.min(W, E.H), sx = W * .15, sy = GY * .17, p = .8 + .2 * E.bassFlash;
      glow(g, '255,255,225', sx, sy, m * .42 * p, .85);
      glow(g, '255,255,255', sx, sy, m * .09, 1); glow(g, '255,255,255', sx, sy, m * .05, 1);
      const dx = W * .55 - sx, dy = GY * .55 - sy;
      for (const [k, r, c, a] of [[.45, .05, '190,255,230', .3], [.75, .022, '170,225,255', .4], [1.2, .085, '210,255,215', .14], [1.45, .035, '255,255,255', .22]])
        glow(g, c, sx + dx * k, sy + dy * k, m * r, a);
    },
    stars: false, moon: false, cloud: 'rgba(255,255,255,.82)', rain: 'rgba(255,255,255,.45)', fogRGB: '235,250,255',
    body: '#c9eef6', side: '#7fc3d8', top: '#f4feff', outline: () => 'rgba(255,255,255,.85)',
    win: c => ({ h: 165 + c.h / 360 * 55, s: Math.min(100, c.s), m: c.m }),
    back: { h: .75, density: .6, body: '#9cd6ea', win: () => 'rgba(255,255,255,.4)' },
    searchlights: false,
    drawBehind(g, E) {                                   // rolling hills with slow wind turbines, sliding at a quarter speed
      sync(E);
      const H = hills(E), { W, GY } = E, ox = ((E.travel * .25) % W + W) % W, top = GY - H.hh;
      st.rot += E.dt * (.45 + 3 * E.bassFlash);
      g.drawImage(H.back, -ox, top, W, H.hh); g.drawImage(H.back, W - ox, top, W, H.hh);
      TURB.forEach(([xf, s], i) => {
        let x = xf * W - ox; if (x < -W * .1) x += W;
        turbine(g, x, top + hillY(xf, true, H.hh) + 2, H.hh * 1.25 * s, st.rot + i * 1.7);
      });
      g.drawImage(H.front, -ox, top, W, H.hh); g.drawImage(H.front, W - ox, top, W, H.hh);
    },
    drawExtras(g, b, cx, tip, E) {                       // glossy glass: a vertical sheen and a bright upper half per tier
      if (b.lm) return;
      eachTier(b, cx, E, (x0, y, w, h) => { g.drawImage(sheen, x0, y, w, h); g.drawImage(gloss, x0, y, w, Math.min(h, w * 1.6)); });
      if (b.flash > .25) glint(g, cx - b.wpx * (.1 + .25 * hash(b.id, 4, 4)), E.GY - b.hU * E.unit * (.35 + .55 * hash(b.id, 5, 5)), (1 + 1.8 * b.flash) * E.unit, b.flash);
    },
    drawFront(g, E) {                                    // a few soap bubbles drifting up
      sync(E);
      const { dt, t, unit: u, W, GY } = E, lift = 1 + .8 * avg(E.bands, 3, 5);
      for (const b of st.bub.list) {
        b.y -= b.v * lift * dt; b.x += (Math.sin(t / 1400 + b.ph) * u * .6 - E.scrollV * .7) * dt;
        if (b.y < -b.r * 2) { b.y = GY + b.r; b.x = Math.random() * W; }
        if (b.x < -b.r * 2) b.x += W + b.r * 4; else if (b.x > W + b.r * 2) b.x -= W + b.r * 4;
      }
      bubbleDraw(g, st.bub.list);
    },
    ground: { h: .1, draw(g, E) {                        // bright park: glossy grass, a path and round trees
      const { W, H, GY, unit: u, travel } = E, gh = H - GY, k = `${GY},${H}`;
      if (st.gk !== k) { st.gk = k; st.gg = lin(g, 0, GY, 0, H, [[0, '#7ee04f'], [.5, '#4fc23a'], [1, '#2f9a2a']]); }
      g.fillStyle = st.gg; g.fillRect(0, GY, W, gh);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, GY, W, Math.max(1, gh * .07));
      g.fillStyle = 'rgba(255,250,222,.8)'; g.fillRect(0, GY + gh * .64, W, Math.max(1, gh * .12));
      const tr = treeSprite(u), d = dpr(), tw = tr.width / d, th = tr.height / d, sp = 12 * u;
      for (let i = Math.floor((travel - 8 * u) / sp); i * sp - travel < W + 8 * u; i++) {
        if (hash(i, 7, 3) < .3) continue;
        const x = i * sp - travel + hash(i, 1, 2) * sp * .5, s = .75 + .5 * hash(i, 3, 4);
        g.drawImage(tr, x - tw * s / 2, GY + gh * .5 - th * s, tw * s, th * s);
      }
    } },
  });
}

// =====================================================================================================
// Atlantis: a sunlit, shallow-water city of marble temples on a sandy seabed with coral, seaweed and fish.
// Music: fish schools dart on the kick, more bubbles on bass, caustics and light rays shimmer with the treble.
{
  const FISH = [
    PAL(['...aa...', 'b.aaaaa.', 'bbaaaaka', 'b.aaaaa.', '...aa...'], { a: '#ffcf3a', b: '#ff8a1e', k: '#1a1a1a' }),
    PAL(['...aa...', 'b.aaaaa.', 'bbawaaka', 'b.aaaaa.', '...aa...'], { a: '#3fc3ff', b: '#1d6fd6', w: '#e8fbff', k: '#0a1a2a' }),
    PAL(['..aaa...', 'b.aaaaa.', 'bbaaaaka', 'b.wwwww.', '...ww...'], { a: '#c8d6e0', b: '#8aa0b0', w: '#f4fbff', k: '#1a1a1a' }),
    PAL(['...a....', 'b.aawa..', 'bbaawaka', 'b.aawa..', '...a....'], { a: '#ff6a3a', w: '#ffffff', b: '#ff6a3a', k: '#1a1a1a' }),
  ];
  const TPAL = { S: '#2f6b3a', s: '#5e9c4a', H: '#9cc36a', K: '#11220f', F: '#86b35a', B: '#d8d48a' };
  const TURTLE = [
    PAL(['......SSSSS......', '....SSsSSsSSS....', '...SsSSsSSsSSS.HH', '..SSSsSSsSSsSSHHK', '..SSSSSSSSSSSSHHH', '...BBBBBBBBBB....', '.FF.........FF...', 'FF...........FF..'], TPAL),
    PAL(['......SSSSS......', '....SSsSSsSSS....', '...SsSSsSSsSSS.HH', '..SSSsSSsSSsSSHHK', 'FFSSSSSSSSSSSSHHH', '.FFBBBBBBBBBBFF..', '..............FF.', '.................'], TPAL),
  ];
  const WHALE = PAL(['...........WWWWWWWW........', '.ww.....WWWWWWWWWWWWWW.....', '.www..WWWWWWWWWWWWWWWWWW...', '..wwWWWWWWWWWWWWWWWWWWWWW..',
    '..wWWWWWWWWWWWWWWWWWWWWWKWW', '.ww..WWWWWWWWWWWWWWWWWWWWWW', '.......LLLLLLLLLLLLLLLLLLL.', '..........FF....LLLLLL.....', '...........FF..............'],
    { W: '#2d6f8c', w: '#2d6f8c', L: '#5a9ab2', K: '#0e2a38', F: '#2d6f8c' });
  const st = { key: '', fish: [], back: [], turtle: null, whale: null, bub: { list: [] }, wk: '', wash: null, rays: null, ck: 0, coral: null };
  function sync(E) {
    const k = keyOf(E); if (st.key === k) return; st.key = k;
    const { W, GY, unit: u } = E, px = pxOf(E), w = E.widget;
    st.fish = []; st.back = []; st.bub.list = [];
    const school = (out, sp, n, y0, dir, v, p, par) => { const x0 = Math.random() * W, m = 16 * u + spW(sp, p);
      for (let i = 0; i < n; i++) out.push({ sp, px: p, dir, v, par, m, x: x0 + (Math.random() - .5) * 12 * u, y: y0 + (Math.random() - .5) * 6 * u, ph: Math.random() * TAU }); };
    for (let s = 0; s < (w ? 2 : 4); s++) school(st.fish, FISH[s], w ? 4 : 6 + (s * 3) % 5, GY * (.2 + .17 * s), s % 2 ? -1 : 1, u * (3 + 1.5 * s % 3), px, 1);
    for (let s = 0; s < (w ? 0 : 2); s++) school(st.back, FISH[(s + 2) % 4], 8, GY * (.3 + .3 * s), s ? 1 : -1, u * 2, Math.max(1, px - 1), .5);
    st.turtle = { sp: TURTLE[0], px: px + 1, dir: 1, v: u * 1.7, par: 1, m: spW(TURTLE[0], px + 1) + 4 * u, x: W * .3, y: GY * (w ? .18 : .32), ph: 0 };
    st.whale = w ? null : { sp: WHALE, px: px * 2, dir: -1, v: u * .9, par: .3, m: spW(WHALE, px * 2) + 4 * u, x: W * .75, y: GY * .1, ph: 0 };
  }
  function coralSprites(u) {
    if (st.ck === u) return st.coral; st.ck = u;
    const d = dpr(), sz = 9 * u;
    const branch = (x, c, x0, y0, a, len, depth) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      x.strokeStyle = c; x.lineWidth = Math.max(1, u * .35 * (depth + 1) / 3); x.lineCap = 'round';
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      if (depth > 0) { branch(x, c, x1, y1, a - .45, len * .72, depth - 1); branch(x, c, x1, y1, a + .4, len * .7, depth - 1); }
    };
    const one = (c) => mk(sz * d, sz * d, x => { x.scale(d, d); branch(x, c, sz / 2, sz, -Math.PI / 2, sz * .32, 3); });
    const brain = mk(sz * d, sz * d, x => { x.scale(d, d); x.fillStyle = '#e88a6a'; x.beginPath(); x.ellipse(sz / 2, sz, sz * .3, sz * .22, 0, Math.PI, TAU); x.fill();
      x.strokeStyle = 'rgba(120,40,30,.4)'; x.lineWidth = 1; for (let i = 1; i < 4; i++) { x.beginPath(); x.ellipse(sz / 2, sz, sz * .3 * i / 4, sz * .22 * i / 4, 0, Math.PI, TAU); x.stroke(); } });
    return st.coral = [one('#ff7aa8'), one('#ff9a4a'), brain, one('#c77dff')];
  }
  function drawTemple(g, b, cx, tip, E) {               // plinth steps, colonnade or arcade, cornice and pediment or a gilded finial
    const u = E.unit, GY = E.GY, bw = b.tiers[0].w * u, bh = b.tiers[0].h * u;
    if (b.temple) {
      const n = Math.max(3, Math.round(bw / (2.6 * u))), cw = Math.max(1, u * .8), colH = Math.min(bh, 22 * u);
      for (let i = 0; i < n; i++) {
        const x = cx - bw / 2 + u * .6 + (bw - u * 1.2 - cw) * i / (n - 1);
        g.fillStyle = '#f2ecda'; g.fillRect(x, GY - colH, cw, colH);
        g.fillStyle = 'rgba(120,110,90,.25)'; g.fillRect(x + cw * .6, GY - colH, cw * .4, colH);
        g.fillStyle = '#f7f2e4'; g.fillRect(x - u * .25, GY - colH, cw + u * .5, u * .5);
      }
      g.fillStyle = '#efe8d4'; g.fillRect(cx - bw * .53, GY - colH - u * .9, bw * 1.06, u * .9);
    } else if (b.arcade) {
      const n = Math.max(2, Math.floor(bw / (3.4 * u))), aw = bw / n * .58, ah = Math.min(bh * .8, 4 * u);
      g.fillStyle = '#245866';
      for (let i = 0; i < n; i++) {
        const x = cx - bw / 2 + bw / n * (i + .5);
        g.beginPath(); g.moveTo(x - aw / 2, GY - u * 1.2); g.lineTo(x - aw / 2, GY - ah + aw / 2); g.arc(x, GY - ah + aw / 2, aw / 2, Math.PI, TAU); g.lineTo(x + aw / 2, GY - u * 1.2); g.fill();
      }
    }
    g.fillStyle = '#ece5cf'; g.fillRect(cx - bw * .57, GY - u * .6, bw * 1.14, u * .6);
    g.fillStyle = '#d9d1b9'; g.fillRect(cx - bw * .53, GY - u * 1.2, bw * 1.06, u * .6);
    const tw = b.tiers[b.tiers.length - 1].w * u, ty = GY - b.hU * u;
    if (b.roof && b.roof[0] === 'dome') {
      g.fillStyle = '#e9c35a'; g.fillRect(tip[0] - Math.max(.5, u * .15), tip[1] - u * 1.6, Math.max(1, u * .3), u * 1.6);
      g.beginPath(); g.arc(tip[0], tip[1] - u * 1.7, Math.max(1, u * .4), 0, TAU); g.fill();
    } else if (!b.roof) {
      g.fillStyle = '#efe8d4'; g.fillRect(cx - tw * .55, ty - u * .8, tw * 1.1, u * .8);
      if (b.pediment) {
        g.fillStyle = '#f5f0e0'; g.beginPath(); g.moveTo(cx - tw * .56, ty - u * .8); g.lineTo(cx, ty - u * .8 - tw * .2); g.lineTo(cx + tw * .56, ty - u * .8); g.fill();
        g.strokeStyle = 'rgba(150,140,115,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - tw * .42, ty - u * 1.1); g.lineTo(cx, ty - u * .9 - tw * .15); g.lineTo(cx + tw * .42, ty - u * 1.1); g.closePath(); g.stroke();
      }
    }
  }
  registerTheme('atlantis', { name: 'Atlantis',
    kit: { styles: ['cols', 'pairs', 'tall', 'cols', 'wide'], roofs: [['dome', 6], ['dome', 8], ['pyramid', 3], null, null, ['spire', 7]], tall: .3, shrink: .78, w0: 8, gaps: [.8, 1.8], setbacks: true },
    minF: .25, maxF: .62, noWeather: true, planes: false, roofLights: false, stars: false, moon: false, cloud: CLEAR, rain: CLEAR, fogRGB: '120,210,220',
    sky: [[0, '#8ff0ff'], [.22, '#36c2dc'], [.65, '#127fa8'], [1, '#0a5e86']], skyToGround: true,
    drawSky(g, E) {                                      // the bright, rippling surface far above
      const { W, GY, t } = E, hi = .45 + .5 * avg(E.bands, 5, 7), bh = Math.ceil(GY * .22);
      if (!st.surf || st.surf.width !== Math.ceil(W) || st.surf.height !== bh) { st.surf = mk(W, bh, () => {}); st.sx = st.surf.getContext('2d'); st.sm = lin(st.sx, 0, 0, 0, bh, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]); }
      const x = st.sx;                                   // two drifting nets, faded out downward
      x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, bh);
      x.globalAlpha = .8; causticFill(x, t * .012, t * .006, 0, 0, W, bh, 1.3); x.globalAlpha = .5; causticFill(x, -t * .009, t * .004, 0, 0, W, bh, 1.9);
      x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.fillStyle = st.sm; x.fillRect(0, 0, W, bh);
      withAlpha(g, hi, () => g.drawImage(st.surf, 0, 0, W, bh));
    },
    body: '#e6dfca', side: '#b3ab95', top: '#f5f0e2',
    win: c => ({ h: 150 + c.h / 360 * 60, s: c.s * .75, m: c.m }),
    back: { h: .8, density: .7, body: '#4aa3b8', win: () => 'rgba(210,255,245,.3)' },
    searchlights: false,
    decorate(b, r) { b.temple = r() < .45; b.arcade = !b.temple && r() < .6; b.pediment = r() < .75; },
    drawExtras(g, b, cx, tip, E) { if (!b.lm) drawTemple(g, b, cx, tip, E); },
    drawBehind(g, E) {                                   // a whale far off and faint fish schools in the blue
      sync(E);
      const { t, GY } = E;
      if (st.whale) { swim(st.whale, E); withAlpha(g, .45, () => drawPix(g, st.whale.sp, st.whale.px, st.whale.x, st.whale.y + Math.sin(t / 3000) * E.unit, st.whale.dir < 0)); }
      withAlpha(g, .5, () => { for (const f of st.back) { swim(f, E); drawPix(g, f.sp, f.px, f.x, f.y + Math.sin(t / 800 + f.ph) * E.unit * .4, f.dir < 0); } });
    },
    drawFront(g, E) {
      sync(E);
      const { W, H, GY, t, unit: u, dt } = E, tre = avg(E.bands, 5, 7);
      if (!E.widget) {                                   // blue-green water wash over the city, slanting light rays, dancing caustics
        const k = `${W},${GY}`;
        if (st.wk !== k) { st.wk = k; st.wash = lin(g, 0, 0, 0, GY, [[0, 'rgba(60,200,220,.06)'], [1, 'rgba(10,110,140,.26)']]); st.rays = lin(g, 0, 0, 0, GY, [[0, 'rgba(255,255,240,.32)'], [1, 'rgba(255,255,240,0)']]); }
        g.fillStyle = st.wash; g.fillRect(0, 0, W, GY);
        g.fillStyle = st.rays;
        for (let i = 0; i < 6; i++) {
          const x = W * (i + .3 + .25 * Math.sin(t / 7000 + i * 2.1)) / 6, w = W * (.02 + .02 * hash(i, 1, 9)), sl = W * .12;
          withAlpha(g, (.35 + .35 * Math.sin(t / 2300 + i * 1.7)) * (.7 + .8 * tre), () => { g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x + w, 0); g.lineTo(x + sl + w * 2.5, GY); g.lineTo(x + sl - w * 2.5, GY); g.fill(); });
        }
        withAlpha(g, .02 + .04 * tre, () => causticFill(g, t * .01, t * .004, 0, 0, W, GY, 1.4));
      }
      const dart = 1 + 2.2 * E.bands[1].flash;           // fish dart on the kick
      for (const f of st.fish) { swim(f, E, dart); drawPix(g, f.sp, f.px, f.x, f.y + Math.sin(t / 700 + f.ph) * u * .5, f.dir < 0); }
      const tu = st.turtle; swim(tu, E); drawPix(g, TURTLE[Math.floor(t / 450) % 2], tu.px, tu.x, tu.y + Math.sin(t / 1800) * u * 1.2, false);
      bubbleStep(st.bub, E, 2 + 30 * E.bassFlash, E.widget ? 25 : 90, () => (Math.floor(Math.random() * 7) + .5) / 7 * W + (Math.random() - .5) * 2 * u, () => GY + (H - GY) * .3, u * .25, u * .8, u * 9);
      bubbleDraw(g, st.bub.list);
    },
    ground: { h: .11, draw(g, E) {                       // sandy seabed with ripples, caustics, coral and swaying seaweed
      const { W, H, GY, unit: u, travel, t } = E, gh = H - GY;
      g.fillStyle = lin(g, 0, GY, 0, H, [[0, '#f2e4b4'], [1, '#c4ab74']]); g.fillRect(0, GY, W, gh);
      g.fillStyle = 'rgba(150,120,70,.18)'; for (let i = 1; i < 4; i++) g.fillRect(0, GY + gh * i / 4, W, Math.max(1, gh * .03));
      withAlpha(g, .3 + .25 * avg(E.bands, 5, 7), () => causticFill(g, t * .01 - travel, t * .005, 0, GY, W, gh, 1.2));
      const cs = coralSprites(u), d = dpr(), sp = 9 * u;
      for (let i = Math.floor((travel - 8 * u) / sp); i * sp - travel < W + 8 * u; i++) {
        if (hash(i, 2, 5) < .45) continue;
        const c = cs[Math.floor(hash(i, 3, 5) * cs.length)], s = .7 + .6 * hash(i, 4, 5), cw = c.width / d * s, ch = c.height / d * s;
        g.drawImage(c, i * sp - travel + hash(i, 5, 5) * sp - cw / 2, GY + gh * .55 - ch, cw, ch);
      }
      const sway = 1 + 1.5 * avg(E.bands, 2, 4), ws = 4 * u;
      for (const [col, seed] of [['#2f9a52', 1], ['#5cc06a', 2]]) {
        g.strokeStyle = col; g.lineWidth = Math.max(1, u * .6); g.lineCap = 'round'; g.beginPath();
        for (let i = Math.floor((travel - 4 * u) / ws); i * ws - travel < W + 4 * u; i++) {
          if (hash(i, seed, 11) < .55) continue;
          const x = i * ws - travel + hash(i, 6, seed) * ws, by = GY + gh * (.35 + .4 * hash(i, 7, seed)), h = u * (3 + 9 * hash(i, 8, seed));
          const sw = Math.sin(t / 900 + i * .7) * u * 1.2 * sway;
          g.moveTo(x, by); g.quadraticCurveTo(x - sw, by - h * .5, x + sw, by - h);
        }
        g.stroke();
      }
    } },
  });
}

// =====================================================================================================
// Abyssal City: glass domes and towers glowing cyan in the deep dark, marine snow, jellyfish and an anglerfish.
// Music: jellyfish pulse and jet upward on the bass, the angler's lure flares with the treble, vents throb with the kick.
{
  const jelly = (p, P) => [
    PAL(['..ppppp..', '.pPPPPPp.', 'pPPpPpPPp', 'ppppppppp', '.t.t.t.t.', '.t..t..t.', 't..t..t..', '.t..t..t.', '..t..t...'], { p, P, t: p }),
    PAL(['...ppp...', '..pPPPp..', '.pPPpPPp.', '.ppppppp.', '..t.t.t..', '..t.t.t..', '..t.t.t..', '.t.t.t...', '..t.t.t..', '..t...t..'], { p, P, t: p }),
  ];
  const JELLY = [[jelly('#ff7ad9', '#ffc4f0'), '255,110,220'], [jelly('#6af2ff', '#c8fbff'), '90,240,255'], [jelly('#b48cff', '#e2d4ff'), '170,130,255']];
  const ANGLER = PAL(['..........l.....', '........ll.l....', '.......l....O...', '....BBBBBB......', '..BBBBBBBBBB....', 'B.BBBBBBBBBBBe..', 'BBBBBBBBBBBBBBB.',
    'B.BBBBBBBTTTTTB.', '..BBBBBBBTBTBTB.', '....BBBBBBBBB...'], { l: '#3a4a50', O: '#d8fff6', B: '#2b4048', e: '#9ff', T: '#cfd8d0' });
  const GFISH = [PAL(['.aa..', 'aaaaw', '.aa..'], { a: '#3fffd0', w: '#ffffff' }), PAL(['.aa..', 'aaaaw', '.aa..'], { a: '#7ab8ff', w: '#ffffff' })];
  const st = { key: '', snow: [], jel: [], fish: [], ang: null, rk: '', ray: null, gk: '', gg: null };
  function sync(E) {
    const k = keyOf(E); if (st.key === k) return; st.key = k;
    const { W, GY, H, unit: u } = E, px = pxOf(E), w = E.widget;
    st.snow = Array.from({ length: Math.round(W * H / (w ? 3000 : 5500)) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * TAU }));
    st.jel = Array.from({ length: w ? 2 : 5 }, (_, i) => ({ j: JELLY[i % 3], x: W * (i + .5) / (w ? 2 : 5) + (Math.random() - .5) * W * .1, y: GY * (.2 + .6 * Math.random()), ph: Math.random() * TAU, px: px + (i % 2), par: .8 }));
    st.fish = [];
    for (let s = 0; s < (w ? 1 : 3); s++) { const x0 = Math.random() * W, y0 = GY * (.25 + .2 * s), dir = s % 2 ? -1 : 1;
      for (let i = 0; i < 5; i++) st.fish.push({ sp: GFISH[s % 2], px, dir, v: u * 3, par: 1, m: 12 * u, x: x0 + (Math.random() - .5) * 8 * u, y: y0 + (Math.random() - .5) * 4 * u, ph: Math.random() * TAU }); }
    st.ang = { sp: ANGLER, px: px + 2, dir: -1, v: u * 1.3, par: 1, m: spW(ANGLER, px + 2) + 6 * u, x: W * .7, y: GY * (w ? .45 : .62), ph: 0 };
  }
  registerTheme('abyss', { name: 'Abyssal City',
    kit: { styles: ['ribbon', 'slim', 'grid', 'cols', 'ribbon'], roofs: [null, null, ['antenna', 6], ['spire', 8], ['antenna2', 6], null], tall: .4, shrink: .8, w0: 7, gaps: [.6, 1.6] },
    minF: .3, maxF: .75, noWeather: true, planes: false, roofLights: false, stars: false, moon: false, cloud: CLEAR, rain: CLEAR, fogRGB: '20,80,100',
    sky: [[0, '#06283a'], [.35, '#03131f'], [1, '#00050a']], skyToGround: true,
    drawSky(g, E) {                                      // one faint god-ray reaching down from far above
      const { W, GY, t } = E, k = `${W},${GY}`;
      if (st.rk !== k) { st.rk = k; st.ray = lin(g, 0, 0, 0, GY * .8, [[0, 'rgba(120,220,255,.16)'], [1, 'rgba(120,220,255,0)']]); }
      const x = W * (.42 + .04 * Math.sin(t / 9000)), w = W * .07;
      withAlpha(g, .7 + .3 * Math.sin(t / 3100), () => { g.fillStyle = st.ray; g.beginPath(); g.moveTo(x - w, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 3.5 + W * .05, GY * .8); g.lineTo(x - w * 2.5 + W * .05, GY * .8); g.fill(); });
    },
    body: '#03121a', side: '#052733', top: '#0a3a48', outline: b => `rgba(70,240,255,${.25 + .5 * b.level})`,
    win: c => ({ h: 160 + c.h / 360 * 60, s: c.s, m: c.m }),
    back: { h: .9, density: .8, body: '#03111a', win: () => 'rgba(70,230,255,.22)' },
    searchlights: false,
    decorate(b, r) { b.glass = !b.roof && r() < .6; b.dots = r() < .7; b.hueD = r() < .5 ? 180 : 300; },
    drawExtras(g, b, cx, tip, E) {
      if (b.lm) return;
      const u = E.unit, tw = b.tiers[b.tiers.length - 1].w * u, ty = E.GY - b.hU * u, lv = b.level;
      if (b.dots) eachTier(b, cx, E, (x0, y, w) => {     // bioluminescent studs along each ledge
        g.fillStyle = `hsla(${b.hueD},100%,70%,${.35 + .65 * b.flash})`;
        for (let x = x0 + u; x < x0 + w - u * .5; x += u * 2) g.fillRect(x, y - Math.max(1, u * .2), Math.max(1, u * .4), Math.max(1, u * .4));
      });
      if (b.glass) {                                     // a glass dome glowing from inside
        const rx = tw * .5, ry = Math.min(tw * .45, 10 * u);
        glow(g, '60,230,255', cx, ty - ry * .4, rx * 1.3, .2 + .55 * lv);
        g.fillStyle = 'rgba(80,230,255,.13)'; g.beginPath(); g.ellipse(cx, ty, rx, ry, 0, Math.PI, TAU); g.fill();
        g.strokeStyle = `rgba(140,250,255,${.45 + .4 * lv})`; g.lineWidth = Math.max(1, u * .2); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx, ty, rx * .78, ry * .82, 0, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
        g.strokeStyle = 'rgba(120,240,255,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, ty - ry); g.lineTo(cx, ty); g.ellipse(cx, ty, rx * .5, ry, 0, Math.PI, TAU); g.stroke();
      }
    },
    drawBehind(g, E) { sync(E); },
    drawFront(g, E) {
      sync(E);
      const { W, H, GY, t, dt, unit: u, scrollV } = E;
      g.fillStyle = 'rgba(200,230,235,.45)';             // marine snow drifting down
      for (const p of st.snow) {
        p.y += u * (.5 + p.s) * dt; p.x += (Math.sin(t / 2000 + p.ph) * u * .3 - scrollV * (.4 + .6 * p.s)) * dt;
        if (p.y > H) { p.y = -2; p.x = Math.random() * W; }
        if (p.x < -2) p.x += W + 4; else if (p.x > W + 2) p.x -= W + 4;
        const s = p.s > .8 ? 2 : 1; g.fillRect(p.x, p.y, s, s);
      }
      for (const f of st.fish) { swim(f, E); const y = f.y + Math.sin(t / 600 + f.ph) * u * .4; glow(g, '80,255,220', f.x + spW(f.sp, f.px) / 2, y + f.px, u * 1.3, .5); drawPix(g, f.sp, f.px, f.x, y, f.dir < 0); }
      for (const j of st.jel) {                          // jellyfish: contract and jet upward on the bass
        const pulse = E.bassFlash > .45 || Math.sin(t / 650 + j.ph) > .82, [frames, rgb] = j.j, sp = frames[pulse ? 1 : 0];
        j.y -= u * (pulse ? 7 : .9) * dt; j.x += (Math.sin(t / 2600 + j.ph) * u * .6 - scrollV * j.par) * dt;
        const jw = spW(sp, j.px), jh = spH(sp, j.px);
        if (j.y < -jh * 2) { j.y = GY + jh; j.x = Math.random() * W; }
        if (j.x < -jw * 2) j.x += W + jw * 4; else if (j.x > W + jw * 2) j.x -= W + jw * 4;
        glow(g, rgb, j.x + jw / 2, j.y + jh * .25, jw * 1.2, .3 + .5 * E.bassFlash);
        withAlpha(g, .9, () => drawPix(g, sp, j.px, j.x, j.y, false));
      }
      const a = st.ang; swim(a, E);                      // the anglerfish and its lure
      const ay = a.y + Math.sin(t / 2200) * u, P = Math.max(1, Math.round(a.px)), lx = a.x + (a.dir < 0 ? (15 - 12) * P : 12 * P) + P / 2, ly = ay + 2.5 * P;
      const lure = .5 + .5 * avg(E.bands, 5, 7) + .4 * E.bands[6].flash;
      glow(g, '160,255,235', lx, ly, u * (2 + 3 * lure), .35 + .5 * lure);
      drawPix(g, a.sp, a.px, a.x, ay, a.dir < 0);
      glow(g, '230,255,250', lx, ly, u * .8, .9);
    },
    ground: { h: .1, draw(g, E) {                        // dark seabed: rocks, glowing vents and bioluminescent plants
      const { W, H, GY, unit: u, travel, t } = E, gh = H - GY, k = `${GY},${H}`;
      if (st.gk !== k) { st.gk = k; st.gg = lin(g, 0, GY, 0, H, [[0, '#0b1a20'], [1, '#010507']]); }
      g.fillStyle = st.gg; g.fillRect(0, GY, W, gh);
      g.fillStyle = 'rgba(80,220,255,.25)'; g.fillRect(0, GY, W, 1);
      const rs = 7 * u; g.fillStyle = '#071116'; g.beginPath();
      for (let i = Math.floor((travel - 6 * u) / rs); i * rs - travel < W + 6 * u; i++) {
        if (hash(i, 1, 21) < .5) continue;
        const x = i * rs - travel + hash(i, 2, 21) * rs, r = u * (1.5 + 2.5 * hash(i, 3, 21));
        g.moveTo(x + r, GY + gh * .3); g.ellipse(x, GY + gh * .3, r, r * .6, 0, Math.PI, TAU);
      }
      g.fill();
      const vs = 38 * u, kick = E.bands[0].level;
      for (let i = Math.floor((travel - 10 * u) / vs); i * vs - travel < W + 10 * u; i++) {
        const x = i * vs - travel + hash(i, 4, 21) * vs * .5, h = u * (3 + 2 * hash(i, 5, 21)), by = GY + gh * .5, warm = hash(i, 6, 21) < .5;
        g.fillStyle = '#0d1a1e'; g.beginPath(); g.moveTo(x - u * 1.3, by); g.lineTo(x - u * .5, by - h); g.lineTo(x + u * .5, by - h); g.lineTo(x + u * 1.3, by); g.fill();
        const rgb = warm ? '255,140,60' : '60,230,255';
        glow(g, rgb, x, by - h, u * (2.5 + 3 * kick), .35 + .55 * kick);
        g.fillStyle = warm ? 'rgba(255,190,130,.5)' : 'rgba(150,250,255,.5)';
        for (let p = 0; p < 6; p++) { const q = (t / 1600 + p / 6 + hash(i, p, 3)) % 1; g.fillRect(x + Math.sin(q * 9 + p) * u * .8 * q, by - h - q * u * 14, Math.max(1, u * .3), Math.max(1, u * .3)); }
      }
      const ps = 2.6 * u, sp = E.spectrum;
      for (let i = Math.floor((travel - 2 * u) / ps); i * ps - travel < W + 2 * u; i++) {
        if (hash(i, 7, 21) < .5) continue;
        const x = i * ps - travel + hash(i, 8, 21) * ps, by = GY + gh * (.4 + .45 * hash(i, 9, 21)), h = u * (1 + 2.5 * hash(i, 10, 21)), kk = i & 7;
        g.fillStyle = '#123038'; g.fillRect(x, by - h, Math.max(1, u * .25), h);
        g.fillStyle = `hsla(${165 + 130 * hash(i, 11, 21)},100%,${55 + 25 * sp[kk]}%,${.4 + .6 * sp[kk]})`;
        g.fillRect(x - u * .2, by - h - u * .5, Math.max(1, u * .65), Math.max(1, u * .6));
      }
    } },
  });
}

// =====================================================================================================
// Aurora Harbor: a snowy, low waterfront of warm-lit houses on a frozen bay under rippling auroras.
// Music: the aurora curtains brighten, grow and ripple faster with the mids and highs, and flare on hits.
{
  const rib = stops => mk(1, 128, (x, w, h) => { x.fillStyle = lin(x, 0, 0, 0, h, stops); x.fillRect(0, 0, w, h); });
  const RIBS = [
    rib([[0, 'rgba(160,80,255,0)'], [.35, 'rgba(150,90,255,.3)'], [.75, 'rgba(70,255,170,.75)'], [.92, 'rgba(150,255,210,.95)'], [1, 'rgba(70,255,170,0)']]),
    rib([[0, 'rgba(255,80,200,0)'], [.4, 'rgba(200,90,255,.35)'], [.8, 'rgba(90,240,200,.6)'], [1, 'rgba(90,240,200,0)']]),
    rib([[0, 'rgba(60,255,160,0)'], [.5, 'rgba(60,255,160,.35)'], [.9, 'rgba(160,255,220,.6)'], [1, 'rgba(60,255,160,0)']]),
  ];
  const st = { en: .5, list: [], ik: '', ice: null };
  registerTheme('aurora', { name: 'Aurora Harbor',
    kit: { styles: ['pairs', 'grid', 'wide', 'tall', 'pairs'], roofs: [['pyramid', 4], ['pyramid', 5], ['pyramid', 3], null, ['pyramid', 6], ['antenna', 4]], tall: .15, shrink: .8, w0: 6, gaps: [.6, 1.2] },
    minF: .15, maxF: .45, weather: 'snow', widgetSky: true,
    sky: [[0, '#01040f'], [.55, '#061430'], [1, '#14304a']], skyToGround: true,
    drawSky(g, E) {                                      // aurora curtains: vertical glowing strips along wandering ribbons
      const { W, GY, t, dt, bands } = E;
      const en = .25 + .55 * avg(bands, 3, 5) + .45 * avg(bands, 6, 7);
      st.en += (en - st.en) * Math.min(1, dt * 3);
      const hit = Math.max(bands[5].flash, bands[6].flash), n = E.widget ? 50 : 150, step = W / n, sp = 1 + st.en;
      const a0 = g.globalAlpha, op = g.globalCompositeOperation;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const R = RIBS[i], wgt = [1, .65, .5][i];
        for (let j = 0; j <= n; j++) {
          const x = j * step, p = x / W;
          const yc = GY * (.2 + .1 * i) + Math.sin(p * TAU * 1.3 + t / 4000 * sp + i * 2) * GY * .06 + Math.sin(p * TAU * 3.1 - t / 2300 * sp + i) * GY * .025 * sp;
          const h = GY * (.14 + .16 * st.en) * (.55 + .45 * Math.sin(p * TAU * 2.2 + t / 1700 + i * 1.7));
          const a = (.2 + .55 * st.en + .45 * hit) * (.55 + .45 * Math.sin(p * TAU * 4.3 + t / 900 * sp + i)) * Math.min(1, p * 6, (1 - p) * 6 + .3) * wgt;
          g.globalAlpha = a0 * Math.min(1, Math.max(0, a));
          g.drawImage(R, x, yc - h, step + 1, h);
        }
      }
      g.globalCompositeOperation = op; g.globalAlpha = a0;
    },
    stars: true, moon: false, cloud: CLEAR, fogRGB: '170,190,220',
    body: '#0c0f17', side: '#151925', top: '#1d2230',
    win: c => ({ h: 26 + c.h / 360 * 22, s: 92, m: c.m }),
    back: { h: .6, density: .7, body: '#0a1424', win: () => 'rgba(255,190,110,.28)' },
    searchlights: false,
    afterLayout(list) { st.list = list; },
    drawExtras(g, b, cx, tip, E) {                       // snow caps on the gables
      if (b.lm || !b.roof || b.roof[0] !== 'pyramid') return;
      const tw = b.tiers[b.tiers.length - 1].w * E.unit, h = b.roof[1] * E.unit, k = .5;
      g.fillStyle = '#e6edf8'; g.beginPath(); g.moveTo(tip[0], tip[1] - .5); g.lineTo(tip[0] - tw / 2 * k, tip[1] + h * k); g.lineTo(tip[0] - tw * .1, tip[1] + h * k * .8); g.lineTo(tip[0] + tw * .05, tip[1] + h * k); g.lineTo(tip[0] + tw / 2 * k, tip[1] + h * k); g.fill();
    },
    ground: { h: .12, draw(g, E) {                       // snowy shore, then the frozen bay with cracks and soft reflections
      const { W, H, GY, unit: u, travel, t } = E, gh = H - GY, shore = gh * .3, iy = GY + shore, ih = gh - shore;
      const k = `${W},${H},${GY}`;
      if (st.ik !== k) {
        st.ik = k; const d = dpr();
        st.ice = mk(W * d, ih * d, x => {
          x.scale(d, d); x.fillStyle = lin(x, 0, 0, 0, ih, [[0, '#2a4862'], [1, '#0c1a28']]); x.fillRect(0, 0, W, ih);
          x.strokeStyle = 'rgba(200,230,255,.18)'; x.lineWidth = 1;
          for (let i = 0; i < W / 40; i++) { let cx = hash(i, 1, 31) * W, cy = hash(i, 2, 31) * ih; x.beginPath(); x.moveTo(cx, cy); for (let s = 0; s < 4; s++) { cx += (hash(i, s, 32) - .5) * 40; cy += (hash(i, s, 33) - .5) * ih * .4; x.lineTo(cx, cy); } x.stroke(); }
          x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, W, 1);
        });
      }
      const ox = ((travel % W) + W) % W;
      g.drawImage(st.ice, -ox, iy, W, ih); g.drawImage(st.ice, W - ox, iy, W, ih);
      withAlpha(g, .1 + .25 * st.en, () => { g.fillStyle = lin(g, 0, iy, 0, H, [[0, 'rgba(80,255,180,.0)'], [.4, 'rgba(80,255,180,.6)'], [1, 'rgba(150,90,255,.0)']]); g.fillRect(0, iy, W, ih); });
      for (const b of st.list) {                         // warm window light smeared on the ice below each house
        const x = E.toScreen(b.cx); if (x < -b.wpx || x > W + b.wpx) continue;
        withAlpha(g, .12 + .4 * b.level, () => g.drawImage(sprite('255,180,90'), x - b.wpx * .45, iy - ih * .1, b.wpx * .9, ih * 1.1));
      }
      const bs = 55 * u;                                  // a few boats frozen in at the quay
      for (let i = Math.floor((travel - 6 * u) / bs); i * bs - travel < W + 6 * u; i++) {
        if (hash(i, 1, 41) < .4) continue;
        const x = i * bs - travel + hash(i, 2, 41) * bs * .6, y = iy + ih * .35, L = u * (4 + 2 * hash(i, 3, 41));
        g.fillStyle = '#0a0f18'; g.beginPath(); g.moveTo(x - L / 2, y - u); g.lineTo(x + L / 2, y - u); g.lineTo(x + L * .38, y); g.lineTo(x - L * .4, y); g.fill();
        g.fillRect(x - u * .1, y - u * 5, Math.max(1, u * .2), u * 4);
        g.fillStyle = '#e6edf8'; g.fillRect(x - L / 2, y - u - Math.max(1, u * .25), L, Math.max(1, u * .25));
        if ((t / 1000 + i) % 3 < 1.5) { g.fillStyle = '#ffcf80'; g.fillRect(x - u * .2, y - u * 5.2, Math.max(1, u * .4), Math.max(1, u * .4)); }
      }
      g.fillStyle = '#dfe8f4'; g.beginPath(); g.moveTo(0, GY);   // snowy shore with a soft, drifted edge
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, iy - shore * .15 * (1 + Math.sin((x + travel) / (u * 9)) * .6));
      g.lineTo(W, GY); g.fill();
      g.fillStyle = 'rgba(150,180,220,.35)'; g.fillRect(0, GY + shore * .5, W, shore * .3);
    } },
  });
}

// =====================================================================================================
// Lunar Colony: domes, habitat modules and antenna towers on a grey cratered plain, Earth hanging in a black sky.
// Music: landing beacons blink with the beat, dishes sweep faster with the mids, and a big bass hit launches a rocket.
{
  const ROVER = PAL(['.......d....', '.......a....', '..pppppppp..', '.WWWWWWWWWW.', '.WWgWWWWWWWW', '.WWWWWWWWWW.', '.KK..KK..KK.', '.KK..KK..KK.'],
    { d: '#ff4040', a: '#9aa0a8', p: '#2c5aa8', W: '#e8e8ea', g: '#5ad0ff', K: '#2a2a2e' });
  const ROCKET = PAL(['..r..', '.rrr.', '.WWW.', '.WbW.', '.WWW.', '.WWW.', '.WWW.', 'rWWWr', 'r.g.r'], { r: '#e8403a', W: '#f2f2f4', b: '#3fa0ff', g: '#555' });
  const st = { key: '', ek: '', earth: null, rover: null, rk: null, prevBF: 0, last: -1e9, smoke: [], gk: '', gg: null, list: [] };
  function earth(R) {
    const d = dpr(), S = R * 3;
    return mk(S * d, S * d, x => {
      x.scale(d, d); const c = S / 2;
      const atm = x.createRadialGradient(c, c, R * .9, c, c, R * 1.4); atm.addColorStop(0, 'rgba(110,170,255,.45)'); atm.addColorStop(1, 'rgba(110,170,255,0)');
      x.fillStyle = atm; x.fillRect(0, 0, S, S);
      x.save(); x.beginPath(); x.arc(c, c, R, 0, TAU); x.clip();
      const oc = x.createRadialGradient(c - R * .4, c - R * .3, R * .1, c, c, R); oc.addColorStop(0, '#6fc0ff'); oc.addColorStop(.6, '#2368c8'); oc.addColorStop(1, '#0c2c6a');
      x.fillStyle = oc; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 9; i++) { x.fillStyle = i % 3 ? '#4f9d4a' : '#b49a5e'; x.beginPath(); x.ellipse(c + (hash(i, 1, 51) - .5) * R * 1.6, c + (hash(i, 2, 51) - .5) * R * 1.6, R * (.15 + .25 * hash(i, 3, 51)), R * (.1 + .2 * hash(i, 4, 51)), hash(i, 5, 51) * 3, 0, TAU); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 10; i++) { x.beginPath(); x.ellipse(c + (hash(i, 6, 51) - .5) * R * 1.8, c + (hash(i, 7, 51) - .5) * R * 1.8, R * (.2 + .3 * hash(i, 8, 51)), R * .05, -.3, 0, TAU); x.fill(); }
      x.fillStyle = '#f4f8ff'; x.beginPath(); x.ellipse(c, c - R * .95, R * .5, R * .12, 0, 0, TAU); x.fill();
      const night = x.createLinearGradient(c - R * .15, 0, c + R * .9, 0); night.addColorStop(0, 'rgba(0,2,12,0)'); night.addColorStop(1, 'rgba(0,2,12,.93)');
      x.fillStyle = night; x.fillRect(0, 0, S, S); x.restore();
    });
  }
  registerTheme('lunar', { name: 'Lunar Colony',
    kit: { styles: ['wide', 'ribbon', 'grid', 'wide'], roofs: [['dome', 5], ['dome', 7], ['antenna', 9], ['antenna2', 8], null, ['dome', 4]], tall: .2, shrink: .72, w0: 7, gaps: [.4, 1.4] },
    minF: .12, maxF: .45, noWeather: true, planes: false, widgetSky: true, stars: true, moon: false, cloud: CLEAR, rain: CLEAR, fogRGB: '120,120,130',
    sky: [[0, '#000000'], [1, '#06070c']],
    drawSky(g, E) {                                      // Earth, lit from the left
      const { W, H } = E, R = Math.round(Math.min(W, H) * .065);
      if (st.ek !== R) { st.ek = R; st.earth = earth(R); }
      const d = dpr(), s = st.earth.width / d;
      g.drawImage(st.earth, W * .76 - s / 2, H * .2 - s / 2, s, s);
    },
    body: '#a7abb3', side: '#6d727b', top: '#cfd3d9',
    win: c => ({ h: c.h, s: c.s * .55, m: c.m }),
    back: { h: .55, density: .5, body: '#2a2d33', win: () => 'rgba(190,210,255,.22)' },
    searchlights: false,
    decorate(b, r) { b.dish = r() < .45; b.dphase = r() * TAU; },
    afterLayout(list, r) {                               // pressurised tubes between neighbouring modules
      st.list = list;
      for (let i = 0; i + 1 < list.length; i++) if (!list[i].lm && !list[i + 1].lm && r() < .55) list[i].tube = { c: list[i + 1], y: 1.5 + 2 * r() };
    },
    drawExtras(g, b, cx, tip, E) {
      if (b.lm) return;
      const u = E.unit, GY = E.GY, tw = b.tiers[b.tiers.length - 1].w * u, ty = GY - b.hU * u;
      if (b.roof && b.roof[0] === 'dome') {              // glassy highlight on the domes
        g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(cx - tw * .15, ty - b.roof[1] * u * .55, tw * .14, b.roof[1] * u * .22, -.5, 0, TAU); g.fill();
      }
      if (b.dish) {                                      // a sweeping radar dish on the roof
        const x = cx + tw * .28, y = ty - u * 1.2, a = Math.sin(E.t / 1800 * (1 + avg(E.bands, 2, 4)) + b.dphase) * .7 - Math.PI / 2;
        g.fillStyle = '#8e939b'; g.fillRect(x - Math.max(.5, u * .15), y, Math.max(1, u * .3), u * 1.2);
        g.fillStyle = '#e4e6ea'; g.beginPath(); g.ellipse(x, y, u * 1.6, u * .5, a + Math.PI / 2, 0, Math.PI); g.fill();
      }
      if (b.tube) {
        const { c, y } = b.tube, x0 = cx + b.wpx / 2, x1 = cx + c.cx - b.cx - c.wpx / 2;
        if (x1 - x0 < u * .5 || x1 < 0 || x0 > E.W) return;
        const ty2 = GY - y * u;
        g.fillStyle = '#9aa0a8'; g.fillRect(x0, ty2 - u * .7, x1 - x0, u * 1.4);
        g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x0, ty2 - u * .6, x1 - x0, Math.max(1, u * .25));
        g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = x0 + u; x < x1; x += u * 1.5) g.fillRect(x, ty2 - u * .7, 1, u * 1.4);
      }
    },
    ground: { h: .14, draw(g, E) {                       // regolith, craters and landing pads with beacons
      const { W, H, GY, unit: u, travel, t } = E, gh = H - GY, k = `${GY},${H}`;
      if (st.gk !== k) { st.gk = k; st.gg = lin(g, 0, GY, 0, H, [[0, '#9a9ca2'], [1, '#4c4e54']]); }
      g.fillStyle = st.gg; g.fillRect(0, GY, W, gh);
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, GY, W, 1);
      const cs = 8 * u;
      for (let i = Math.floor((travel - 8 * u) / cs); i * cs - travel < W + 8 * u; i++) {
        if (hash(i, 1, 61) < .4) continue;
        const f = hash(i, 2, 61), x = i * cs - travel + hash(i, 3, 61) * cs, y = GY + gh * (.15 + .75 * f), rx = u * (1 + 2.8 * hash(i, 4, 61)) * (.6 + .6 * f), ry = rx * (.22 + .12 * f);
        g.fillStyle = 'rgba(30,30,36,.35)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(235,235,240,.3)'; g.lineWidth = Math.max(1, u * .2); g.beginPath(); g.ellipse(x, y + ry * .15, rx, ry, 0, 0, Math.PI); g.stroke();
      }
      const ps = 70 * u, py = GY + gh * .35, pads = [];
      for (let i = Math.floor((travel - 10 * u) / ps); i * ps - travel < W + 10 * u; i++) {
        const x = i * ps - travel + ps * .3, pw = 7 * u; pads.push(x);
        g.fillStyle = '#5b5e65'; g.beginPath(); g.ellipse(x, py, pw, pw * .18, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,220,90,.6)'; g.lineWidth = Math.max(1, u * .2); g.beginPath(); g.ellipse(x, py, pw * .6, pw * .1, 0, 0, TAU); g.stroke();
        for (let s = 0; s < 4; s++) {                     // beacons round the pad: chasing blink, all flare on the beat
          const bx = x + Math.cos(s * TAU / 4) * pw, by = py + Math.sin(s * TAU / 4) * pw * .18;
          const on = Math.max(((t / 250 + s) % 4) < 1 ? 1 : 0, E.bassFlash), rgb = s % 2 ? '255,60,60' : '80,255,120';
          g.fillStyle = `rgb(${rgb})`; g.fillRect(bx - Math.max(.5, u * .2), by - u * .5, Math.max(1, u * .4), Math.max(1, u * .4));
          if (on > .05) glow(g, rgb, bx, by - u * .3, u * 1.8, on * .8);
        }
      }
      st.pads = pads;
    } },
    drawTop(g, E) {                                      // the rover and the odd launch stand in front of the ground
      const { W, H, GY, unit: u, t, dt, scrollV } = E, gh = H - GY, py = GY + gh * .35, pads = st.pads || [];
      const px = pxOf(E, .5);                             // the rover trundling along
      if (!st.rover || st.key !== keyOf(E)) { st.key = keyOf(E); st.rover = { sp: ROVER, px, dir: 1, v: u * 1.6, par: 1, m: spW(ROVER, px) + 4 * u, x: W * .2 }; st.rk = null; st.smoke = []; }
      const rv = st.rover; swim(rv, E);
      drawPix(g, ROVER, rv.px, rv.x, GY + gh * .55 - spH(ROVER, rv.px) + Math.round(Math.sin(t / 300) * .6), false);
      if (!st.rk && st.prevBF < .9 && E.bassFlash >= .9 && t - st.last > 18000) {   // big bass hit: launch from a pad on screen
        const x = pads.find(x => x > W * .1 && x < W * .9) ?? W * .3;
        st.rk = { x, y: py, v: 0 }; st.last = t;
      }
      st.prevBF = E.bassFlash;
      for (let i = st.smoke.length - 1; i >= 0; i--) { const s = st.smoke[i]; s.r += u * 3 * dt; s.a -= dt * .35; s.x -= scrollV * dt; if (s.a <= 0) st.smoke.splice(i, 1); }
      g.fillStyle = 'rgb(210,210,215)';
      for (const s of st.smoke) withAlpha(g, s.a, () => { g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); });
      if (st.rk) {
        const r = st.rk, rp = Math.max(1, Math.round(px * 1.4)), w = spW(ROCKET, rp), h = spH(ROCKET, rp);
        r.v += GY * .22 * dt; r.y -= r.v * dt; r.x -= scrollV * dt;
        if (r.y > GY - GY * .3 && Math.random() < .6) st.smoke.push({ x: r.x + (Math.random() - .5) * w, y: r.y + u * .5, r: u, a: .5 });
        const fl = h * (.5 + .4 * Math.random());
        g.fillStyle = '#ffd36a'; g.beginPath(); g.moveTo(r.x - w * .3, r.y); g.lineTo(r.x, r.y + fl); g.lineTo(r.x + w * .3, r.y); g.fill();
        glow(g, '255,170,70', r.x, r.y + fl * .3, u * 4, .8);
        drawPix(g, ROCKET, rp, r.x - w / 2, r.y - h, false);
        if (r.y < -h * 2) st.rk = null;
      }
    },
  });
}
})();
