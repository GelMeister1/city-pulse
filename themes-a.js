// City Pulse plugin: themed cities (themes-a). Loaded by index.html after the core script, before start().
// Register with CityPulse.registerTheme(key, def); see the field list above registerTheme in index.html.
// Aero, Atlantis, Abyssal City, Aurora Harbor, Lunar Colony and Christmas Village.
(() => {
'use strict';
const CP = window.CityPulse;
if (!CP) return;
const { registerTheme, hash, sprite, pixelArt, domeBase, collar, depthOf, mk, withAlpha, glow, lin } = CP;
const TAU = Math.PI * 2, CLEAR = 'rgba(0,0,0,0)';

const dpr = () => window.devicePixelRatio || 1;
// Hooks may run at partial opacity (the tour's crossfade), so alpha is always multiplied, then restored.
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
// Jellyfish, two frames: bell open and bell contracted. p = bell rim and tentacles, P = bell highlight.
const jelly = (p, P) => [
  PAL(['..ppppp..', '.pPPPPPp.', 'pPPpPpPPp', 'ppppppppp', '.t.t.t.t.', '.t..t..t.', 't..t..t..', '.t..t..t.', '..t..t...'], { p, P, t: p }),
  PAL(['...ppp...', '..pPPPp..', '.pPPpPPp.', '.ppppppp.', '..t.t.t..', '..t.t.t..', '..t.t.t..', '.t.t.t...', '..t.t.t..', '..t...t..'], { p, P, t: p }),
];
// True on the frame a band's flash fires (the core sets flash to 1 on a hit, then lets it decay).
const hitNow = (st, k, f) => { const was = st[k] || 0; st[k] = f; return f > .95 && was <= .95; };
// Walk the stacked tiers of a generated building: fn(x0, yTop, w, h, tier).
function eachTier(b, cx, E, fn) { let y = E.GY; for (const tr of b.tiers) { const tw = tr.w * E.unit, th = tr.h * E.unit; fn(cx - tw / 2, y - th, tw, th, tr); y -= th; } }
const avg = (bands, a, z) => { let s = 0; for (let k = a; k <= z; k++) s += bands[k].level; return s / (z - a + 1); };

// Aero: glossy glass towers in a bright aqua sky, a green park with all kinds of trees, a fountain, wind turbines on the
// hills, soap bubbles, butterflies, rooftop gardens and glossy ribbons flowing across the sky.
// Music: turbines spin up on the bass and the fountain leaps with it, the sun swells with the kick, glass glints on hits.
{
  const st = { key: '', bub: { list: [] }, rot: 0, hills: null, hk: '', trees: {}, tk: 0, gk: '', gg: null, rph: 0, flies: [] };
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
  // Glossy trees: round, a tall cypress and a pink blossom tree; and a low bush. Each lit from the upper left with a shine.
  const KINDS = { round: ['#c6f78a', '#5ccf3e', '#2f8f2a'], cypress: ['#a8f0a0', '#3fb855', '#1f7a3a'], blossom: ['#fff0f6', '#ffaad0', '#e9709f'], bush: ['#b8f27e', '#4cc23a', '#2c8a2a'] };
  function treeSprite(u, kind = 'round') {
    if (st.tk !== u) { st.tk = u; st.trees = {}; }
    if (st.trees[kind]) return st.trees[kind];
    const d = dpr(), r = 2.3 * u, tall = kind === 'cypress', bush = kind === 'bush', w = r * 2.6, h = bush ? r * 1.6 : r * (tall ? 4.4 : 3.2), [c0, c1, c2] = KINDS[kind];
    return st.trees[kind] = mk(w * d, h * d, x => {
      x.scale(d, d);
      if (!bush) { x.fillStyle = '#8a5a34'; x.fillRect(w / 2 - u * .3, h - r * 1.2, u * .6, r * 1.2); }
      const cy = bush ? h - r * .6 : tall ? h - r * 2.6 : h - r * 1.15 - r * .9, ry = tall ? r * 1.9 : r;
      const rg = x.createRadialGradient(w / 2 - r * .35, cy - ry * .4, r * .1, w / 2, cy, Math.max(r, ry) * 1.15);
      rg.addColorStop(0, c0); rg.addColorStop(.5, c1); rg.addColorStop(1, c2);
      x.fillStyle = rg; x.beginPath();
      if (tall) x.ellipse(w / 2, cy, r * .62, ry, 0, 0, TAU);
      else if (bush) { x.ellipse(w / 2, cy, r * 1.2, r * .6, 0, 0, TAU); x.arc(w / 2 - r * .5, cy - r * .2, r * .5, 0, TAU); x.arc(w / 2 + r * .45, cy - r * .25, r * .55, 0, TAU); }
      else { x.arc(w / 2, cy, r, 0, TAU); x.arc(w / 2 - r * .55, cy + r * .35, r * .65, 0, TAU); x.arc(w / 2 + r * .55, cy + r * .35, r * .65, 0, TAU); }
      x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(w / 2 - r * .3, cy - ry * .5, r * (tall ? .2 : .38), ry * (tall ? .35 : .2), -.5, 0, TAU); x.fill();
      if (kind === 'blossom') { x.fillStyle = '#ffffff'; for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = r * .8 * ((k * 37 % 10) / 10); x.fillRect(w / 2 + Math.cos(a) * rr, cy + Math.sin(a) * rr * .8, Math.max(1, u * .25), Math.max(1, u * .25)); } }
    });
  }
  // A glossy butterfly: two pairs of wings that flap (k = 0..1 open), a dark body, a white shine.
  function butterfly(g, x, y, s, k, col) {
    for (const sx of [-1, 1]) {
      g.fillStyle = col; g.beginPath(); g.ellipse(x + sx * s * .7 * k, y - s * .35, s * .75 * k + .3, s * .6, sx * .5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x + sx * s * .5 * k, y + s * .35, s * .5 * k + .25, s * .4, -sx * .4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x + sx * s * .6 * k, y - s * .5, s * .25 * k + .1, s * .15, sx * .5, 0, TAU); g.fill();
    }
    g.fillStyle = '#20303a'; g.fillRect(x - s * .08, y - s * .6, s * .16, s * 1.2);
  }
  const sync = E => { const k = keyOf(E); if (st.key === k) return; st.key = k;
    st.bub.list = Array.from({ length: E.widget ? 4 : 9 }, () => ({ x: Math.random() * E.W, y: Math.random() * E.GY, r: E.unit * (1 + 1.6 * Math.random()) * (E.widget ? 1.4 : 1.2), v: E.unit * (1.6 + Math.random() * 1.6), ph: Math.random() * TAU }));
    st.flies = ['#4fd8ff', '#9cf25a', '#ffb347', '#ff7ad9', '#ffe45c'].slice(0, E.widget ? 2 : 5).map(col => ({ col, x: Math.random() * E.W, ph: Math.random() * TAU, sp: .6 + Math.random() * .6, hy: .4 + Math.random() * .6 })); };
  const glint = (g, x, y, s, a) => withAlpha(g, a, () => {
    g.drawImage(sprite('255,255,255'), x - s, y - s, 2 * s, 2 * s);
    g.fillStyle = '#fff'; g.fillRect(x - s * 1.7, y - .6, s * 3.4, 1.2); g.fillRect(x - .6, y - s * 1.7, 1.2, s * 3.4);
  });
  registerTheme('aero', { name: 'Aero',
    kit: { styles: ['ribbon', 'grid', 'slim', 'ribbon', 'tall'], roofs: [null, null, ['dome', 4], ['antenna', 5], ['spire', 6], null], tall: .35, shrink: .82, w0: 7, gaps: [.6, 1.6] },
    minF: .25, maxF: .75,
    sky: [[0, '#0a6fd6'], [.4, '#2fb0f0'], [.78, '#a6e6ff'], [1, '#effcff']], skyToGround: true,
    drawSky(g, E) {
      const { W, GY } = E, m = Math.min(W, E.H), sx = W * .15, sy = GY * .17, p = .8 + .2 * E.bassFlash;
      glow(g, '255,255,225', sx, sy, m * .42 * p, .85);
      glow(g, '255,255,255', sx, sy, m * .09, 1); glow(g, '255,255,255', sx, sy, m * .05, 1);
      const dx = W * .55 - sx, dy = GY * .55 - sy;
      for (const [k, r, c, a] of [[.45, .05, '190,255,230', .3], [.75, .022, '170,225,255', .4], [1.2, .085, '210,255,215', .14], [1.45, .035, '255,255,255', .22]])
        glow(g, c, sx + dx * k, sy + dy * k, m * r, a);
      st.rph += E.dt * .06;                               // glossy ribbons sweeping across the sky, flowing slowly
      for (let i = 0; i < 3; i++) {
        const yb = GY * (.3 + .13 * i), amp = GY * (.07 - .015 * i), th = GY * (.035 + .012 * i), ph = st.rph * (1 + .3 * i) + i * 2.1, n = 48;
        const yAt = (x, o) => yb + Math.sin(x / W * TAU * (.7 + .2 * i) + ph) * amp + o * th * (.55 + .45 * Math.sin(x / W * TAU * 1.3 + ph * 1.7));
        const rb = g.createLinearGradient(0, yb - amp, 0, yb + amp + th);
        rb.addColorStop(0, `rgba(255,255,255,${.3 - .06 * i})`); rb.addColorStop(1, `rgba(150,235,255,${.06})`);
        g.fillStyle = rb; g.beginPath();
        for (let j = 0; j <= n; j++) { const x = W * j / n; j ? g.lineTo(x, yAt(x, 0)) : g.moveTo(x, yAt(x, 0)); }
        for (let j = n; j >= 0; j--) { const x = W * j / n; g.lineTo(x, yAt(x, 1)); }
        g.fill();
        g.strokeStyle = `rgba(255,255,255,${.55 - .1 * i})`; g.lineWidth = Math.max(1, E.unit * .2); g.beginPath();
        for (let j = 0; j <= n; j++) { const x = W * j / n; j ? g.lineTo(x, yAt(x, 0)) : g.moveTo(x, yAt(x, 0)); }
        g.stroke();
      }
    },
    stars: false, moon: false, cloud: 'rgba(255,255,255,.82)', rain: 'rgba(255,255,255,.45)', fogRGB: '235,250,255',
    body: '#c9eef6', side: '#7fc3d8', top: '#f4feff', outline: () => 'rgba(255,255,255,.85)',
    win: c => ({ h: 165 + c.h / 360 * 55, s: Math.min(100, c.s), m: c.m }),
    back: { h: .75, density: .6, body: '#9cd6ea', win: () => 'rgba(255,255,255,.4)' },
    searchlights: false,
    decorate(b, r) { b.garden = !b.roof && r() < .5; b.ivy = r() < .35; b.ivyH = .3 + .35 * r(); },
    drawBehind(g, E) {
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
    drawExtras(g, b, cx, tip, E) {
      if (b.lm) return;
      eachTier(b, cx, E, (x0, y, w, h) => { g.drawImage(sheen, x0, y, w, h); g.drawImage(gloss, x0, y, w, Math.min(h, w * 1.6)); });
      const u = E.unit, top = b.tiers[b.tiers.length - 1], tw = top.w * u, ty = E.GY - b.hU * u, x0 = cx - tw / 2;
      if (b.ivy) {                                        // ivy climbing down from the top of the tower's left edge
        const len = b.hU * u * b.ivyH;
        for (let k = 0; k < len / (u * .55); k++) {
          const y = ty + k * u * .55, w = u * (1.6 - 1.2 * k * u * .55 / len) * (.6 + .4 * hash(b.id, k, 21));
          g.fillStyle = hash(b.id, k, 22) < .5 ? '#5ccf3e' : '#3da42e'; g.beginPath(); g.ellipse(x0 + w * .5, y, w * .6, u * .45, 0, 0, TAU); g.fill();
        }
      }
      if (b.garden) {                                     // a roof garden: a lawn on top and a few little trees
        const d = depthOf(tw);
        g.fillStyle = '#6fd84a'; g.beginPath(); g.moveTo(x0, ty); g.lineTo(x0 + d, ty - d / 2); g.lineTo(x0 + tw + d, ty - d / 2); g.lineTo(x0 + tw, ty); g.closePath(); g.fill();
        g.fillRect(x0, ty - Math.max(1, u * .35), tw, Math.max(1, u * .35));
        const tr = treeSprite(u, 'round'), dp = dpr(), sw = tr.width / dp * .42, sh = tr.height / dp * .42;
        for (const fx of [.22, .55, .82]) if (hash(b.id, fx * 10, 23) < .8) g.drawImage(tr, x0 + tw * fx + d * .4 - sw / 2, ty - d * .2 - sh + u * .2, sw, sh);
      }
      if (b.flash > .25) glint(g, cx - b.wpx * (.1 + .25 * hash(b.id, 4, 4)), E.GY - b.hU * E.unit * (.35 + .55 * hash(b.id, 5, 5)), (1 + 1.8 * b.flash) * E.unit, b.flash);
    },
    drawFront(g, E) {
      sync(E);
      const { dt, t, unit: u, W, GY } = E, lift = 1 + .8 * avg(E.bands, 3, 5);
      for (const b of st.bub.list) {
        b.y -= b.v * lift * dt; b.x += (Math.sin(t / 1400 + b.ph) * u * .6 - E.scrollV * .7) * dt;
        if (b.y < -b.r * 2) { b.y = GY + b.r; b.x = Math.random() * W; }
        if (b.x < -b.r * 2) b.x += W + b.r * 4; else if (b.x > W + b.r * 2) b.x -= W + b.r * 4;
      }
      bubbleDraw(g, st.bub.list);
      for (const f of st.flies) {                         // butterflies wandering over the park
        f.x += (Math.sin(t / 2300 * f.sp + f.ph) * u * 3 - E.scrollV * .9) * dt;
        if (f.x < -u * 4) f.x += W + u * 8; else if (f.x > W + u * 4) f.x -= W + u * 8;
        const y = GY - u * (3 + 7 * f.hy) + Math.sin(t / 700 * f.sp + f.ph * 2) * u * 1.5;
        butterfly(g, f.x, y, u * (E.widget ? 1.3 : 1), .35 + .65 * Math.abs(Math.sin(t / 90 * f.sp + f.ph)), f.col);
      }
    },
    ground: { h: .1, draw(g, E) {
      const { W, H, GY, unit: u, travel } = E, gh = H - GY, k = `${GY},${H}`;
      if (st.gk !== k) { st.gk = k; st.gg = lin(g, 0, GY, 0, H, [[0, '#7ee04f'], [.5, '#4fc23a'], [1, '#2f9a2a']]); }
      g.fillStyle = st.gg; g.fillRect(0, GY, W, gh);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, GY, W, Math.max(1, gh * .07));
      g.fillStyle = 'rgba(255,250,222,.8)'; g.fillRect(0, GY + gh * .64, W, Math.max(1, gh * .12));
      const d = dpr(), pondSp = 170 * u, pondAt = i => i * pondSp - travel + pondSp * .4;   // one fountain pond every so often
      const nearPond = x => { const i = Math.round((x + travel - pondSp * .4) / pondSp); return Math.abs(x - pondAt(i)) < 10 * u; };
      const kindOf = (i, row) => { const h = hash(i, row, 31); return h < .5 ? 'round' : h < .78 ? 'cypress' : 'blossom'; };
      const row = (sp, fy, s0, rowId) => {                 // a row of mixed trees, skipping the pond
        for (let i = Math.floor((travel - 10 * u) / sp); i * sp - travel < W + 10 * u; i++) {
          if (hash(i, rowId, 3) < .18) continue;
          const x = i * sp - travel + hash(i, rowId + 1, 2) * sp * .45; if (nearPond(x)) continue;
          const tr = treeSprite(u, kindOf(i, rowId)), tw = tr.width / d, th = tr.height / d, s = s0 * (.8 + .4 * hash(i, rowId + 2, 4));
          g.drawImage(tr, x - tw * s / 2, GY + gh * fy - th * s, tw * s, th * s);
        }
      };
      row(7 * u, .32, .62, 10);                            // the far row, smaller
      for (let i = Math.floor((travel - 20 * u) / pondSp); pondAt(i) < W + 20 * u; i++) {   // the fountain pond
        const x = pondAt(i), y = GY + gh * .55, rx = 8 * u, ry = Math.max(2, gh * .14);
        const pg = g.createLinearGradient(0, y - ry, 0, y + ry); pg.addColorStop(0, '#bff4ff'); pg.addColorStop(1, '#2aa6e0');
        g.fillStyle = '#e9f7ff'; g.beginPath(); g.ellipse(x, y, rx + u * .5, ry + u * .3, 0, 0, TAU); g.fill();
        g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - rx * .35, y - ry * .35, rx * .35, ry * .2, 0, 0, TAU); g.fill();
        const jet = u * (5 + 9 * E.bassFlash), n = 16;    // the jet leaps on the bass and falls back in arcs of droplets
        g.fillStyle = 'rgba(235,252,255,.85)';
        for (let k = 0; k < n; k++) {
          const p = ((E.t / 900 + k / n) % 1), side = k % 2 ? 1 : -1, dx = side * p * rx * .55, dy = -jet * 4 * p * (1 - p);
          const r = Math.max(1, u * (.45 - .25 * p)); g.beginPath(); g.arc(x + dx, y - ry * .2 + dy, r, 0, TAU); g.fill();
        }
        g.fillRect(x - Math.max(.5, u * .15), y - ry * .2 - jet, Math.max(1, u * .3), jet);
      }
      row(9 * u, .66, .95, 20);                            // the near row
      const bush = treeSprite(u, 'bush'), bw = bush.width / d, bh = bush.height / d, bs = 5.5 * u;   // bushes along the path
      for (let i = Math.floor((travel - bs) / bs); i * bs - travel < W + bs; i++) {
        if (hash(i, 40, 3) < .45) continue;
        const x = i * bs - travel + hash(i, 41, 2) * bs * .5; if (nearPond(x)) continue;
        g.drawImage(bush, x - bw * .3, GY + gh * .95 - bh * .6, bw * .6, bh * .6);
      }
    } },
  });
}

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
  const DOLPHIN = PAL(['.........d.........', '......ddddddd......', 'd...dddddddddddd...', 'dd.dddddddddddkddd.', 'ddddLLLLLLLLLLLLLLL', 'd...LLLLLLLLLL.....', '.......dd..........'],
    { d: '#6d8ea8', L: '#cfdde6', k: '#0e1e2c' });
  const MPAL = { m: '#1f4f66', w: '#3d7690' };
  const MANTA = [
    PAL(['......mm......', '.....mmm......', '....mmmmm.....', '...mmmwmmm..mm', 'mmmmmmwwmmmmm.', '...mmmwmmm..mm', '....mmmmm.....', '.....mmm......', '......mm......'], MPAL),
    PAL(['..............', '......mm......', '.....mmmm.....', '...mmmwmmm..mm', 'mmmmmmwwmmmmm.', '...mmmwmmm..mm', '.....mmmm.....', '......mm......', '..............'], MPAL),
  ];
  const CPAL = { r: '#e0503a', R: '#ff7a5a', k: '#1a1a1a' };
  const CRAB = [PAL(['.k.....k.', 'r.r...r.r', 'rRrrrrrRr', '.rrrrrrr.', 'r.r...r.r'], CPAL), PAL(['.k.....k.', 'r.r...r.r', 'rRrrrrrRr', '.rrrrrrr.', '.r.r.r.r.'], CPAL)];
  const SEAHORSE = PAL(['.yy...', 'yyyk..', '.yyyyy', 'yyy...', '.yyy..', 'yyy...', '.yy...', '..y.y.', '...y..'], { y: '#ffb43a', k: '#3a2000' });
  const octo = (o, O) => [
    PAL(['..ooooo..', '.oOoooOo.', '.ookoook.', '.ooooooo.', '..ooooo..', '.o.o.o.o.', 'o.o.o.o.o', '.o..o..o.'], { o, O, k: '#1a0a08' }),
    PAL(['..ooooo..', '.oOoooOo.', '.ookoook.', '.ooooooo.', '..ooooo..', 'o.o.o.o.o', '.o.o.o.o.', 'o..o..o..'], { o, O, k: '#1a0a08' }),
  ];
  const OCTO = [octo('#c0504a', '#e07a6a'), octo('#ff8a3a', '#ffc08a')];   // calm, and flushed on a hit
  const CLOWN = PAL(['.ow..', 'owowk', '.ow..'], { o: '#ff7a1a', w: '#ffffff', k: '#111' });
  const MOON = jelly('rgba(230,240,255,.8)', '#ffffff');
  const st = { key: '', fish: [], back: [], turtle: null, whale: null, bub: { list: [] }, wk: '', wash: null, rays: null, ck: 0, coral: null,
    big: null, pod: null, manta: null, jel: [], crabs: [], leapT: -1e9, turnT: 0 };
  function sync(E) {
    const k = keyOf(E); if (st.key === k) return; st.key = k;
    const { W, GY, unit: u } = E, px = pxOf(E), w = E.widget;
    st.fish = []; st.back = []; st.bub.list = [];
    // a big school that bends as one wave and turns on the kick
    st.big = { x: W * .6, y0: GY * (w ? .3 : .42), dir: -1, v: u * 3.5, par: 1, m: 30 * u, px,
      mem: Array.from({ length: w ? 8 : 18 }, () => ({ ox: (Math.random() - .5) * 26 * u, oy: (Math.random() - .5) * 9 * u, ph: Math.random() * TAU })) };
    st.pod = { x: W * .2, y0: GY * (w ? .12 : .17), dir: 1, v: u * 5, par: .6, m: 45 * u + spW(DOLPHIN, px), n: w ? 2 : 3, px };
    st.manta = w ? null : { x: W * .45, y: GY * .26, dir: -1, v: u * 1.4, par: .45, m: spW(MANTA[0], px * 2) + 4 * u, px: px * 2 };
    st.jel = Array.from({ length: w ? 1 : 2 }, (_, i) => ({ x: W * (.3 + .4 * i), y: GY * (.3 + .3 * i), ph: Math.random() * TAU, px }));
    st.crabs = Array.from({ length: w ? 1 : 2 }, (_, i) => ({ x: W * (.25 + .5 * i), dir: i ? -1 : 1, v: u * 1.2, par: 1, m: 6 * u, px }));
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
  function drawTemple(g, b, cx, tip, E) {
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
    drawSky(g, E) {
      const { W, GY, t } = E, hi = .45 + .5 * avg(E.bands, 5, 7), bh = Math.ceil(GY * .22);
      if (!st.surf || st.surf.width !== Math.ceil(W) || st.surf.height !== bh) { st.surf = mk(W, bh, () => {}); st.sx = st.surf.getContext('2d'); st.sm = lin(st.sx, 0, 0, 0, bh, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]); }
      const x = st.sx;
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
    drawBehind(g, E) {
      sync(E);
      const { t, GY } = E;
      if (st.whale) { swim(st.whale, E); withAlpha(g, .45, () => drawPix(g, st.whale.sp, st.whale.px, st.whale.x, st.whale.y + Math.sin(t / 3000) * E.unit, st.whale.dir < 0)); }
      withAlpha(g, .5, () => { for (const f of st.back) { swim(f, E); drawPix(g, f.sp, f.px, f.x, f.y + Math.sin(t / 800 + f.ph) * E.unit * .4, f.dir < 0); } });
      const u = E.unit, m = st.manta;
      if (m) { swim(m, E); withAlpha(g, .6, () => drawPix(g, MANTA[Math.floor(t / 700) % 2], m.px, m.x, m.y + Math.sin(t / 2600) * u * 2, m.dir < 0)); }
      // dolphin pod: gentle arcs, and a staggered leap on a big bass hit
      if (hitNow(st, 'bf', E.bassFlash) && t - st.leapT > 2500) st.leapT = t;
      const p = st.pod; swim(p, E);
      withAlpha(g, .9, () => { for (let i = 0; i < p.n; i++) {
        const lp = (t - st.leapT - i * 160) / 1000, leap = lp > 0 && lp < 1 ? Math.sin(Math.PI * lp) : 0, span = E.W + 2 * p.m;
        let x = p.x - p.dir * i * 12 * u; if (x < -p.m) x += span; else if (x > E.W + p.m) x -= span;
        drawPix(g, DOLPHIN, p.px, x, p.y0 + (i % 2) * 4 * u + Math.sin(t / 1100 + i * .9) * u * 2.2 - leap * u * 11, p.dir < 0);
      } });
    },
    drawFront(g, E) {
      sync(E);
      const { W, H, GY, t, unit: u, dt } = E, tre = avg(E.bands, 5, 7);
      if (!E.widget) {
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
      const B = st.big, kick = E.bands[1].flash, tight = 1 - .45 * kick;   // the big school tightens and may turn on the kick
      if (hitNow(st, 'kf', kick) && t - st.turnT > 6000 && Math.random() < .5) { st.turnT = t; B.dir *= -1; }
      swim(B, E, 1 + kick);
      for (const f of B.mem) {
        const x = B.x + f.ox * tight, y = B.y0 + f.oy * tight + Math.sin(x / W * TAU * 1.2 + t / 1500) * GY * .06 + Math.sin(t / 500 + f.ph) * u * .3;
        drawPix(g, FISH[2], B.px, x, y, B.dir < 0);
      }
      for (const j of st.jel) {
        const pulse = Math.sin(t / 900 + j.ph) > .6, sp = MOON[pulse ? 1 : 0];
        j.y -= u * (pulse ? 3 : .6) * dt; j.x += (Math.sin(t / 3000 + j.ph) * u * .5 - E.scrollV * .8) * dt;
        if (j.y < -spH(sp, j.px) * 2) { j.y = GY * .9; j.x = Math.random() * W; }
        if (j.x < -40) j.x += W + 80; else if (j.x > W + 40) j.x -= W + 80;
        withAlpha(g, .55, () => drawPix(g, sp, j.px, j.x, j.y, false));
      }
      const tu = st.turtle; swim(tu, E); drawPix(g, TURTLE[Math.floor(t / 450) % 2], tu.px, tu.x, tu.y + Math.sin(t / 1800) * u * 1.2, false);
      bubbleStep(st.bub, E, 2 + 30 * E.bassFlash, E.widget ? 25 : 90, () => (Math.floor(Math.random() * 7) + .5) / 7 * W + (Math.random() - .5) * 2 * u, () => GY + (H - GY) * .3, u * .25, u * .8, u * 9);
      bubbleDraw(g, st.bub.list);
    },
    ground: { h: .11, draw(g, E) {
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
      sync(E);
      const px = pxOf(E), beat = E.bands[1].level;
      const each = (sp, off, fn) => { for (let i = Math.floor((travel - off - 10 * u) / sp); i * sp + off - travel < W + 10 * u; i++) fn(i * sp + off - travel, i); };
      each(46 * u, 12 * u, (ax, i) => {
        const ay = GY + gh * .55;
        g.strokeStyle = '#ff8fc8'; g.lineWidth = Math.max(1, u * .4); g.lineCap = 'round'; g.beginPath();
        for (let k = -3; k <= 3; k++) { const sw = Math.sin(t / 700 + k + i) * u * .6 * sway; g.moveTo(ax + k * u * .45, ay); g.quadraticCurveTo(ax + k * u * .7 + sw, ay - u * 1.5, ax + k * u * .9 + sw * 1.5, ay - u * 2.6); }
        g.stroke();
        for (let j = 0; j < 2; j++) { const a = t / 900 + j * Math.PI + i; drawPix(g, CLOWN, px, ax + Math.cos(a) * u * 2.6 - u, ay - u * 3.5 + Math.sin(a * 2) * u * .6, Math.sin(a) > 0); }
      });
      each(64 * u, 33 * u, (x, i) => drawPix(g, SEAHORSE, px, x, GY + gh * .3 - u * 5 + Math.sin(t / 900 + i) * u, (i & 1) === 1));
      each(120 * u, 80 * u, x => drawPix(g, OCTO[E.bands[3].flash > .5 ? 1 : 0][Math.floor(t / 520) % 2], px, x, GY + gh * .62 - spH(OCTO[0][0], px), false));   // octopus flushes on mid hits
      for (const c of st.crabs) {                        // crabs scuttle sideways, faster with the beat
        swim(c, E, 1 + 2.5 * beat);
        drawPix(g, CRAB[Math.floor(c.x / Math.max(1, u * .7)) & 1], c.px, c.x, GY + gh * .82 - spH(CRAB[0], c.px), false);
      }
    } },
  });
}

// Abyssal City: glass domes and towers glowing cyan in the deep dark, marine snow, jellyfish and an anglerfish.
// Music: jellyfish pulse and jet upward on the bass, the angler's lure flares with the treble, vents throb with the kick.
{
  const JELLY = [[jelly('#ff7ad9', '#ffc4f0'), '255,110,220'], [jelly('#6af2ff', '#c8fbff'), '90,240,255'], [jelly('#b48cff', '#e2d4ff'), '170,130,255']];
  const ANGLER = PAL(['..........l.....', '........ll.l....', '.......l....O...', '....BBBBBB......', '..BBBBBBBBBB....', 'B.BBBBBBBBBBBe..', 'BBBBBBBBBBBBBBB.',
    'B.BBBBBBBTTTTTB.', '..BBBBBBBTBTBTB.', '....BBBBBBBBB...'], { l: '#3a4a50', O: '#d8fff6', B: '#2b4048', e: '#9ff', T: '#cfd8d0' });
  const GFISH = [PAL(['.aa..', 'aaaaw', '.aa..'], { a: '#3fffd0', w: '#ffffff' }), PAL(['.aa..', 'aaaaw', '.aa..'], { a: '#7ab8ff', w: '#ffffff' })];
  const LANTERN = [PAL(['...dd..', 'dddddde', 'd.ododo'], { d: '#46616d', e: '#cff', o: '#9fffe8' }), PAL(['...dd..', 'dddddde', 'd.ododo'], { d: '#46616d', e: '#cff', o: '#ffffff' })];
  const SHRIMP = PAL(['r.....', '.rrrr.', 'rrrrrr', 'r.r.r.'], { r: '#ff6a4a' });
  const IPAL = { g: '#8a7f88', G: '#b6aab2', l: '#6a5f68' };
  const ISOPOD = [PAL(['.gggggg.', 'gGgGgGgg', 'gggggggg', '.l.l.l..'], IPAL), PAL(['.gggggg.', 'gGgGgGgg', 'gggggggg', 'l.l.l.l.'], IPAL)];
  const WSHARK = PAL(['..............SSSSSSSS........', 'ss.......SSSSSSwSSSSwSSSSS....', 'sss...SSSSwSSSSSSwSSSSSSwSSSS.', '.sssSSSSSSSSSwSSSSSSSwSSSSSSSS',
    '..sSSSSwSSSSSSSSwSSSSSSSSSSSSS', '.ss..SSSSSSSSSSSSSSSSSSSSSSSSS', 'ss.......LLLLLLLLLLLLLLLLLLLL.', '...............FF.............'],
    { S: '#1d3a48', s: '#1d3a48', w: '#5d8a9a', L: '#2b5262', F: '#1d3a48' });
  const st = { key: '', snow: [], jel: [], fish: [], ang: null, rk: '', ray: null, gk: '', gg: null,
    lan: [], shrimp: [], bubbles: [], sip: null, sipT: -1e9, shark: null, iso: null, spk: [] };
  function sync(E) {
    const k = keyOf(E); if (st.key === k) return; st.key = k;
    const { W, GY, H, unit: u } = E, px = pxOf(E), w = E.widget;
    st.snow = Array.from({ length: Math.round(W * H / (w ? 3000 : 5500)) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), ph: Math.random() * TAU }));
    st.jel = Array.from({ length: w ? 2 : 5 }, (_, i) => ({ j: JELLY[i % 3], x: W * (i + .5) / (w ? 2 : 5) + (Math.random() - .5) * W * .1, y: GY * (.2 + .6 * Math.random()), ph: Math.random() * TAU, px: px + (i % 2), par: .8 }));
    st.fish = [];
    for (let s = 0; s < (w ? 1 : 3); s++) { const x0 = Math.random() * W, y0 = GY * (.25 + .2 * s), dir = s % 2 ? -1 : 1;
      for (let i = 0; i < 5; i++) st.fish.push({ sp: GFISH[s % 2], px, dir, v: u * 3, par: 1, m: 12 * u, x: x0 + (Math.random() - .5) * 8 * u, y: y0 + (Math.random() - .5) * 4 * u, ph: Math.random() * TAU }); }
    st.lan = [];
    for (let s = 0; s < (w ? 1 : 2); s++) { const x0 = Math.random() * W, y0 = GY * (.4 + .25 * s), dir = s ? 1 : -1;
      for (let i = 0; i < (w ? 4 : 7); i++) st.lan.push({ px: px + 1, dir, v: u * 2.4, par: 1, m: 14 * u, x: x0 + (Math.random() - .5) * 12 * u, y: y0 + (Math.random() - .5) * 5 * u, ph: Math.random() * TAU }); }
    st.shrimp = Array.from({ length: w ? 2 : 5 }, () => ({ px: Math.max(1, px - 1), dir: Math.random() < .5 ? 1 : -1, v: u * 1.5, par: 1, m: 4 * u, x: Math.random() * W, y: GY * (.3 + .6 * Math.random()), ph: Math.random() * TAU }));
    st.bubbles = Array.from({ length: w ? 4 : 12 }, () => ({ x: Math.random() * W, y: Math.random() * GY, r: u * (.5 + Math.random()), v: u * (1.5 + 2 * Math.random()), ph: Math.random() * TAU }));
    st.sip = { dir: 1, v: u * 1.1, par: .7, m: 32 * u, x: W * .15, y: GY * (w ? .2 : .15) };
    st.shark = w ? null : { dir: -1, v: u * .8, par: .25, m: spW(WSHARK, px * 2) + 4 * u, x: W * .6, y: GY * .08, px: px * 2 };
    st.iso = { dir: 1, v: u * .6, par: 1, m: 6 * u, x: W * .4, px };
    st.spk = [];
    st.ang = { sp: ANGLER, px: px + 2, dir: -1, v: u * 1.3, par: 1, m: spW(ANGLER, px + 2) + 6 * u, x: W * .7, y: GY * (w ? .45 : .62), ph: 0 };
  }
  registerTheme('abyss', { name: 'Abyssal City',
    kit: { styles: ['ribbon', 'slim', 'grid', 'cols', 'ribbon'], roofs: [null, null, ['antenna', 6], ['spire', 8], ['antenna2', 6], null], tall: .4, shrink: .8, w0: 7, gaps: [.6, 1.6] },
    minF: .3, maxF: .75, noWeather: true, planes: false, roofLights: false, stars: false, moon: false, cloud: CLEAR, rain: CLEAR, fogRGB: '20,80,100',
    sky: [[0, '#06283a'], [.35, '#03131f'], [1, '#00050a']], skyToGround: true,
    drawSky(g, E) {
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
      if (b.dots) eachTier(b, cx, E, (x0, y, w) => {
        g.fillStyle = `hsla(${b.hueD},100%,70%,${.35 + .65 * b.flash})`;
        for (let x = x0 + u; x < x0 + w - u * .5; x += u * 2) g.fillRect(x, y - Math.max(1, u * .2), Math.max(1, u * .4), Math.max(1, u * .4));
        const d = depthOf(w);                            // and on back along the 3D top, at half strength like the shaded side
        if (d >= 3) withAlpha(g, .6, () => { for (const s of [.35, .85]) g.fillRect(x0 + w + s * d - Math.max(.5, u * .2), y - s * d / 2 - Math.max(1, u * .2), Math.max(1, u * .4), Math.max(1, u * .4)); });
      });
      if (b.glass) {                                     // a glass dome over the whole roof, on a glowing collar, its far rim seen through it
        const B = domeBase(cx, ty, tw), x = B.x, rx = B.rx, ry = Math.min(tw * .45, 10 * u), rb = Math.max(1, B.rb || u * .4);
        collar(g, B, ['#0a3a48', '#052733', '#03121a'], `rgba(120,245,255,${.5 + .45 * lv})`);
        const by = B.by - B.c;
        glow(g, '60,230,255', x, by - ry * .4, rx * 1.3, .2 + .55 * lv);
        const gl = g.createRadialGradient(x - rx * .4, by - ry * .7, 0, x, by - ry * .3, Math.max(rx, ry) * 1.2);
        gl.addColorStop(0, 'rgba(170,250,255,.30)'); gl.addColorStop(.6, 'rgba(70,220,255,.12)'); gl.addColorStop(1, 'rgba(20,120,160,.22)');
        g.fillStyle = gl; g.beginPath(); g.ellipse(x, by, rx, ry, 0, Math.PI, TAU); g.ellipse(x, by, rx, rb, 0, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(120,240,255,.22)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, by, rx, rb, 0, Math.PI, TAU); g.stroke();   // far side of the base ring
        g.beginPath();                                    // meridians, foreshortened by the curve
        for (const k of [-.55, 0, .55]) g.ellipse(x, by, rx * Math.abs(k) || .5, ry, 0, k < 0 ? Math.PI : Math.PI * 1.5, k < 0 ? Math.PI * 1.5 : TAU);
        g.moveTo(x, by - ry); g.lineTo(x, by); g.stroke();
        g.strokeStyle = `rgba(140,250,255,${.45 + .4 * lv})`; g.lineWidth = Math.max(1, u * .2);
        g.beginPath(); g.ellipse(x, by, rx, ry, 0, Math.PI, TAU); g.ellipse(x, by, rx, rb, 0, 0, Math.PI); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x, by, rx * .78, ry * .82, 0, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
      }
    },
    drawBehind(g, E) {
      sync(E);
      const s = st.shark; if (!s) return;
      swim(s, E); withAlpha(g, .32, () => drawPix(g, WSHARK, s.px, s.x, s.y + Math.sin(E.t / 4000) * E.unit * 1.5, s.dir < 0));
    },
    drawFront(g, E) {
      sync(E);
      const { W, H, GY, t, dt, unit: u, scrollV } = E;
      g.fillStyle = 'rgba(200,230,235,.45)';
      for (const p of st.snow) {
        p.y += u * (.5 + p.s) * dt; p.x += (Math.sin(t / 2000 + p.ph) * u * .3 - scrollV * (.4 + .6 * p.s)) * dt;
        if (p.y > H) { p.y = -2; p.x = Math.random() * W; }
        if (p.x < -2) p.x += W + 4; else if (p.x > W + 2) p.x -= W + 4;
        const s = p.s > .8 ? 2 : 1; g.fillRect(p.x, p.y, s, s);
      }
      for (const f of st.fish) { swim(f, E); const y = f.y + Math.sin(t / 600 + f.ph) * u * .4; glow(g, '80,255,220', f.x + spW(f.sp, f.px) / 2, y + f.px, u * 1.3, .5); drawPix(g, f.sp, f.px, f.x, y, f.dir < 0); }
      const sp = st.sip;                                 // siphonophore: a long drifting chain; a light wave runs down it on hits
      if (hitNow(st, 'pf', E.bands[5].flash)) st.sipT = t;
      swim(sp, E);
      for (let i = 0; i < 24; i++) {
        const bx = sp.x - sp.dir * i * u * 1.15, by = sp.y + Math.sin(i * .45 - t / 800) * u * 1.8, wave = Math.max(0, 1 - Math.abs(i - (t - st.sipT) / 45) / 3), a = .55 + .45 * wave;
        if (i % 3 === 0) glow(g, '120,200,255', bx, by, u * (1.2 + 1.5 * wave), .25 + .5 * wave);
        g.fillStyle = `rgba(${150 + 105 * wave | 0},220,255,${a})`; g.fillRect(bx - u * .3, by - u * .3, Math.max(1, u * .6), Math.max(1, u * .6));
      }
      g.fillStyle = 'rgba(180,230,255,.06)'; g.strokeStyle = 'rgba(200,240,255,.35)'; g.lineWidth = 1;
      for (const b of st.bubbles) {
        b.y -= b.v * dt; b.x += (Math.sin(t / 1500 + b.ph) * u * .5 - scrollV * .8) * dt;
        if (b.y < -b.r * 2) { b.y = GY + b.r * 2; b.x = Math.random() * W; }
        if (b.x < -20) b.x += W + 40; else if (b.x > W + 20) b.x -= W + 40;
        g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.stroke();
      }
      const pf = E.bands[6].flash;                       // lanternfish: photophores flash white on the treble
      for (const f of st.lan) { swim(f, E); drawPix(g, LANTERN[pf > .5 ? 1 : 0], f.px, f.x, f.y + Math.sin(t / 700 + f.ph) * u * .4, f.dir < 0); }
      const kick = E.bands[1].flash;                     // glowing shrimp dart on the kick
      for (const s of st.shrimp) { swim(s, E, 1 + 6 * kick); const y = s.y + Math.sin(t / 900 + s.ph) * u; glow(g, '255,110,70', s.x + 3 * s.px, y + 2 * s.px, u * 1.3, .45); drawPix(g, SHRIMP, s.px, s.x, y, s.dir < 0); }
      if (hitNow(st, 'af', Math.max(E.bands[4].flash, E.bands[7].flash)))   // bioluminescent sparkles on hits
        for (let i = 0; i < (E.widget ? 2 : 5); i++) st.spk.push({ x: Math.random() * W, y: Math.random() * GY, life: 1, rgb: Math.random() < .5 ? '120,255,230' : '160,170,255' });
      for (let i = st.spk.length - 1; i >= 0; i--) {
        const s = st.spk[i]; s.life -= dt * 1.8; s.x -= scrollV * dt; if (s.life <= 0) { st.spk.splice(i, 1); continue; }
        glow(g, s.rgb, s.x, s.y, u * 2.2 * s.life, s.life * .8);
        withAlpha(g, s.life, () => { g.fillStyle = '#fff'; g.fillRect(s.x - u * s.life, s.y - .5, 2 * u * s.life, 1); g.fillRect(s.x - .5, s.y - u * s.life, 1, 2 * u * s.life); });
      }
      for (const j of st.jel) {                          // jellyfish: contract and jet upward on the bass
        const pulse = E.bassFlash > .45 || Math.sin(t / 650 + j.ph) > .82, [frames, rgb] = j.j, sp = frames[pulse ? 1 : 0];
        j.y -= u * (pulse ? 7 : .9) * dt; j.x += (Math.sin(t / 2600 + j.ph) * u * .6 - scrollV * j.par) * dt;
        const jw = spW(sp, j.px), jh = spH(sp, j.px);
        if (j.y < -jh * 2) { j.y = GY + jh; j.x = Math.random() * W; }
        if (j.x < -jw * 2) j.x += W + jw * 4; else if (j.x > W + jw * 2) j.x -= W + jw * 4;
        glow(g, rgb, j.x + jw / 2, j.y + jh * .25, jw * 1.2, .3 + .5 * E.bassFlash);
        withAlpha(g, .9, () => drawPix(g, sp, j.px, j.x, j.y, false));
      }
      const a = st.ang; swim(a, E);
      const ay = a.y + Math.sin(t / 2200) * u, P = Math.max(1, Math.round(a.px)), lx = a.x + (a.dir < 0 ? (15 - 12) * P : 12 * P) + P / 2, ly = ay + 2.5 * P;
      const lure = .5 + .5 * avg(E.bands, 5, 7) + .4 * E.bands[6].flash;
      glow(g, '160,255,235', lx, ly, u * (2 + 3 * lure), .35 + .5 * lure);
      drawPix(g, a.sp, a.px, a.x, ay, a.dir < 0);
      glow(g, '230,255,250', lx, ly, u * .8, .9);
    },
    ground: { h: .1, draw(g, E) {
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
        if (hash(i, 12, 21) < .55) {                     // an eel peeking out beside the vent: further out on the bass
          const out = u * (1.5 + 3 * Math.max(0, Math.sin(t / 2600 + i * 2)) + 3 * kick), sw = Math.sin(t / 500 + i) * u * .6, ex = x + u * 1.4, ey = by - h * .45;
          g.strokeStyle = '#5a8a5c'; g.lineWidth = Math.max(2, u * 1.1); g.lineCap = 'round';
          g.beginPath(); g.moveTo(ex, ey); g.quadraticCurveTo(ex + u + sw, ey - out * .5, ex + u * 1.4 + sw * 1.5, ey - out); g.stroke();
          g.fillStyle = '#d6ff6a'; g.fillRect(ex + u * 1.4 + sw * 1.5, ey - out - u * .2, Math.max(1, u * .3), Math.max(1, u * .3));
        }
      }
      const ps = 2.6 * u, sp = E.spectrum;
      for (let i = Math.floor((travel - 2 * u) / ps); i * ps - travel < W + 2 * u; i++) {
        if (hash(i, 7, 21) < .5) continue;
        const x = i * ps - travel + hash(i, 8, 21) * ps, by = GY + gh * (.4 + .45 * hash(i, 9, 21)), h = u * (1 + 2.5 * hash(i, 10, 21)), kk = i & 7;
        g.fillStyle = '#123038'; g.fillRect(x, by - h, Math.max(1, u * .25), h);
        g.fillStyle = `hsla(${165 + 130 * hash(i, 11, 21)},100%,${55 + 25 * sp[kk]}%,${.4 + .6 * sp[kk]})`;
        g.fillRect(x - u * .2, by - h - u * .5, Math.max(1, u * .65), Math.max(1, u * .6));
      }
      sync(E);
      const iso = st.iso; swim(iso, E);
      drawPix(g, ISOPOD[Math.floor(iso.x / Math.max(1, u * .6)) & 1], iso.px, iso.x, GY + gh * .7 - spH(ISOPOD[0], iso.px), false);
    } },
  });
}

// Aurora curtains, shared with Christmas Village: en is how strongly the music swells them, t their own clock (ms), a the
// overall strength (1 for Aurora Harbor's full sky).
const rib = stops => mk(1, 128, (x, w, h) => { x.fillStyle = lin(x, 0, 0, 0, h, stops); x.fillRect(0, 0, w, h); });
let RIBS = null;
function curtains(g, E, en, t, a) {
  RIBS = RIBS || [
    rib([[0, 'rgba(160,80,255,0)'], [.35, 'rgba(150,90,255,.3)'], [.75, 'rgba(70,255,170,.75)'], [.92, 'rgba(150,255,210,.95)'], [1, 'rgba(70,255,170,0)']]),
    rib([[0, 'rgba(255,80,200,0)'], [.4, 'rgba(200,90,255,.35)'], [.8, 'rgba(90,240,200,.6)'], [1, 'rgba(90,240,200,0)']]),
    rib([[0, 'rgba(60,255,160,0)'], [.5, 'rgba(60,255,160,.35)'], [.9, 'rgba(160,255,220,.6)'], [1, 'rgba(60,255,160,0)']]),
  ];
  const { W, GY } = E, n = E.widget ? 50 : 150, step = W / n;
  const a0 = g.globalAlpha, op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const R = RIBS[i], wgt = [1, .65, .5][i] * a;
    for (let j = 0; j <= n; j++) {
      const x = j * step, p = x / W;
      const yc = GY * (.2 + .1 * i) + Math.sin(p * TAU * 1.3 + t / 4000 + i * 2) * GY * .06 + Math.sin(p * TAU * 3.1 - t / 2300 + i) * GY * .03;
      const h = GY * (.18 + .06 * en) * (.55 + .45 * Math.sin(p * TAU * 2.2 + t / 1700 + i * 1.7));
      const al = (.3 + .5 * en) * (.6 + .4 * Math.sin(p * TAU * 4.3 + t / 2600 + i)) * Math.min(1, p * 6, (1 - p) * 6 + .3) * wgt;
      g.globalAlpha = a0 * Math.min(1, Math.max(0, al));
      g.drawImage(R, x, yc - h, step + 1, h);
    }
  }
  g.globalCompositeOperation = op; g.globalAlpha = a0;
}
// Aurora Harbor: a snowy, low waterfront of warm-lit houses on a frozen bay under rippling auroras.
// Music: the aurora drifts slowly on its own clock; the mids and highs gently swell its glow, most at the curtains' base.
{
  const st = { en: .5, ph: 0, list: [], ik: '', ice: null };
  registerTheme('aurora', { name: 'Aurora Harbor',
    kit: { styles: ['pairs', 'grid', 'wide', 'tall', 'pairs'], roofs: [['pyramid', 4], ['pyramid', 5], ['pyramid', 3], null, ['pyramid', 6], ['antenna', 4]], tall: .15, shrink: .8, w0: 6, gaps: [.6, 1.2] },
    minF: .15, maxF: .45, weather: 'snow', widgetSky: true,
    sky: [[0, '#01040f'], [.55, '#061430'], [1, '#14304a']], skyToGround: true,
    drawSky(g, E) {
      const { dt, bands } = E;
      const en = .25 + .55 * avg(bands, 3, 5) + .45 * avg(bands, 6, 7);
      st.en += (en - st.en) * Math.min(1, dt * .7);        // a slow follow: the music swells it over a second or two, never jolts it
      st.ph += dt;
      curtains(g, E, st.en, st.ph * 1000 / 3, 1);         // its own steady clock, a third of real speed
    },
    stars: true, moon: false, cloud: CLEAR, fogRGB: '170,190,220',
    body: '#0c0f17', side: '#151925', top: '#1d2230',
    win: c => ({ h: 26 + c.h / 360 * 22, s: 92, m: c.m }),
    back: { h: .6, density: .7, body: '#0a1424', win: () => 'rgba(255,190,110,.28)' },
    searchlights: false,
    afterLayout(list) { st.list = list; },
    drawExtras(g, b, cx, tip, E) {
      if (b.lm || !b.roof || b.roof[0] !== 'pyramid') return;
      const tw = b.tiers[b.tiers.length - 1].w * E.unit, h = b.roof[1] * E.unit, k = Math.min(.85, .5 * (1 + (E.snowCap - 1) * .5));   // deeper in a blizzard
      g.fillStyle = '#e6edf8'; g.beginPath(); g.moveTo(tip[0], tip[1] - .5); g.lineTo(tip[0] - tw / 2 * k, tip[1] + h * k); g.lineTo(tip[0] - tw * .1, tip[1] + h * k * .8); g.lineTo(tip[0] + tw * .05, tip[1] + h * k); g.lineTo(tip[0] + tw / 2 * k, tip[1] + h * k); g.fill();
    },
    ground: { h: .12, draw(g, E) {
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
      for (const b of st.list) {
        const x = E.toScreen(b.cx); if (x < -b.wpx || x > W + b.wpx) continue;
        withAlpha(g, .12 + .4 * b.level, () => g.drawImage(sprite('255,180,90'), x - b.wpx * .45, iy - ih * .1, b.wpx * .9, ih * 1.1));
      }
      const bs = 55 * u;
      for (let i = Math.floor((travel - 6 * u) / bs); i * bs - travel < W + 6 * u; i++) {
        if (hash(i, 1, 41) < .4) continue;
        const x = i * bs - travel + hash(i, 2, 41) * bs * .6, y = iy + ih * .35, L = u * (4 + 2 * hash(i, 3, 41));
        g.fillStyle = '#0a0f18'; g.beginPath(); g.moveTo(x - L / 2, y - u); g.lineTo(x + L / 2, y - u); g.lineTo(x + L * .38, y); g.lineTo(x - L * .4, y); g.fill();
        g.fillRect(x - u * .1, y - u * 5, Math.max(1, u * .2), u * 4);
        g.fillStyle = '#e6edf8'; g.fillRect(x - L / 2, y - u - Math.max(1, u * .25), L, Math.max(1, u * .25));
        if ((t / 1000 + i) % 3 < 1.5) { g.fillStyle = '#ffcf80'; g.fillRect(x - u * .2, y - u * 5.2, Math.max(1, u * .4), Math.max(1, u * .4)); }
      }
      g.fillStyle = '#dfe8f4'; g.beginPath(); g.moveTo(0, GY);
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, iy - shore * .15 * (1 + Math.sin((x + travel) / (u * 9)) * .6));
      g.lineTo(W, GY); g.fill();
      g.fillStyle = 'rgba(150,180,220,.35)'; g.fillRect(0, GY + shore * .5, W, shore * .3);
    } },
  });
}

// Lunar Colony: domes, habitat modules and antenna towers on a grey cratered plain, Earth hanging in a black sky.
// Music: landing beacons blink with the beat, dishes sweep a little faster with the mids, and every 30-60 s a rocket
// lifts off a random pad on the next big bass hit: the pad's centre hatch irises open and the rocket climbs out slowly.
{
  const ROVER = PAL(['.......d....', '.......a....', '..pppppppp..', '.WWWWWWWWWW.', '.WWgWWWWWWWW', '.WWWWWWWWWW.', '.KK..KK..KK.', '.KK..KK..KK.'],
    { d: '#ff4040', a: '#9aa0a8', p: '#2c5aa8', W: '#e8e8ea', g: '#5ad0ff', K: '#2a2a2e' });
  const ROCKET = PAL(['..r..', '.rrr.', '.WWW.', '.WbW.', '.WWW.', '.WWW.', '.WWW.', 'rWWWr', 'r.g.r'], { r: '#e8403a', W: '#f2f2f4', b: '#3fa0ff', g: '#555' });
  const st = { key: '', ek: '', earth: null, rovers: null, rk: null, hatch: null, prevBF: 0, next: 0, smoke: [], gk: '', gg: null, list: [], pads: [] };
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
    drawSky(g, E) {
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
      if (b.roof && b.roof[0] === 'dome') {
        g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(tip[0] - tw * .15, tip[1] + b.roof[1] * u * .45, tw * .14, b.roof[1] * u * .22, -.5, 0, TAU); g.fill();
      }
      if (b.dish) {                                       // the sweep advances at a smoothed speed, so a loud bar never makes it jump
        if (b.dt !== E.t) { b.dt = E.t; b.dsp = (b.dsp ?? 1) + (1 + .5 * avg(E.bands, 2, 4) - (b.dsp ?? 1)) * Math.min(1, E.dt); b.dang = (b.dang ?? b.dphase) + E.dt * b.dsp / 1.8; }
        const x = cx + tw * .28, y = ty - u * 1.2, a = Math.sin(b.dang) * .7 - Math.PI / 2;
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
    ground: { h: .14, draw(g, E) {
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
        const x = i * ps - travel + ps * .3, pw = 7 * u, hx = pw * .32, hy = pw * .055, o = st.hatch && st.hatch.pad === i ? st.hatch.o : 0;
        pads.push({ i, x });
        g.fillStyle = '#5b5e65'; g.beginPath(); g.ellipse(x, py, pw, pw * .18, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,220,90,.6)'; g.lineWidth = Math.max(1, u * .2); g.beginPath(); g.ellipse(x, py, pw * .6, pw * .1, 0, 0, TAU); g.stroke();
        g.fillStyle = '#41444a'; g.beginPath(); g.ellipse(x, py, hx, hy, 0, 0, TAU); g.fill();   // the launch hatch in the middle
        g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - hx, py); g.lineTo(x + hx, py); g.moveTo(x, py - hy); g.lineTo(x, py + hy); g.stroke();
        if (o > 0) {                                     // irising open onto the dark launch shaft, lit from below
          g.fillStyle = '#07080b'; g.beginPath(); g.ellipse(x, py, hx * o, hy * o, 0, 0, TAU); g.fill();
          glow(g, '255,170,70', x, py, hx * o * .8, .35 * o);
        }
        for (let s = 0; s < 4; s++) {                     // beacons round the pad: chasing blink, all flare on the beat
          const bx = x + Math.cos(s * TAU / 4) * pw, by = py + Math.sin(s * TAU / 4) * pw * .18;
          const on = Math.max(((t / 250 + s) % 4) < 1 ? 1 : 0, E.bassFlash), rgb = s % 2 ? '255,60,60' : '80,255,120';
          g.fillStyle = `rgb(${rgb})`; g.fillRect(bx - Math.max(.5, u * .2), by - u * .5, Math.max(1, u * .4), Math.max(1, u * .4));
          if (on > .05) glow(g, rgb, bx, by - u * .3, u * 1.8, on * .8);
        }
      }
      st.pads = pads;
    } },
    drawTop(g, E) {                                      // rovers and launches, in front of the ground
      const { W, H, GY, unit: u, t, dt, scrollV } = E, gh = H - GY, py = GY + gh * .35, pads = st.pads || [];
      const px = pxOf(E, .5);
      if (!st.rovers || st.key !== keyOf(E)) {
        st.key = keyOf(E); st.rk = st.hatch = null; st.smoke = []; st.next = t + 8000 + 10000 * Math.random();   // the first one soon after you arrive
        st.rovers = [[.15, 1, 1.6, .55], [.55, -1, 1.1, .78], [.82, 1, 2.1, .44]].map(([x, dir, v, lane]) =>
          ({ sp: ROVER, px, dir, v: u * v, par: 1, m: spW(ROVER, px) + 4 * u, x: W * x, lane, bob: Math.random() * TAU }));
      }
      for (const rv of [...st.rovers].sort((a, b) => a.lane - b.lane)) {   // nearer rovers drawn last
        swim(rv, E);
        drawPix(g, ROVER, rv.px, rv.x, GY + gh * rv.lane - spH(ROVER, rv.px) + Math.round(Math.sin(t / 300 + rv.bob) * .6), rv.dir < 0);
      }
      // Launch: once the wait is over, the next big bass hit (or 8 s without one) picks a random pad on screen.
      const beat = st.prevBF < .9 && E.bassFlash >= .9;
      st.prevBF = E.bassFlash;
      if (!st.rk && !st.hatch && t >= st.next && (beat || t > st.next + 8000)) {
        const pick = pads.filter(p => p.x > W * .08 && p.x < W * .92);
        if (pick.length) {
          const p = pick[Math.floor(Math.random() * pick.length)];
          st.hatch = { pad: p.i, o: 0, closing: false };
          st.rk = { pad: p.i, x: p.x, y: null, v: 0, phase: 'open' };
        }
        st.next = t + 30000 + 30000 * Math.random();
      }
      const hatch = st.hatch;
      if (hatch) {
        hatch.o = Math.max(0, Math.min(1, hatch.o + (hatch.closing ? -1 : 1) * dt / 1.4));
        if (hatch.closing && hatch.o === 0) st.hatch = null;
      }
      for (let i = st.smoke.length - 1; i >= 0; i--) { const s = st.smoke[i]; s.r += u * 3 * dt; s.a -= dt * .35; s.x -= scrollV * dt; if (s.a <= 0) st.smoke.splice(i, 1); }
      g.fillStyle = 'rgb(210,210,215)';
      for (const s of st.smoke) withAlpha(g, s.a, () => { g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill(); });
      if (st.rk) {
        const r = st.rk, rp = Math.max(1, Math.round(px * 1.4)), w = spW(ROCKET, rp), h = spH(ROCKET, rp);
        const pad = pads.find(p => p.i === r.pad);
        if (r.phase !== 'fly' && pad) r.x = pad.x; else r.x -= scrollV * dt;
        r.y ??= py + h;                                   // waiting in the shaft, out of sight
        if (r.phase === 'open' && hatch && hatch.o >= 1) r.phase = 'rise';
        else if (r.phase === 'rise') { r.y -= u * 3 * dt; if (r.y <= py) { r.y = py; r.phase = 'fly'; } }   // eases up out of the hatch
        else if (r.phase === 'fly') {
          r.v = Math.min(GY * .3, r.v + GY * .04 * dt); r.y -= r.v * dt;   // a slow, heavy climb: several seconds to clear the sky
          if (hatch && !hatch.closing && r.y < py - h * 1.5) hatch.closing = true;
          if (r.y > GY - GY * .35 && Math.random() < .5) st.smoke.push({ x: r.x + (Math.random() - .5) * w, y: Math.min(r.y, py) + u * .5, r: u, a: .45 });
        }
        if (r.phase !== 'open') {
          g.save();
          if (r.phase === 'rise') { g.beginPath(); g.rect(0, 0, W, py); g.clip(); }   // only what has come out of the hatch shows
          const fl = h * (r.phase === 'fly' ? .5 + .4 * Math.random() : .2 + .15 * Math.random());
          g.fillStyle = '#ffd36a'; g.beginPath(); g.moveTo(r.x - w * .3, r.y); g.lineTo(r.x, r.y + fl); g.lineTo(r.x + w * .3, r.y); g.fill();
          glow(g, '255,170,70', r.x, r.y + fl * .3, u * 4, .8);
          drawPix(g, ROCKET, rp, r.x - w / 2, r.y - h, false);
          g.restore();
        }
        if (r.y < -h * 2 || (!pad && r.phase !== 'fly')) { st.rk = null; if (st.hatch) st.hatch.closing = true; }
      }
    },
  });
}
// Christmas Village: snowy cottages and shops with string lights and wreaths, a little church, a toy workshop, gingerbread
// cottages, a great lit tree, now and then a faint aurora with angels, a frozen river and a snowy
// road. A great four-pointed star gleams in the top left. Every 30-90 s a sleigh crosses the sky behind a team of reindeer,
// a glowing red nose in front (only one sleigh at a time). Three travellers on camels (green, red and blue robes, small gold
// crowns) ride single file along the road from right to left; once they're gone, they set out again after 10-25 s.
{
  const { registerLandmark, STY } = CP;
  STY.cottage = { cw: 3.4, ch: 3.6, ww: .42, wh: .48 };   // a house's few, well-spaced windows
  const WALLS = ['#3a1a1e', '#1a2c22', '#1e2636', '#2e1e30', '#33241a', '#141019'];   // deep red, pine, slate, plum, brown, night
  const CAMEL = [
    '......k.k.k.....', '......kkkkk.....', '......hsss......', '......hhsh......', '.....ggggg......', '....gggggggg....',
    '....ggggggg..cc.', '...cggggggc..ccc', '..cccccccccc.cc.', '.dcccccccccccc..', '.d.cccccccccc...', '...cccccccccc...'];
  const LEGS = [['...c.c....c.c...', '...c.c....c.c...', '...d.d....d.d...'], ['....cc....cc....', '...c..c..c..c...', '...d..d..d..d...']];
  const camelPal = robe => ({ k: '#ffd23a', h: '#3a2a1a', s: '#d9a57a', g: robe, c: '#c8955a', d: '#7a5230' });
  const RIDERS = ['#2f9e4a', '#d23a32', '#2f63d6'].map(robe => LEGS.map(l => PAL([...CAMEL, ...l], camelPal(robe))));
  const DEER = n => [['........a.a.', '.........aa.', '........bbb' + n, '.bbbbbbbbb..', 'tbbbbbbbbb..', '.bbbbbbbb...', '.b..b..b..b.', 'b..b....b..b'],
    ['........a.a.', '.........aa.', '........bbb' + n, '.bbbbbbbbb..', 'tbbbbbbbbb..', '.bbbbbbbb...', '..bb....bb..', '..b......b..']]
    .map(rows => PAL(rows, { a: '#d8c49a', b: '#8a5a32', t: '#f0e6d8', n: '#ff2a2a', m: '#2a1a10' }));
  const LEAD = DEER('n'), TEAM = DEER('m');
  const SLEIGH = PAL(['.....w...........', '....rr...........', '...rrrr..........', '...wsss..........', '..rwwwwr.........', 'BBrrrrrrr.......G',
    'BBRRRRRRRRRRRRRRG', '.RRRRRRRRRRRRRRR.', '..RRRRRRRRRRRRR..', 'GGGGGGGGGGGGGGGGG'],
    { w: '#ffffff', r: '#e02a2a', s: '#e8b48a', B: '#7a4a24', R: '#a3121c', G: '#e8c040' });
  const CANE = PAL(['.rw.', 'w..r', 'r..w', '...r', '...w', '...r', '...w', '...r', '...w'], { r: '#e8202a', w: '#ffffff' });
  const GIFTS = [['#c8202a', '#ffd23a'], ['#1f8a3a', '#ffffff'], ['#2a52c8', '#ffd23a'], ['#ffffff', '#e8202a']]
    .map(([b, y]) => PAL(['.y..y.', '..yy..', 'bbybbb', 'bbybbb', 'yyyyyy', 'bbybbb', 'bbybbb'], { b, y }));
  const BULBS = ['#ff3b3b', '#3bff6a', '#ffd23a', '#3b8bff'];
  const st = { list: [], santa: null, nextSanta: 0, men: null, nextMen: 0, au: null, nextAu: 0, gapW: 0, last: -1, ik: '', ice: null, tk: '', tree: null,
    treeX: null, cars: [], nextCar: 0, skaters: [], nextSkater: 0, skN: 3, skRoll: 0, fights: new Map() };
  const ROAD = .58;                                       // the snowy road's share of the ground; the frozen river below it

  // The children in the snowball fights, in winter coats, hats with pom-poms, scarves and boots. Facing right.
  // Poses: standing, winding up (snowball raised behind), throwing (arm forward), crouching (packing snow), knocked over.
  const KID = {
    stand: ['...p....', '..hhh...', '..hhhh..', '..ffef..', '..ffff..', '.sssss..', '.scccc..', '..cccc..', '..cmcc..', '..llll..', '..l..l..', '.bb..bb.'],
    wind: ['...p....', '..hhh...', '..hhhh..', '..ffef..', 'w.ffff..', 'msssss..', '.ccccc..', '..cccc..', '..cccc..', '..llll..', '.l...l..', 'bb...bb.'],
    throw: ['...p.....', '..hhh....', '..hhhh...', '..ffef...', '..ffff...', '.ssssscmw', '.sccccc..', '..cccc...', '..cccc...', '..llll...', '..l...l..', '.bb...bb.'],
    crouch: ['...p....', '..hhh...', '..hhhh..', '..ffef..', '.sssss..', '.ccccmw.', '.llllbb.'],
    duck: ['...p....', '..hhh...', '..hhhh..', '.ssssmw.', '.llllbb.'],
    down: ['..............', 'p.............', 'hhhffsccccllbb', 'hhhefsccccl.bb', '.hh..m........'],
  };
  const KID_PALS = [['#d23a32', '#2a52c8', '#ffd23a'], ['#2f9e4a', '#e8202a', '#ffffff'], ['#2a52c8', '#ffd23a', '#e8202a'], ['#b03ad8', '#ffffff', '#2f9e4a'],
    ['#e07a20', '#2a7ad8', '#ffffff'], ['#1f8a8a', '#d23a32', '#ffd23a']]
    .map(([c, h, s]) => Object.fromEntries(Object.entries(KID).map(([k, rows]) => [k, PAL(rows,
      { c, h, s, p: '#ffffff', f: '#f0c8a0', e: '#1a1a1a', m: h, l: '#2a2a3a', b: '#3a2416', w: '#ffffff' })])));
  const MOUND = PAL(['...wwwwww...', '.wwwwwwwwwss', 'wwwwwwwwwwss', '.ssssssssss.'], { w: '#eef3fb', s: '#c3d0e6' });
  const SNOWMAN = PAL(['....kkkk....', '....kkkk....', '...kkkkkk...', '...wwwwww...', '...wkwwkw...', '...wwwnnn...', '...wwwwww...', '..rrrrrrrr..', 'a...wwwwrr..', '.a.wwkwwwwa.',
    '..awwwwwwa..', '..wwwkwwww..', '...wwwwww...', '..wwwwwwww..', '.wwwwkwwwww.', '.wwwwwwwwww.', '.wwwwwwwwws.', '..swwwwwwss.'],
    { k: '#1a1a22', w: '#f2f6fc', s: '#c3d0e6', n: '#f07a20', r: '#d23a32', a: '#5a3a20' });
  // Small pines along the back path: plain, or lightly dressed with gold garland (g) and bulbs (o, lit each frame).
  const PINES = [
    ['....s....', '...sgs...', '...ggg...', '..sgggs..', '..ggggg..', '.sgggggs.', '..ggggg..', '.ggggggg.', 'sgggggggs', '.ggggggg.', 'ggggggggg', '....t....', '....t....'],
    ['....s....', '...sgs...', '...gog...', '..sgyys..', '..yggog..', '.sgogggs.', '..gggyy..', '.gyyogog.', 'sgggogggs', '.ogggyyy.', 'gyyggogog', '....t....', '....t....'],
    ['......s......', '.....sgs.....', '.....ggg.....', '....sgggs....', '....ggggg....', '...sgggggs...', '....ggggg....', '...ggggggg...', '..sgggggggs..',
      '...ggggggg...', '..ggggggggg..', '.sgggggggggs.', '..ggggggggg..', '.ggggggggggg.', 'sgggggggggggs', '......t......', '......t......'],
    ['......s......', '.....sgs.....', '.....gog.....', '....sgyys....', '....ggogg....', '...syyggos...', '....gggyy....', '...ogggggo...', '..sgyyygggs..',
      '...gggoyyy...', '..oggggggog..', '.syyygggggys.', '..ggogggyyg..', '.ggggggoggg.', 'syyygggogggs', '......t......', '......t......']]
    .map(rows => PAL(rows, { g: '#1a5a32', s: '#eef3fb', o: '#1a5a32', y: '#d8b040', t: '#4a2e18' }));
  const pineBulbs = PINES.map(sp => sp.rows.flatMap((r, j) => [...r].map((c, i) => c === 'o' ? [i, j] : null).filter(Boolean)));
  // The skaters (grown-ups, so they don't count against the children), men and women, facing right. The legs stride:
  // both blades gliding, then the back leg pushing out behind and lifting, then back in (SK_LEGS frames 0, 1, 2, 1).
  const SK_MAN = ['....hh....', '...hhhh...', '....ff....', '....fe....', '...sss....', '..scccc...', '...ccccm..', '...cccc...', '...cccc...'];
  const SK_WOMAN = ['...hhh....', '..hhhhh...', '..rfff....', '..rffe....', '..rsss....', '..scccc...', '...ccccm..', '..cccccc..', '.cccccccc.'];   // hair down her back, a flared skating skirt
  const SK_LEGS = [['....ll....', '....ll....', '....ll....', '...kkkk...'], ['....ll....', '...l.l....', '..l..l....', '.kk.kkk...'],
    ['....ll....', '.lll.l....', 'k....l....', '....kkk...']];
  const skFrames = (top, pals) => pals.map(([c, h, s, r = '#000', l = '#20202a']) => SK_LEGS.map(legs => PAL([...top, ...legs],
    { c, h, s, r, l, f: '#f0c8a0', e: '#1a1a1a', m: '#2a2a2a', k: '#c8d4e4' })));
  const SK_M = skFrames(SK_MAN, [['#7a2a3a', '#1e2a4a', '#e8c040'], ['#1e3a5a', '#d23a32', '#ffffff'], ['#3a5a2a', '#eef3fb', '#d23a32'], ['#4a2a5a', '#ffd23a', '#2a7ad8'], ['#5a3a1a', '#2f9e4a', '#ffffff']]);
  const SK_W = skFrames(SK_WOMAN, [['#a3203a', '#ffffff', '#ffffff', '#5a3418', '#1a1a2a'], ['#2a6a8a', '#f0c0d4', '#d23a32', '#d8b060', '#2a2030'],
    ['#d8cce4', '#d23a32', '#d23a32', '#2a1a10', '#3a2a4a'], ['#6a2a7a', '#ffd23a', '#ffd23a', '#8a3a1a', '#1a1a2a'], ['#1f6a3a', '#ffffff', '#d23a32', '#c89040', '#2a1a1a']]);
  const skLeg = p => p < .55 ? 0 : p < .68 || p >= .85 ? 1 : 2;   // where in the stride, from its phase 0..1
  // The horse-drawn carriages: a trotting horse (two frames), and a coach with a coachman up front. Facing right.
  const HORSE = [['.............hh...', '............mhhh..', '...........mmhhkh.', '...........mhhhhhh', '..........mmh..hhh', '..........mhh.....', '.tt.hhhhhhhh......',
    'tttahhhhhhhhh.....', 't..ahhhhhhhhh.....', '...ahhhhhhhhh.....', '....hhhhhhhh......', '....h..h..h..h....', '...h...h..h...h...', '...o...o..o...o...'],
    ['.............hh...', '............mhhh..', '...........mmhhkh.', '...........mhhhhhh', '..........mmh..hhh', '..........mhh.....', '.tt.hhhhhhhh......',
    'tttahhhhhhhhh.....', 't..ahhhhhhhhh.....', '...ahhhhhhhhh.....', '....hhhhhhhh......', '.....hh....hh.....', '.....hh....hh.....', '.....oo....oo.....']];
  const HORSES = [['#2a1e18', '#120c0a'], ['#7a4a26', '#2a1a10'], ['#d8d2c8', '#8a8478']].map(([h, m]) => HORSE.map(rows => PAL(rows, { h, m, t: m, k: '#000000', a: '#a3121c', o: '#1a1a1a' })));
  const COACH = ['...............tt....', '...............tt....', '..............tttt...', '...............ff....', 'nnnnnnnnnnnnn..cc....', 'ggggggggggggg.cccc...',
    'rrrrrrrrrrrrr.ccccL..', 'rwwwwrrrwwwwr.ss.....', 'rwwwwrrrwwwwrrrrrr...', 'rrrrrrrrrrrrrrrrrr...', 'rgrrrrrrrrrrrgrrr....', '.rrrrrrrrrrrrr.......'];
  const COACHES = ['#6a1420', '#1a3a2a', '#1a2440'].map(r => PAL(COACH, { n: '#eef3fb', g: '#c8a030', r, w: '#ffd88a', t: '#18141a', f: '#f0c8a0', c: '#2a2a3a', s: '#3a2a1a', L: '#ffe9a0' }));
  // An open park carriage with its folding hood up: a couple out for a ride under a tartan blanket, the driver up front.
  const VIC = ['...............tt....', '.nnnnnn........tt....', 'dddddddd......tttt...', 'ddiiMMiii......ff....', 'ddiMMMMppi.....cc....', 'ddiiffiqfi....cccc...',
    'dd.aaaabbb....ccccL..', 'dd.kKkKkKkK..ss......', 'rrrrrrrrrrrrrrrrrr...', 'rgrrrrrrrrrrrgrrr....', 'rrrrrrrrrrrrrrrr.....', '.rrrrrrrrrrrrr.......'];
  const VICS = [['#141418', '#e8e8f0', '#5a3a1a', '#7a1a2a'], ['#5a1420', '#d23a32', '#d8b060', '#1f4a6a'], ['#e8e4dc', '#2f6a3a', '#1a1210', '#6a2a5a']]
    .map(([r, p, q, b]) => PAL(VIC, { r, p, q, b, n: '#eef3fb', g: '#c8a030', d: '#18141a', i: '#9a3a3e', M: '#101014', f: '#f0c8a0', a: '#2a3040',
      k: '#8a1a20', K: '#1f5a32', t: '#18141a', c: '#2a2a3a', s: '#3a2a1a', L: '#ffe9a0' }));
  const ANGEL = [['......hh......', '.....h..h.....', '.....yffy.....', '.ww...ff...ww.', 'wwww.rrrr.wwww', '.wwwwrrrrwwww.', '..wwrrrrrrww..', '....rrrrrr....', '....rrggrr....', '...rrrrrrrr...', '...rrrrrrrr...', '..rrrrrrrrrr..'],
    ['......hh......', '.....h..h.....', '.....yffy.....', '......ff......', '.....rrrr.....', '...wwrrrrww...', '.wwwrrrrrrwww.', 'wwww.rrrr.wwww', 'ww..rrggrr..ww', '...rrrrrrrr...', '...rrrrrrrr...', '..rrrrrrrrrr..']]
    .map(rows => PAL(rows, { h: '#ffd23a', y: '#f2d27a', f: '#f0c8a0', w: '#cfe0ff', r: '#ffffff', g: '#e8c040' }));
  const star5 = (g, x, y, R) => { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * .45 : R, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + r * Math.cos(an), y + r * Math.sin(an)); } g.fill(); };

  // A little church: a gabled nave with tall arched windows, a square tower with a belfry, a spire and a cross.
  registerLandmark('chapel', { w: 16, h: 40, draw(g, L) {
    g.fillStyle = L.body;
    g.fillRect(-8, -14, 12, 14); g.beginPath(); g.moveTo(-8.8, -14); g.lineTo(-2, -20); g.lineTo(4.8, -14); g.fill();   // the nave and its roof
    g.fillRect(4, -25, 5, 25); g.beginPath(); g.moveTo(3.6, -25); g.lineTo(6.5, -36); g.lineTo(9.4, -25); g.fill();     // the tower and spire
    g.fillRect(6.2, -40, .6, 4); g.fillRect(5.4, -38.8, 2.2, .6);                                                    // the cross
    for (const x of [-7, -4.6, -2.2, .2]) {                                                                           // arched windows
      g.fillStyle = L.win(L.lit(6)); g.fillRect(x, -10, 1.4, 6); g.beginPath(); g.arc(x + .7, -10, .7, Math.PI, 0); g.fill();
    }
    g.fillStyle = L.win(L.lit(20)); g.beginPath(); g.arc(6.5, -21, 1.3, 0, TAU); g.fill();                         // the round belfry window
    g.fillStyle = L.win(Math.max(.35, L.lit(2))); g.fillRect(5.6, -4, 1.8, 4);                                        // the open door, lit
    if (!L.side) {                                                                                                    // snow on the roofs
      g.fillStyle = '#eef3fb';
      g.beginPath(); g.moveTo(-8.8, -14); g.lineTo(-2, -20); g.lineTo(4.8, -14); g.lineTo(3.6, -14.6); g.lineTo(-2, -19); g.lineTo(-7.6, -14.6); g.fill();
      g.beginPath(); g.moveTo(3.6, -25); g.lineTo(6.5, -36); g.lineTo(9.4, -25); g.lineTo(8.4, -25.8); g.lineTo(6.5, -33); g.lineTo(4.6, -25.8); g.fill();
    }
  } });

  // The toy workshop: a long factory hall under a sawtooth roof with lit skylights, candy-striped smokestacks puffing smoke,
  // big open doors under a gold star, and a conveyor belt carrying wrapped presents out into the snow.
  registerLandmark('workshop', { w: 45, h: 45, draw(g, L) {
    g.scale(1.5, 1.5);                                                                                    // drawn on a 30-unit plan, shown half again as big
    const t = performance.now(), stacks = [[7, 27], [11.5, 23]];
    for (const [sx, sh] of stacks) {
      g.fillStyle = L.side ? L.body : '#f2f2f2'; g.fillRect(sx, -sh, 2.4, sh - 13);
      if (!L.side) { g.fillStyle = '#d8202a'; for (let y = -sh; y < -13; y += 3) g.fillRect(sx, y, 2.4, 1.5); g.fillStyle = '#eef3fb'; g.fillRect(sx - .3, -sh - .6, 3, .8); }
    }
    g.fillStyle = L.body; g.fillRect(-15, -14, 30, 14);                                                  // the hall
    for (let i = 0; i < 4; i++) {                                                                         // sawtooth roof
      const x0 = -15 + i * 7.5;
      g.fillStyle = L.body; g.beginPath(); g.moveTo(x0, -14); g.lineTo(x0, -19.5); g.lineTo(x0 + 7.5, -14); g.fill();
      g.fillStyle = L.win(L.lit(17)); g.fillRect(x0 + .3, -19, .9, 4.6);                                  // a skylight on the steep face
      if (!L.side) { g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(x0, -19.5); g.lineTo(x0 + 7.5, -14); g.lineTo(x0 + 6.2, -14); g.lineTo(x0 + .2, -18.4); g.fill(); }
    }
    for (const y of [-11, -6.5]) for (const x of [-13.5, -10, -6.5, 4.3, 7.8, 11.3]) { g.fillStyle = L.win(L.lit(-y)); g.fillRect(x, y, 2.2, 3); }
    g.fillStyle = L.win(Math.max(.4, L.lit(2))); g.beginPath(); g.moveTo(-3, 0); g.lineTo(-3, -8); g.arc(0, -8, 3, Math.PI, 0); g.lineTo(3, 0); g.fill();   // the doors, one shape
    if (L.side) return;
    g.fillStyle = '#1f7a36'; g.fillRect(-15, -14.4, 30, .8);                                              // green eaves, a red ribbon band
    g.fillStyle = '#c8202a'; g.fillRect(-15, -12.4, 11.6, .6); g.fillRect(3.4, -12.4, 11.6, .6);
    g.strokeStyle = '#1f7a36'; g.lineWidth = .5; g.beginPath(); g.moveTo(-3, 0); g.lineTo(-3, -8); g.arc(0, -8, 3, Math.PI, 0); g.lineTo(3, 0); g.stroke();
    g.fillStyle = '#ffd23a'; star5(g, 0, -12.6, 1.3);
    g.fillStyle = '#3a3a48'; g.fillRect(3, -1.3, 12, .6);                                                 // the conveyor and its presents
    for (let i = 0; i < 4; i++) {
      const gx = 3.3 + ((t / 2400 + i / 4) % 1) * 10.4;
      g.fillStyle = BULBS[i]; g.fillRect(gx, -2.7, 1.4, 1.4); g.fillStyle = '#fff'; g.fillRect(gx + .55, -2.7, .3, 1.4);
    }
    for (const [sx, sh] of stacks) for (let k = 0; k < 3; k++) {                                          // smoke curling away
      const p = (t / 3200 + k / 3 + sx * .13) % 1;
      g.fillStyle = `rgba(215,222,240,${.35 * (1 - p)})`; g.beginPath(); g.arc(sx + 1.2 + p * 3, -sh - 1 - p * 6, .8 + p * 1.6, 0, TAU); g.fill();
    }
  } });

  // A gingerbread cottage: brown walls, a gable roof edged in white icing, candy buttons, a gumdrop on top, lit windows.
  registerLandmark('ginger', { w: 12, h: 15, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#7a4520'); g.fillRect(-5, -8, 10, 8);
    g.fillStyle = c('#5a3014'); g.beginPath(); g.moveTo(-6.2, -7.6); g.lineTo(0, -14); g.lineTo(6.2, -7.6); g.fill();
    for (const x of [-3.8, 2]) { g.fillStyle = L.win(L.lit(6)); g.fillRect(x, -6.3, 1.8, 1.8); }
    g.fillStyle = L.win(Math.max(.3, L.lit(2))); g.fillRect(-.9, -3.6, 1.8, 3.6);
    if (L.side) return;
    g.strokeStyle = '#ffffff'; g.lineWidth = .7; g.beginPath(); g.moveTo(-6.2, -7.6); g.lineTo(0, -14); g.lineTo(6.2, -7.6); g.stroke();
    g.lineWidth = .35; for (const x of [-3.8, 2]) g.strokeRect(x, -6.3, 1.8, 1.8);
    for (let i = 0; i < 5; i++) { g.fillStyle = BULBS[i % 4]; g.beginPath(); g.arc(-3.6 + i * 1.8, -8.6 - (i % 2) * 1.6, .45, 0, TAU); g.fill(); }
    g.fillStyle = '#ffffff'; for (let x = -4.6; x <= 4.6; x += 1.15) { g.beginPath(); g.arc(x, -8, .5, 0, Math.PI); g.fill(); }
    g.fillStyle = '#e8202a'; g.beginPath(); g.arc(0, -14.2, .8, 0, TAU); g.fill();
    for (const x of [-2.2, 1.6]) for (let y = -3; y < 0; y += 1) { g.fillStyle = y % 2 ? '#e8202a' : '#ffffff'; g.fillRect(x, y, .6, 1); }
  } });

  // Shared bits for the cottages below: snow on a gable, chimney smoke, a garland with berries, a row of icicles.
  const SNOW = '#eef3fb';
  const gableSnow = (g, l, r, base, top, k = .28) => {   // a snow cap down both slopes of a gable from x l to r
    const m = (l + r) / 2, dx = (r - l) / 2 * k, dy = (base - top) * k;
    g.fillStyle = SNOW; g.beginPath(); g.moveTo(l - .3, base + .2); g.lineTo(m, top - .4); g.lineTo(r + .3, base + .2);
    g.lineTo(r - dx * .4, base - dy * .2); g.lineTo(m + dx * .2, top + dy * .9); g.lineTo(m - dx * .5, top + dy * .7); g.lineTo(l + dx * .4, base - dy * .25); g.fill();
  };
  const smoke = (g, x, y, seed) => { const t = performance.now(); for (let k = 0; k < 3; k++) {
    const p = (t / 3300 + k / 3 + seed) % 1; g.fillStyle = `rgba(215,222,240,${.32 * (1 - p)})`; g.beginPath(); g.arc(x + p * 2.6, y - p * 5.5, .6 + p * 1.4, 0, TAU); g.fill(); } };
  const garland = (g, l, r, y, sag) => {
    g.strokeStyle = '#1f6a32'; g.lineWidth = .7; g.beginPath(); g.moveTo(l, y); g.quadraticCurveTo((l + r) / 2, y + sag * 2, r, y); g.stroke();
    for (let i = 1; i < 6; i++) { const f = i / 6, x = l + (r - l) * f, yy = y + sag * 4 * f * (1 - f); g.fillStyle = i % 2 ? '#e02a2a' : '#ffd23a'; g.beginPath(); g.arc(x, yy, .28, 0, TAU); g.fill(); }
  };
  const icicles = (g, l, r, y) => { g.fillStyle = 'rgba(225,238,255,.85)'; for (let x = l + .3, i = 0; x < r; x += .7, i++) g.fillRect(x, y, .2, .4 + (i * 7 % 5) * .18); };
  const pane = (g, L, x, y, w, h, lit) => {             // a lit window with a cross of glazing bars
    g.fillStyle = L.win(lit); g.fillRect(x, y, w, h);
    if (L.side) return;
    g.fillStyle = 'rgba(30,18,12,.85)'; g.fillRect(x + w / 2 - .1, y, .2, h); g.fillRect(x, y + h / 2 - .1, w, .2);
  };

  // The coaching inn: a stone ground floor, a half-timbered upper floor, a steep roof with two dormers, a hanging sign,
  // a lantern by the door and a garland over it.
  registerLandmark('inn', { w: 20, h: 25, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#3a3440'); g.fillRect(-9, -9, 18, 9);                                 // stone ground floor
    g.fillStyle = c('#4a3b2c'); g.fillRect(-9.6, -16, 19.2, 7);                            // the upper floor, jettied out
    g.fillStyle = c('#2a1e26'); g.beginPath(); g.moveTo(-10.6, -15.6); g.lineTo(0, -24.5); g.lineTo(10.6, -15.6); g.fill();
    g.fillStyle = c('#3a3038'); g.fillRect(6.2, -24, 1.8, 6);                               // the chimney
    for (const dx of [-4.6, 4.6]) {                                                         // dormers
      g.fillStyle = c('#2e2430'); g.fillRect(dx - 1.5, -19.6, 3, 2.6);
      g.beginPath(); g.moveTo(dx - 1.9, -19.4); g.lineTo(dx, -21.4); g.lineTo(dx + 1.9, -19.4); g.fill();
      pane(g, L, dx - .9, -19, 1.8, 1.8, L.lit(19));
    }
    for (const x of [-8, -4.8, 2.6, 5.8]) pane(g, L, x, -7.2, 2.2, 2.8, L.lit(6));          // ground floor windows
    for (const x of [-8.2, -4.6, 3, 6.6]) pane(g, L, x, -14.6, 1.8, 2.4, L.lit(13));       // upper windows
    g.fillStyle = L.win(Math.max(.4, L.lit(2))); g.beginPath(); g.moveTo(-1.3, 0); g.lineTo(-1.3, -3.6); g.arc(0, -3.6, 1.3, Math.PI, 0); g.lineTo(1.3, 0); g.fill();
    if (L.side) return;
    g.strokeStyle = '#21140c'; g.lineWidth = .45; g.beginPath();                           // the timber frame
    for (const x of [-9.4, -6.6, -3.4, 0, 3.4, 6.6, 9.4]) { g.moveTo(x, -16); g.lineTo(x, -9); }
    for (const [a, b] of [[-9.4, -6.6], [-3.4, 0], [3.4, 6.6]]) { g.moveTo(a, -9); g.lineTo(b, -16); g.moveTo(b + 3.2, -9); g.lineTo(a + 3.2, -16); }
    g.moveTo(-9.6, -9.2); g.lineTo(9.6, -9.2); g.moveTo(-9.6, -15.8); g.lineTo(9.6, -15.8); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = -8.4; y < 0; y += 1.4) g.fillRect(-9, y, 18, .15);   // stone courses
    gableSnow(g, -10.6, 10.6, -15.6, -24.5, .32);
    for (const dx of [-4.6, 4.6]) gableSnow(g, dx - 1.9, dx + 1.9, -19.4, -21.4, .5);
    g.fillStyle = SNOW; g.fillRect(6, -24.4, 2.2, .6); smoke(g, 7.1, -25, .2);
    icicles(g, -9.6, 9.6, -9);
    g.strokeStyle = '#1a1a1a'; g.lineWidth = .3; g.beginPath(); g.moveTo(9.6, -11.5); g.lineTo(12, -11.5); g.stroke();   // the sign on its bracket
    g.fillStyle = '#5a3a1c'; g.fillRect(10.4, -11.3, 2.2, 1.8); g.strokeStyle = '#c8a030'; g.strokeRect(10.5, -11.2, 2, 1.6);
    g.fillStyle = '#ffd23a'; star5(g, 11.5, -10.4, .55);
    garland(g, -2, 2, -5.6, .5);
    const fl = .8 + .2 * Math.sin(performance.now() / 180);                                 // the lantern, flickering
    glow(g, '255,190,100', 2.2, -3.4, 2.4, .5 * fl); g.fillStyle = '#ffd88a'; g.fillRect(1.9, -3.8, .6, .8);
  } });

  // The bakery: a brick shop with a striped awning over a glowing display window of cakes, a wreath on the door and a
  // round window up in the gable.
  registerLandmark('bakery', { w: 13, h: 16, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#5a2624'); g.fillRect(-6, -10, 12, 10);
    g.fillStyle = c('#2a1e26'); g.beginPath(); g.moveTo(-6.8, -9.8); g.lineTo(0, -15.6); g.lineTo(6.8, -9.8); g.fill();
    g.fillStyle = c('#3a3038'); g.fillRect(-4.6, -15.4, 1.6, 4);
    g.fillStyle = L.win(Math.max(.45, L.lit(3))); g.fillRect(-5, -5.2, 6.2, 4);            // the display window
    g.fillStyle = L.win(Math.max(.35, L.lit(2))); g.fillRect(2.4, -4.8, 2.2, 4.8);          // the door
    g.fillStyle = L.win(L.lit(12)); g.beginPath(); g.arc(0, -12, 1.2, 0, TAU); g.fill();
    for (const x of [-4.4, 1.6]) pane(g, L, x, -9, 2, 2.2, L.lit(8));
    if (L.side) return;
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = -9.6, i = 0; y < 0; y += .8, i++) g.fillRect(-6, y, 12, .1);   // brick courses
    g.fillStyle = '#7a4a2a'; for (const [x, r] of [[-4, .7], [-2.4, .9], [-.6, .6]]) { g.beginPath(); g.arc(x, -1.2, r, Math.PI, 0); g.fill(); }   // cakes
    g.fillStyle = '#f4e4d0'; for (const x of [-4, -2.4, -.6]) g.fillRect(x - .5, -1.9 - (x === -2.4 ? .2 : 0), 1, .25);   // their icing
    g.fillStyle = '#e8202a'; g.beginPath(); g.arc(-2.4, -2.3, .2, 0, TAU); g.fill();
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#f4f4f4' : '#d42a2a'; g.fillRect(-5.6 + i, -6.6, 1, 1.4);   // the awning, scalloped
      g.beginPath(); g.arc(-5.1 + i, -5.2, .5, 0, Math.PI); g.fill(); }
    g.fillStyle = SNOW; g.fillRect(-5.7, -6.9, 7.2, .35);
    g.strokeStyle = '#1f6a32'; g.lineWidth = .45; g.beginPath(); g.arc(3.5, -3.6, .6, 0, TAU); g.stroke();   // a wreath on the door
    g.fillStyle = '#e02a2a'; g.fillRect(3.3, -3.1, .4, .3);
    gableSnow(g, -6.8, 6.8, -9.8, -15.6, .3); g.fillStyle = SNOW; g.fillRect(-4.8, -15.8, 2, .5); smoke(g, -3.8, -16.2, .6);
    icicles(g, -6, 6, -10);
  } });

  // A tall, narrow townhouse with a stepped gable, a candle in every window, a star up top and window boxes of berries.
  registerLandmark('townhouse', { w: 9, h: 28, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#22303a'); g.fillRect(-4, -21, 8, 21);
    for (const [hw, y0, y1] of [[4, -21, -23], [2.8, -23, -25], [1.6, -25, -27.4]]) g.fillRect(-hw, y1, hw * 2, y0 - y1);   // the stepped gable
    for (let f = 0; f < 4; f++) for (const x of [-3, 1]) {
      const y = -4.4 - f * 4.4; pane(g, L, x, y - 2.4, 2, 2.6, L.lit(-y));
      if (!L.side && f) { g.fillStyle = '#f4f0e0'; g.fillRect(x + .85, y - 1.2, .3, 1); g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(x + 1, y - 1.45, .2, 0, TAU); g.fill();   // a candle
        g.fillStyle = '#3a2a1a'; g.fillRect(x - .2, y + .25, 2.4, .5); g.fillStyle = '#e02a2a'; for (let k = 0; k < 4; k++) g.fillRect(x + .1 + k * .55, y, .3, .3); }
    }
    g.fillStyle = L.win(Math.max(.35, L.lit(2))); g.fillRect(-1, -3.4, 2, 3.4);
    g.fillStyle = L.win(L.lit(24)); g.beginPath(); g.arc(0, -24.6, .7, 0, TAU); g.fill();
    if (L.side) return;
    g.fillStyle = '#ffd23a'; star5(g, 0, -24.6, .55);
    g.fillStyle = SNOW; for (const [hw, y] of [[4, -23], [2.8, -25], [1.6, -27.4]]) g.fillRect(-hw - .2, y - .3, hw * 2 + .4, .55);
    g.fillRect(-4.2, -21.3, 8.4, .5);
    g.fillStyle = '#4a4450'; g.fillRect(-1.6, -.4, 3.2, .4);                                // the front step
    garland(g, -1.2, 1.2, -3.6, .3);
  } });

  // The clock tower: a stone base, a square tower with a glowing clock that keeps the real time, an open belfry with
  // a gold bell, a steep snowy roof and a gold ball on top.
  registerLandmark('clocktower', { w: 9, h: 37, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#3a3644'); g.fillRect(-4, -6, 8, 6);
    g.fillStyle = c('#2e2a36'); g.fillRect(-3, -30, 6, 24);
    g.fillStyle = c('#24202c'); g.beginPath(); g.moveTo(-3.6, -29.6); g.lineTo(0, -36); g.lineTo(3.6, -29.6); g.fill();
    g.fillStyle = L.win(Math.max(.3, L.lit(28))); g.beginPath(); g.moveTo(-1.4, -26); g.lineTo(-1.4, -28); g.arc(0, -28, 1.4, Math.PI, 0); g.lineTo(1.4, -26); g.fill();   // the belfry
    for (const y of [-11, -15]) pane(g, L, -.7, y, 1.4, 2, L.lit(-y));
    g.fillStyle = L.win(Math.max(.35, L.lit(2))); g.beginPath(); g.moveTo(-1.1, 0); g.lineTo(-1.1, -3); g.arc(0, -3, 1.1, Math.PI, 0); g.lineTo(1.1, 0); g.fill();
    g.fillStyle = L.side ? L.body : '#f4ecd0'; g.beginPath(); g.arc(0, -21, 2.2, 0, TAU); g.fill();   // the clock face
    if (L.side) return;
    glow(g, '255,236,190', 0, -21, 4, .35);
    g.strokeStyle = '#3a2a1a'; g.lineWidth = .2; g.beginPath(); g.arc(0, -21, 2.2, 0, TAU); g.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#3a2a1a'; g.fillRect(Math.cos(a) * 1.8 - .1, -21 + Math.sin(a) * 1.8 - .1, .2, .2); }
    const d = new Date(), hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * TAU, mn = d.getMinutes() / 60 * TAU;
    g.lineWidth = .3; g.lineCap = 'round'; g.beginPath();
    g.moveTo(0, -21); g.lineTo(Math.sin(hr) * 1.1, -21 - Math.cos(hr) * 1.1); g.moveTo(0, -21); g.lineTo(Math.sin(mn) * 1.7, -21 - Math.cos(mn) * 1.7); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = '#e8c040'; g.beginPath(); g.arc(0, -27.6, .8, Math.PI, 0); g.lineTo(.9, -26.6); g.lineTo(-.9, -26.6); g.fill();   // the bell
    g.beginPath(); g.arc(0, -36.4, .45, 0, TAU); g.fill();
    gableSnow(g, -3.6, 3.6, -29.6, -36, .35); g.fillStyle = SNOW; g.fillRect(-4.2, -6.3, 8.4, .5); g.fillRect(-3.2, -30.2, 6.4, .45);
    g.fillStyle = 'rgba(0,0,0,.22)'; for (let y = -5.2; y < 0; y += 1.2) g.fillRect(-4, y, 8, .15);
    garland(g, -4, 4, -6, .8);
  } });

  // A log cabin: round logs with their cut ends showing, a deep load of snow on the roof, a stone chimney, a woodpile.
  registerLandmark('cabin', { w: 13, h: 12, draw(g, L) {
    const c = col => L.side ? L.body : col;
    for (let i = 0; i < 6; i++) { g.fillStyle = c(i % 2 ? '#4a2c18' : '#3c2212'); g.fillRect(-5.4, -7.2 + i * 1.2, 10.8, 1.2); }
    g.fillStyle = c('#2a1a14'); g.beginPath(); g.moveTo(-6.6, -6.9); g.lineTo(0, -11.6); g.lineTo(6.6, -6.9); g.fill();
    g.fillStyle = c('#545058'); g.fillRect(3.4, -11.6, 1.8, 4.6);
    pane(g, L, -4, -5.6, 2.4, 2.4, L.lit(4));
    g.fillStyle = L.win(Math.max(.35, L.lit(2))); g.fillRect(1, -4.4, 2, 4.4);
    if (L.side) return;
    g.fillStyle = '#6a4428'; for (let i = 0; i < 6; i++) for (const x of [-5.4, 5.4]) { g.beginPath(); g.arc(x, -6.6 + i * 1.2, .55, 0, TAU); g.fill(); }   // log ends
    g.fillStyle = '#a07040'; for (let i = 0; i < 6; i++) for (const x of [-5.4, 5.4]) { g.beginPath(); g.arc(x, -6.6 + i * 1.2, .22, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.3)'; for (let y = -10.6; y < -7; y += 1) g.fillRect(3.4, y, 1.8, .15);
    g.fillStyle = '#a3121c'; g.fillRect(-4, -5.6, .5, 2.4); g.fillRect(-2.1, -5.6, .5, 2.4);   // red curtains
    gableSnow(g, -6.6, 6.6, -6.9, -11.6, .55); g.fillStyle = SNOW; g.fillRect(3.2, -11.9, 2.2, .6); smoke(g, 4.3, -12.4, .9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) { g.fillStyle = '#5a3a20'; g.beginPath(); g.arc(-6.3 + j * .9 + i * .45, -.45 - i * .8, .42, 0, TAU); g.fill(); }   // the woodpile
    icicles(g, -5.4, 5.4, -7.2);
  } });

  // The great star: four long pointed rays (the lower one longest), faint diagonal glints, a soft halo that gently gleams.
  function star(g, E) {
    const R = Math.min(E.W, E.GY) * .075, x = E.left + Math.min(E.W, E.GY) * .2, y = E.GY * .2;
    const gl = .85 + .15 * Math.sin(E.t / 1400) + .06 * E.bassFlash, s = R * (1 + .03 * Math.sin(E.t / 900));
    glow(g, '255,236,170', x, y, R * 3.4 * gl, .2 * gl);
    glow(g, '255,250,220', x, y, R * 1.3, .38 * gl);
    g.save(); g.translate(x, y);
    const fill = g.createRadialGradient(0, 0, 0, 0, 0, s * 1.7);                          // bright at the heart, fading to the tips
    fill.addColorStop(0, 'rgba(255,252,235,.85)'); fill.addColorStop(.35, 'rgba(255,244,210,.45)'); fill.addColorStop(1, 'rgba(255,236,190,.08)');
    g.fillStyle = fill;
    // one path through the four tips (up, right, down the longest, left), each side curving in past the centre: sharp points
    const tips = [[0, -s * 1.1], [s * .85, 0], [0, s * 1.7], [-s * .85, 0]], k = s * .09;
    g.beginPath(); g.moveTo(...tips[0]);
    for (let i = 1; i <= 4; i++) { const [a, b] = tips[i - 1], [c, d] = tips[i % 4]; g.quadraticCurveTo(Math.sign(a + c) * k, Math.sign(b + d) * k, c, d); }
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(0, 0, s * .08, 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,245,210,${.2 * gl})`; g.lineWidth = Math.max(1, s * .025); g.beginPath();   // diagonal glints
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { g.moveTo(dx * s * .08, dy * s * .08); g.lineTo(dx * s * .45 * gl, dy * s * .45 * gl); }
    g.stroke(); g.restore();
  }

  // The great tree in the town square (bottom right, across from the star). Six layered tiers of drooping, needled
  // boughs with snow on the tips, gold tinsel, baubles, a skirt and presents underneath: drawn once per size. On top of that,
  // every frame: strings of bulbs that each light up with their own part of the music, and a gold star that flares on the beat.
  const BULB_RGB = ['255,59,59', '59,255,106', '255,210,58', '59,139,255'], ORN = ['#d8202a', '#e8c040', '#c8d0e0', '#2a6ad8', '#b03ad8'];
  const tierOf = (i, h, w) => { const a = h * (.06 + i * .125), L = h * (.19 + i * .012); return { a, L, b: a + L, hw: w * .5 * (.3 + .7 * (i + 1) / 6) }; };
  function treeBody(h, w) {                               // top of the tree at y 0, its trunk at x = width / 2
    const d = dpr(), cw = w * 1.4, x = cw / 2;
    return mk(cw * d, h * 1.06 * d, g => {
      g.scale(d, d);
      g.fillStyle = '#a3121c'; g.beginPath(); g.ellipse(x, h, w * .44, h * .03, 0, 0, TAU); g.fill();   // the skirt
      g.strokeStyle = '#f4f4f4'; g.lineWidth = Math.max(1, h * .006); g.stroke();
      g.fillStyle = '#4a2e18'; g.fillRect(x - w * .06, h * .88, w * .12, h * .12);                       // the trunk
      const lw = Math.max(1, h * .004);
      for (let i = 5; i >= 0; i--) {                       // bottom tier first, so each one above droops over the next
        const { a, L, b, hw } = tierOf(i, h, w), n = 5 + i * 2, dr = L * .2, tx = j => x - hw + 2 * hw * j / n;
        const shape = dy => { g.beginPath(); g.moveTo(x, a + dy); for (let j = n; j >= 0; j--) { g.lineTo(tx(j), b + dy); if (j) g.lineTo(tx(j) - hw / n, b - dr + dy); } g.closePath(); };
        if (i < 5) { g.fillStyle = 'rgba(0,10,4,.45)'; shape(dr * 1.3); g.fill(); }   // its shadow on the tier below
        g.fillStyle = '#0b3d20'; shape(0); g.fill();
        g.fillStyle = '#145a2e'; g.beginPath(); g.moveTo(x, a); g.lineTo(x + hw, b); g.lineTo(x + hw * .12, b - dr); g.fill();   // the lit side
        g.strokeStyle = '#1e7040'; g.lineWidth = lw; g.beginPath();                                       // needles fanning to the tips
        for (let j = 0; j <= n; j++) { g.moveTo(x + (tx(j) - x) * .4, a + L * .45); g.lineTo(tx(j), b); }
        g.stroke();
        g.fillStyle = '#eef3fb';                           // snow lying on some of the tips, in clumps of different sizes
        const sl = Math.atan2(dr, hw / n), half = Math.hypot(dr, hw / n) / 2;   // lying along each bough's upper edge
        for (let j = 1; j <= n; j++) if (hash(i, j, 74) < .65) { g.beginPath(); g.ellipse(tx(j) - hw / n / 2, b - dr / 2 - h * .004, half * (.6 + .35 * hash(i, j, 75)), Math.max(1, h * .0045), sl, 0, TAU); g.fill(); }
        if (i) {                                           // a gold tinsel swag across the tier
          const y0 = a + L * .58, y1 = a + L * .72, l = x - hw * .58 * .95, r = x + hw * .72 * .95;
          for (const [c, k] of [['#c8a030', 2.2], ['#fff0a0', .8]]) { g.strokeStyle = c; g.lineWidth = lw * k; g.beginPath(); g.moveTo(l, y0); g.quadraticCurveTo(x, a + L * (i % 2 ? .98 : .88), r, y1); g.stroke(); }
        }
        for (let j = 0; j < 1 + i; j++) {                  // baubles, each with a cap and a shine
          const f = .52 + .38 * hash(i, j, 72), y = a + L * f, ox = x + (hash(i, j, 71) * 2 - 1) * hw * f * .78, r = Math.max(1.5, h * .016);
          g.fillStyle = ORN[Math.floor(hash(i, j, 73) * ORN.length)]; g.beginPath(); g.arc(ox, y, r, 0, TAU); g.fill();
          g.fillStyle = '#e8c040'; g.fillRect(ox - r * .3, y - r * 1.3, r * .6, r * .4);
          g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(ox - r * .35, y - r * .35, r * .3, 0, TAU); g.fill();
        }
      }
      for (const [dx, bw, bh, c, rb] of [[-.4, .17, .13, '#c8202a', '#ffd23a'], [-.24, .13, .09, '#2a52c8', '#ffffff'], [.25, .15, .15, '#1f8a3a', '#e8202a'],
        [.41, .12, .08, '#e8c040', '#c8202a'], [-.06, .11, .07, '#b03ad8', '#ffd23a'], [.1, .09, .06, '#ffffff', '#2a52c8']]) {   // presents
        const W2 = w * bw, H2 = w * bh, px = x + dx * w - W2 / 2, py = h * 1.01 - H2;
        g.fillStyle = c; g.fillRect(px, py, W2, H2);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px + W2 * .7, py, W2 * .3, H2);
        g.fillStyle = rb; g.fillRect(px + W2 * .44, py, W2 * .12, H2); g.fillRect(px, py + H2 * .4, W2, H2 * .14);
        g.beginPath(); g.ellipse(px + W2 * .38, py - H2 * .08, W2 * .12, H2 * .1, -.5, 0, TAU); g.ellipse(px + W2 * .62, py - H2 * .08, W2 * .12, H2 * .1, .5, 0, TAU); g.fill();
      }
    });
  }
  function tree(g, E) {
    if (st.treeX === null) return;
    const { W, GY, H, t } = E, sp = E.spectrum, d = dpr(), base = GY + (H - GY) * ROAD * .24;
    const h = Math.round(Math.min(GY * .62, W * .5)), w = h * .52, x = E.toScreen(st.treeX), top = base - h;   // stands on its spot in the town
    if (x + w < E.left || x - w > E.right) return;       // off screen, or outside the village's stretch in the tour
    if (st.tk !== h + '|' + d) { st.tk = h + '|' + d; st.tree = treeBody(h, w); }
    g.drawImage(st.tree, x - st.tree.width / d / 2, top, st.tree.width / d, st.tree.height / d);
    let k = 0;
    for (let i = 0; i < 6; i++) {                         // a sagging string of bulbs on each tier
      const { a, L, hw } = tierOf(i, h, w), m = 4 + i * 2;
      for (let j = 0; j < m; j++, k++) {
        const f = (j + .5) / m, yf = .62 + .2 * Math.sin(Math.PI * f), y = top + a + L * yf, bx = x + (2 * f - 1) * hw * yf * .85;
        const c = (k + Math.floor(t / 700)) % 4, lv = Math.min(1, (sp[(k * 5) % sp.length] || 0) * 1.3), br = Math.max(1.5, h * .01);
        glow(g, BULB_RGB[c], bx, y, br * 4, .15 + .5 * lv);
        withAlpha(g, .45 + .55 * lv, () => { g.fillStyle = BULBS[c]; g.beginPath(); g.arc(bx, y, br, 0, TAU); g.fill(); });
      }
    }
    const R = h * .065 * (1 + .12 * E.bassFlash), sy = top + h * .03;   // the star on top, with slowly turning rays
    glow(g, '255,220,120', x, sy, R * 3.2, .45 + .4 * E.bassFlash);
    g.strokeStyle = 'rgba(255,230,150,.5)'; g.lineWidth = Math.max(1, h * .003); g.beginPath();
    for (let i = 0; i < 8; i++) { const an = t / 4000 + i * Math.PI / 4, l = R * (i % 2 ? 1.6 : 2.3); g.moveTo(x + Math.cos(an) * R * .6, sy + Math.sin(an) * R * .6); g.lineTo(x + Math.cos(an) * l, sy + Math.sin(an) * l); }
    g.stroke();
    g.fillStyle = '#ffd23a'; star5(g, x, sy, R); g.fillStyle = '#fff6c8'; star5(g, x, sy, R * .45);
  }
  // The aurora's strength now: it fades in and out over 2.5 s; 0 when it's away.
  const auA = t => st.au ? Math.max(0, Math.min(1, (t - st.au.t0) / 2500, (st.au.t0 + st.au.dur - t) / 2500)) : 0;
  // Pale angels gliding about the sky while the aurora is up, each on its own slow looping path.
  function angels(g, E, a) {
    const { GY, t } = E, sw = E.to - E.from, px = pxOf(E, .65);
    for (let i = 0; i < 4; i++) {
      const p = t / 5200 + i * 1.7, x = E.from + sw * (.3 + .16 * i) + Math.sin(p) * sw * .1, y = GY * (.16 + .09 * (i % 2)) + Math.sin(t / 3100 + i * 2.3) * GY * .07;
      glow(g, '220,235,255', x, y, px * 9, .25 * a);
      withAlpha(g, .55 * a, () => drawPix(g, ANGEL[Math.floor(t / 240 + i) % 2], px, x - spW(ANGEL[0], px) / 2, y - spH(ANGEL[0], px) / 2, Math.cos(p) < 0));
    }
  }

  // Behind the village, two screens wide and seamless: far snow-capped mountains, then a dark ridge of snow-dusted pines
  // with a few cabin windows lit. Drawn once per size.
  function hills(W, GY) {
    const d = dpr(), w = W * 2;
    return mk(w * d, GY * d, g => {
      g.scale(d, d);
      // Two ranges of mountains, each peak drawn again one tile over so the seam doesn't show: a tall, hazy far range, then a
      // nearer, darker one. Each has a moonlit face and a shaded one, a ragged snowcap with streaks down its gullies, and ridges.
      const foot = GY * .86;
      for (const [n, lo, hi, seed, lit, dark, snowA] of [[9, .34, .24, 81, '#405578', '#1e2a46', .62], [11, .22, .18, 84, '#33466e', '#151f38', .78]]) for (let i = 0; i < n; i++) {
        const ph = GY * (lo + hi * hash(i, 1, seed)), hw = ph * (.85 + .6 * hash(i, 2, seed)), top = foot - ph, sk = (hash(i, 4, seed) - .5) * hw * .3;   // a peak a little off-centre
        for (const o of [-w, 0, w]) {
          const px = hash(i, 3, seed) * w + o, pk = px + sk;
          if (px + hw < 0 || px - hw > w) continue;
          g.fillStyle = lin(g, 0, top, 0, foot, [[0, dark], [1, '#0e1628']]);
          g.beginPath(); g.moveTo(px - hw, foot); g.lineTo(pk, top); g.lineTo(px + hw, foot); g.fill();
          g.fillStyle = lin(g, 0, top, 0, foot, [[0, lit], [1, dark]]);   // the moonlit face, cut by a jagged ridge line
          g.beginPath(); g.moveTo(pk, top);
          for (let k = 1; k <= 6; k++) { const f = k / 6; g.lineTo(pk + (px + hw * .25 - pk) * f + (hash(i, k, seed + 1) - .5) * hw * .08, top + ph * f); }
          g.lineTo(px + hw, foot); g.fill();
          const c = .24 + .08 * hash(i, 5, seed), sx = hw * c, sy = ph * c;
          g.fillStyle = `rgba(215,228,250,${snowA})`; g.beginPath(); g.moveTo(pk, top);   // the snowcap, with a ragged edge
          g.lineTo(pk + sx, top + sy * 1.1); g.lineTo(pk + sx * .6, top + sy * .85); g.lineTo(pk + sx * .35, top + sy * 1.2); g.lineTo(pk + sx * .05, top + sy * .9);
          g.lineTo(pk - sx * .3, top + sy * 1.15); g.lineTo(pk - sx * .55, top + sy * .8); g.lineTo(pk - sx, top + sy); g.fill();
          g.fillStyle = `rgba(180,198,230,${snowA * .55})`; g.beginPath(); g.moveTo(pk, top); g.lineTo(pk - sx, top + sy); g.lineTo(pk - sx * .55, top + sy * .8); g.lineTo(pk - sx * .3, top + sy * 1.15); g.lineTo(pk, top + sy * .6); g.fill();   // its shaded side
          g.strokeStyle = `rgba(215,228,250,${snowA * .45})`; g.lineWidth = Math.max(1, GY * .002);   // snow streaks down the gullies
          g.beginPath();
          for (let k = 0; k < 5; k++) { const f = (k + .5) / 5 * 2 - 1, gx = pk + f * sx * .9, gy = top + sy * (1 - Math.abs(f) * .2); g.moveTo(gx, gy); g.lineTo(gx + f * hw * .12, gy + ph * (.12 + .14 * hash(i, k + 7, seed))); }
          g.stroke();
          g.strokeStyle = 'rgba(8,14,28,.35)'; g.beginPath();   // rocky ribs on the lower slopes
          for (let k = 0; k < 4; k++) { const f = (hash(i, k + 12, seed) * 2 - 1) * .7, gx = pk + f * hw * .5, gy = top + ph * .45; g.moveTo(gx, gy); g.lineTo(gx + f * hw * .25, foot); }
          g.stroke();
        }
      }
      const ridge = x => GY * (.86 + .035 * Math.sin(x / w * TAU * 2) + .02 * Math.sin(x / w * TAU * 5 + 1));
      g.fillStyle = '#0a1426'; g.beginPath(); g.moveTo(0, GY);
      for (let x = 0; x <= w; x += w / 120) g.lineTo(x, ridge(x));
      g.lineTo(w, GY); g.fill();
      const s = GY * .045;                                 // the pines along the ridge
      for (let i = 0, x = 0; x < w; i++, x += s * (.45 + .5 * hash(i, 4, 82))) {
        const th = s * (.7 + .8 * hash(i, 5, 82)), y = ridge(x) + s * .3, tw = th * .42;
        g.fillStyle = '#081020'; g.beginPath(); g.moveTo(x, y - th); g.lineTo(x + tw, y); g.lineTo(x - tw, y); g.fill();
        g.fillStyle = 'rgba(220,232,250,.55)'; g.beginPath(); g.moveTo(x, y - th); g.lineTo(x + tw * .35, y - th * .62); g.lineTo(x - tw * .35, y - th * .62); g.fill();
      }
      for (let i = 0; i < 9; i++) {                        // a few cabins with warm windows
        const x = hash(i, 6, 83) * w, y = ridge(x) + s * .25;
        g.fillStyle = '#060c18'; g.fillRect(x - s * .3, y - s * .35, s * .6, s * .35);
        g.fillStyle = 'rgba(255,190,110,.85)'; g.fillRect(x - s * .15, y - s * .25, s * .12, s * .12); g.fillRect(x + s * .05, y - s * .25, s * .12, s * .12);
      }
    });
  }

  // Once a frame: the sleigh and the caravan move on, start or wait.
  function step(E) {
    if (st.last === E.t) return; st.last = E.t;
    const { W, t, dt, unit: u } = E;
    if (!st.santa && t >= st.nextSanta) {                 // one sleigh at a time
      if (!st.nextSanta) st.nextSanta = t + 6000 + 6000 * Math.random();   // the first flight comes soon after the village appears
      else { const dir = Math.random() < .5 ? 1 : -1; st.santa = { dir, x: dir > 0 ? -W * .1 : W * 1.1, y: E.GY * (.12 + .14 * Math.random()), ph: Math.random() * 7, v: W / (14 + 6 * Math.random()) }; }
    }
    if (st.santa) {
      const s = st.santa; s.x += s.dir * s.v * dt;
      if (s.x < -W * .6 || s.x > W * 1.6) { st.santa = null; st.nextSanta = t + 30000 + 60000 * Math.random(); }
    }
    if (!st.au && t >= st.nextAu) {
      if (!st.nextAu) st.nextAu = t + 15000 + 10000 * Math.random();
      else st.au = { t0: t, dur: 10000 + 10000 * Math.random() };
    }
    if (st.au && t > st.au.t0 + st.au.dur) { st.au = null; st.nextAu = t + 60000 + 30000 * Math.random(); }
    // Everyone on the ground lives in town coordinates (screen x + travel), so panning, scrolling and the tour carry them
    // along with the houses. They walk on from just past an edge and are let go past the other one (or after a long while
    // out of sight, if a pan left them there).
    const tv = E.travel, sx = wx => wx - tv, gone = (o, m) => sx(o.wx) < -m || sx(o.wx) > W + m || t - o.born > 150000;
    if (!st.men && t >= st.nextMen) st.men = { wx: tv + W + u * 4, born: t };
    if (st.men) {
      st.men.wx -= u * 2.6 * dt;                         // a slow plod along the back path
      if (sx(st.men.wx) < -st.gapW * 3 - u * 10 || t - st.men.born > 150000) { st.men = null; st.nextMen = t + 10000 + 15000 * Math.random(); }
    }
    // Horse-drawn carriages along the front of the road, now and then, two at most; each direction keeps its own lane.
    if (!st.nextCar) st.nextCar = t + 2500 + 3000 * Math.random();
    if (t >= st.nextCar && st.cars.length < 2) {
      const dir = st.cars.length ? -st.cars[0].dir : Math.random() < .5 ? 1 : -1, m = u * 16;
      st.cars.push({ dir, wx: tv + (dir > 0 ? -m : W + m), v: u * (9 + 3 * Math.random()), born: t, ph: Math.random() * 9,
        vic: Math.random() < .55, coach: Math.floor(Math.random() * 3), horse: Math.floor(Math.random() * HORSES.length), pair: Math.random() < .5 });
      st.nextCar = t + 7000 + 15000 * Math.random();
    }
    for (const c of st.cars) c.wx += c.dir * c.v * dt;
    st.cars = st.cars.filter(c => !gone(c, u * 18));
    // Skaters on the river: two to five at a time (a pair counts as two), drifting lazily, sometimes turning back.
    if (t >= st.skRoll) { st.skN = 2 + Math.floor(Math.random() * 4); st.skRoll = t + 20000 + 15000 * Math.random(); }
    const laneY = () => {                                // the lane of three tries that's furthest from everyone already out
      let best = .5, far = -1;
      for (let k = 0; k < 3; k++) { const y = .3 + .45 * Math.random(), d = Math.min(1, ...st.skaters.map(s => Math.abs(s.y0 - y))); if (d > far) { far = d; best = y; } }
      return best;
    };
    st.skaters = st.skaters.filter(s => !gone(s, u * 8));   // let the ones who've left go first, so the count is right
    for (let onIce; (onIce = st.skaters.reduce((n, s) => n + (s.pair ? 2 : 1), 0)) < st.skN && (t >= st.nextSkater || onIce < 2);) {   // never fewer than two out there
      const dir = Math.random() < .5 ? 1 : -1, pair = onIce + 2 <= st.skN && Math.random() < .45, m = u * 6;
      st.skaters.push({ dir, wx: tv + (dir > 0 ? -m : W + m), v: u * (2.6 + 2.4 * Math.random()), y0: laneY(), ph: Math.random() * TAU,
        pal: Math.floor(Math.random() * SK_M.length), pal2: Math.floor(Math.random() * SK_M.length), pair, born: t, woman: Math.random() < .45, k: 1,
        turns: Math.floor(Math.random() * 3), turnAt: t + 6000 + 10000 * Math.random(), trail: [], tt: 0 });
      st.nextSkater = t + 1500 + 2500 * Math.random();
    }
    for (const s of st.skaters) {
      const x = sx(s.wx);
      if (s.turns && t >= s.turnAt && x > W * .15 && x < W * .85) { s.turns--; s.turnAt = t + 7000 + 9000 * Math.random(); s.turnT = t; s.flip = true; }
      if (s.flip && t - s.turnT >= 600) { s.dir = -s.dir; s.flip = false; }   // eases to a stop, turns round, glides off the other way
      const k = s.turnT && t - s.turnT < 1200 ? Math.max(.05, Math.abs((t - s.turnT) / 600 - 1)) : 1;
      s.k = k; s.wx += s.dir * s.v * k * dt;
      if (t - s.tt > 110) { s.tt = t; s.trail.push([s.wx, s.y0 + Math.sin(t / 2600 + s.ph) * .07]); if (s.trail.length > 22) s.trail.shift(); }
    }
  }

  // ---- The back path: snowball fights, a snowman, little pines, candy canes and presents, staggered in depth ----
  // Fights sit in every other slot of SP (in town coordinates); everything is placed by hash, so it scrolls with the town.
  // Kid offsets are kept in sprite pixels (px), so a resize keeps each fight's shape. At most 12 children on screen:
  // a fight only starts (comes into view) if its children fit under that.
  const SPU = 64;                                         // slot width in units
  const fightAt = (i, E) => {                             // the shape of the fight in slot i, or null
    if (i % 2 || hash(i, 1, 91) > .8) return null;
    const u = E.unit, nL = 1 + (hash(i, 2, 91) < .5), nR = 1 + (hash(i, 3, 91) < .55), D = 38 + 14 * hash(i, 4, 91);
    return { wx: (i + .5 + (hash(i, 5, 91) - .5) * .2) * SPU * u, nL, nR, D, row: .38 + .16 * hash(i, 6, 91), half: D / 2 + 30 };
  };
  const rnd = (a, b) => a + (b - a) * Math.random();
  function newFight(i, sh, t) {
    const kids = [];
    for (const [s, n] of [[-1, sh.nL], [1, sh.nR]]) for (let j = 0; j < n; j++)
      kids.push({ s, face: -s, ox: s * (sh.D / 2 + j * 13), oy: j ? 5 * (hash(i, 7 + kids.length, 91) < .5 ? 1 : -1) : 0,
        pal: (Math.floor(hash(i, 20, 91) * KID_PALS.length) + kids.length * 5) % KID_PALS.length,   // no two alike in a fight
        ph: 'hide', until: t + rnd(200, 2600) });
    return { sh, kids, balls: [], bursts: [] };
  }
  function fightStep(f, t) {
    for (const k of f.kids) {
      if (t < k.until) continue;
      const foes = f.kids.filter(o => o.s !== k.s);
      switch (k.ph) {
        case 'hide': k.ph = 'peek'; k.until = t + rnd(350, 1000); break;
        case 'peek': if (Math.random() < .7 && foes.some(o => o.ph !== 'down')) { k.ph = 'wind'; k.until = t + 380; } else { k.ph = 'hide'; k.until = t + rnd(400, 1200); } break;
        case 'wind': {                                    // let fly at someone on the other side, standing ones first
          const up = foes.filter(o => o.ph !== 'down'), tg = (up.length ? up : foes)[Math.floor(Math.random() * (up.length || foes.length))];
          const fx = k.ox + k.face * 5, fy = k.oy - 11, dx = Math.abs(tg.ox - fx);
          f.balls.push({ fx, fy, tg, tx: tg.ox, ty: tg.oy - 7, t0: t, dur: Math.max(420, Math.min(900, dx * 13)), arc: dx * .22 });
          k.ph = 'throw'; k.until = t + 320; break;
        }
        case 'throw': if (Math.random() < .35) { k.ph = 'stand'; k.until = t + rnd(500, 1100); } else { k.ph = 'hide'; k.until = t + rnd(400, 1300); } break;
        case 'stand': if (Math.random() < .4) { k.ph = 'wind'; k.until = t + 380; } else { k.ph = 'hide'; k.until = t + rnd(400, 1200); } break;
        case 'down': k.ph = 'up'; k.until = t + 450; break;
        case 'up': k.ph = 'hide'; k.until = t + rnd(500, 1400); break;
      }
    }
    f.balls = f.balls.filter(b => {
      if (t < b.t0 + b.dur) return true;
      const k = b.tg, open = ['wind', 'throw', 'stand'].includes(k.ph) ? .88 : k.ph === 'peek' ? .4 : 0;
      if (Math.random() < open) {                         // a hit: a burst of snow and over they go, for a moment
        f.bursts.push({ x: k.ox, y: k.oy - 7, t0: t, big: true });
        k.ph = 'down'; k.until = t + rnd(1200, 1800); f.balls.forEach(o => { if (o !== b && o.tg === k) o.ty = k.oy - 2; });
      } else if (k.ph === 'down') f.bursts.push({ x: b.tx, y: k.oy - 1, t0: t });
      else f.bursts.push({ x: k.ox + k.face * 4, y: k.oy - 4, t0: t });   // smacks into their snow mound
      return false;
    });
    f.bursts = f.bursts.filter(b => t - b.t0 < 500);
  }
  function drawFight(g, f, x0, y0, px, t) {
    for (const k of [...f.kids].sort((a, b) => a.oy - b.oy)) {
      const P = KID_PALS[k.pal], flip = k.face < 0, x = x0 + k.ox * px, y = y0 + k.oy * px, w8 = 8 * px;
      if (k.ph === 'down') { const sp = P.down; drawPix(g, sp, px, x - k.face * 8 * px - spW(sp, px) / 2, y - spH(sp, px), flip); }
      else {
        const sp = P[{ hide: 'duck', peek: 'crouch', up: 'crouch', wind: 'wind', throw: 'throw', stand: 'stand' }[k.ph]];
        const lift = k.ph === 'peek' ? px : 0, sx = flip && k.ph === 'throw' ? x - spW(sp, px) + w8 / 2 : x - w8 / 2;
        drawPix(g, sp, px, sx, y - spH(sp, px) - lift, flip);
      }
      drawPix(g, MOUND, px, x + k.face * 2 * px - 6 * px, y - 3 * px, false);   // the mound in front, between them and the other side
    }
    const bs = Math.max(2, Math.round(px * 1.8));
    for (const b of f.balls) {                            // snowballs in flight, on an arc
      const p = Math.min(1, (t - b.t0) / b.dur), bx = x0 + (b.fx + (b.tx - b.fx) * p) * px, by = y0 + (b.fy + (b.ty - b.fy) * p - b.arc * 4 * p * (1 - p)) * px;
      const rx = Math.round(bx - bs / 2), ry = Math.round(by - bs / 2), o = Math.max(1, Math.round(px / 2));   // outlined, so it shows against the snow
      g.fillStyle = '#6a7fa8'; g.fillRect(rx - o, ry - o, bs + o * 2, bs + o * 2);
      g.fillStyle = '#ffffff'; g.fillRect(rx, ry, bs, bs);
    }
    for (const b of f.bursts) {                           // bursts: a puff, then flecks flying out and dropping
      const p = (t - b.t0) / 500, cx = x0 + b.x * px, cy = y0 + b.y * px, n = b.big ? 9 : 6, R = (b.big ? 7 : 4.5) * px * Math.sqrt(p);
      if (p < .25) { g.fillStyle = `rgba(225,235,250,${.9 * (1 - p * 4)})`; g.strokeStyle = `rgba(106,127,168,${.8 * (1 - p * 4)})`; g.lineWidth = Math.max(1, px / 2); g.beginPath(); g.arc(cx, cy, px * (b.big ? 3 : 2) * (1 + p * 2), 0, TAU); g.fill(); g.stroke(); }
      const fs = Math.max(1, px), o = Math.max(1, Math.round(px / 2));
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + b.x, fx = Math.round(cx + Math.cos(a) * R), fy = Math.round(cy + Math.sin(a) * R * .7 + p * p * 5 * px);
        g.fillStyle = `rgba(106,127,168,${1 - p})`; g.fillRect(fx - o, fy - o, fs + o * 2, fs + o * 2);
        g.fillStyle = `rgba(255,255,255,${1 - p})`; g.fillRect(fx, fy, fs, fs);
      }
    }
  }
  function drawPine(g, E, v, x, y, px, seed) {            // a little pine standing at (x, y); a dressed one's bulbs blink in their own time
    const pine = PINES[v], pw = spW(pine, px), ph = spH(pine, px), lx = x - pw / 2, ty = y - ph;
    drawPix(g, pine, px, lx, ty, false);
    pineBulbs[v].forEach(([bi, bj], n) => {
      const c = (n + seed) % 4; if (Math.sin(E.t / 380 + n * 1.7 + seed) <= -.2) return;
      if (!E.widget) glow(g, BULB_RGB[c], lx + (bi + .5) * px, ty + (bj + .5) * px, px * 3, .4);
      g.fillStyle = BULBS[c]; g.fillRect(Math.round(lx + bi * px), Math.round(ty + bj * px), px, px);
    });
  }
  // Pines in the gaps between the houses, one or two to a gap, standing at the foot of the town.
  function gapPines(E, out) {
    const { W, GY } = E, px = pxOf(E, .62), L = st.list;
    for (let i = 0; i + 1 < L.length; i++) {
      const a = L[i], b = L[i + 1], gap = (b.cx - b.wpx / 2) - (a.cx + a.wpx / 2), x = E.toScreen((a.cx + a.wpx / 2 + b.cx - b.wpx / 2) / 2);
      if (gap < px * 6 || x < -gap || x > W + gap || hash(a.id, 3, 98) < .3) continue;
      const n = gap > px * 16 && hash(a.id, 4, 98) < .6 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const v = (hash(a.id, 5 + k, 98) < .5 ? 0 : 2) + (hash(a.id, 7 + k, 98) < .125 ? 1 : 0), xx = x + (n > 1 ? (k - .5) * gap * .45 : 0);
        out.push([GY + k, () => drawPine(g0, E, v, xx, GY + px, px, a.id + k)]);
      }
    }
  }
  // Everything on the back path that's in view, as [depth y, draw] pairs for drawTop to paint back to front.
  function backPath(E, out) {
    const { W, GY, H, t, unit: u } = E, road = (H - GY) * ROAD, tv = E.travel, px = pxOf(E, .72), SP = SPU * u;
    const i0 = Math.floor((tv - SP) / SP), i1 = Math.ceil((tv + W + SP) / SP);
    let kids = 0;                                         // fights still in view keep going; new ones only if under 12 children
    for (const [i] of st.fights) if (i < i0 || i > i1) st.fights.delete(i);
    for (const [, f] of st.fights) kids += f.kids.length;
    const zones = [];
    for (let i = i0; i <= i1; i++) {
      const sh = fightAt(i, E); if (!sh) continue;
      let f = st.fights.get(i);
      if (!f) { if (kids + sh.nL + sh.nR > 12) continue; f = newFight(i, sh, t); st.fights.set(i, f); kids += f.kids.length; }
      zones.push([sh.wx, sh.half * px]);
      fightStep(f, t);
      const y = GY + road * sh.row, x = sh.wx - tv;
      out.push([y, () => drawFight(g0, f, x, y, px, t)]);
    }
    for (let i = i0; i <= i1; i++) if (i % 2 && hash(i, 8, 91) < .6) {   // a snowman in some of the slots between fights
      const wx = (i + .3 + .4 * hash(i, 9, 91)) * SP, y = GY + road * (.3 + .2 * hash(i, 10, 91)), x = wx - tv;
      out.push([y, () => drawPix(g0, SNOWMAN, px, x - spW(SNOWMAN, px) / 2, y - spH(SNOWMAN, px), hash(i, 11, 91) < .5)]);
      zones.push([wx, 9 * px]);
    }
    const sp = 9 * u, j0 = Math.floor((tv - sp * 2) / sp), j1 = Math.ceil((tv + W + sp) / sp);
    for (let j = j0; j <= j1; j++) {                      // canes, presents and little pines, scattered back and forth in depth
      const wx = (j + .7 * hash(j, 1, 92)) * sp, x = wx - tv, y = GY + road * (.18 + .44 * hash(j, 2, 92)), r = hash(j, 3, 92);
      if (zones.some(([zx, zh]) => Math.abs(wx - zx) < zh)) continue;
      if (r < .22) out.push([y, () => {                   // leaning every which way, as the wind and the snow left them
        const cw = spW(CANE, px), ch = spH(CANE, px); g0.save(); g0.translate(x + cw / 2, y + px); g0.rotate((hash(j, 9, 92) - .5) * 1.2);
        drawPix(g0, CANE, px, -cw / 2, -ch, hash(j, 4, 92) < .5); g0.restore();
      }]);
      else if (r < .42) {
        const a = GIFTS[Math.floor(hash(j, 5, 92) * 4)], b = GIFTS[(Math.floor(hash(j, 5, 92) * 4) + 1) % 4], two = hash(j, 6, 92) < .5;
        out.push([y, () => { drawPix(g0, a, px, x, y - spH(a, px), false); if (two) drawPix(g0, b, px, x + spW(a, px) + px, y - spH(b, px), false); }]);
      } else {
        const v = (hash(j, 7, 92) < .5 ? 0 : 2) + (hash(j, 8, 92) < .125 ? 1 : 0), pine = PINES[v];   // one in eight dressed up
        out.push([y, () => drawPine(g0, E, v, x, y, px, j)]);
      }
    }
    const gs = 23 * u;                                    // little groves of two to four pines here and there, behind the snowball fights
    for (let j = Math.floor((tv - gs * 2) / gs); (j - 1) * gs < tv + W; j++) {
      if (hash(j, 1, 93) < .4) continue;
      const n = 2 + Math.floor(hash(j, 2, 93) * 3), gx = (j + .6 * hash(j, 3, 93)) * gs;
      for (let k = 0; k < n; k++) {
        const v = (hash(j, k + 4, 93) < .6 ? 0 : 2) + (hash(j, k + 9, 93) < .125 ? 1 : 0), y = GY + road * (.06 + .2 * hash(j, k + 14, 93)), x = gx + (k - n / 2) * 7 * px + hash(j, k + 19, 93) * 3 * px - tv;
        out.push([y, () => drawPine(g0, E, v, x, y, px, j * 7 + k)]);
      }
    }
  }
  let g0 = null;
  // Old iron lampposts along the river bank, each with a wreath and a snowy cap, strung together with swags of coloured bulbs.
  function lamps(g, E, iy) {
    const { W, t, unit: u, travel } = E, sp = u * 26, lh = u * 7, lw = Math.max(1, Math.round(u * .35)), r = Math.max(1, u * .22);
    const post = i => hash(i, 1, 97) < .75 ? i * sp + (hash(i, 2, 97) - .5) * u * 6 : null;   // where post i stands (town x), if it does
    for (let i = Math.floor((travel - sp) / sp); i * sp - travel < W + sp; i++) {
      const a = post(i), b = post(i + 1); if (a === null) continue;
      const x = Math.round(a - travel);
      if (b !== null) {                                   // the swag to the next post, hanging lower in the middle
        const x2 = b - travel, n = Math.max(4, Math.round((x2 - x) / (u * 1.6)));
        g.strokeStyle = 'rgba(30,40,30,.8)'; g.lineWidth = 1; g.beginPath();
        for (let k = 0; k <= n; k++) { const q = k / n, yy = iy - lh * .78 + Math.sin(q * Math.PI) * u * 1.8; k ? g.lineTo(x + (x2 - x) * q, yy) : g.moveTo(x, yy); } g.stroke();
        for (let k = 1; k < n; k++) {
          const q = k / n, bx = x + (x2 - x) * q, by = iy - lh * .78 + Math.sin(q * Math.PI) * u * 1.8 + r, c = (k + i) % 4;
          if (Math.sin(t / 520 + k * 2.1 + i) < -.55) continue;   // each one twinkling off now and then
          if (!E.widget) glow(g, BULB_RGB[c], bx, by, r * 5, .3);
          g.fillStyle = BULBS[c]; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill();
        }
      }
      g.fillStyle = '#16141c'; g.fillRect(x - lw / 2, iy - lh, lw, lh); g.fillRect(x - lw * 1.5, iy - u * .6, lw * 3, u * .6);   // the post and its foot
      const hy = iy - lh - u * 1.3, hw = u * 1.1;          // the lamp
      if (!E.widget) glow(g, '255,210,130', x, hy + u * .6, u * 4.5, .5 + .05 * Math.sin(t / 300 + i));
      g.fillStyle = '#ffe2a0'; g.fillRect(x - hw / 2, hy, hw, u * 1.2); g.fillStyle = '#16141c'; g.fillRect(x - hw / 2 - u * .2, hy - u * .3, hw + u * .4, u * .35);
      g.fillStyle = '#eef3fb'; g.fillRect(x - hw / 2 - u * .3, hy - u * .55, hw + u * .6, u * .3);
      const wy = iy - lh * .45, wr = Math.max(1.5, u * .7);   // the wreath and its bow
      g.strokeStyle = '#1f7a36'; g.lineWidth = Math.max(1, u * .4); g.beginPath(); g.arc(x, wy, wr, 0, TAU); g.stroke();
      g.fillStyle = '#e02a2a'; g.fillRect(x - u * .4, wy + wr - u * .2, u * .8, u * .5);
    }
  }                                          // the canvas drawTop is painting, for the deferred draws above

  // A carriage: one or two horses trotting ahead, the coach with lit windows, a coachman up front and a lantern.
  function drawCarriage(g, c, E) {
    const { t, GY, H, travel } = E, px = pxOf(E, .72), road = (H - GY) * ROAD, base = GY + road * (c.dir > 0 ? .88 : .74);
    const x = c.wx - travel, f = Math.floor(t / 170 + c.ph) % 2, bob = (Math.floor(t / 170 + c.ph) % 2) * px;
    g.save(); g.translate(Math.round(x), 0); if (c.dir < 0) g.scale(-1, 1);   // drawn facing right around its middle, mirrored to go left
    const P = (a, b) => [a * px, b * px], hs = HORSES[c.horse][f], cw = 21, L = -20;   // coach from L to L + 21, horses ahead of it
    const body = (c.vic ? VICS : COACHES)[c.coach], coachY = base - 4 * px - spH(body, px), hx = L + cw - 3;
    if (c.pair) withAlpha(g, .8, () => drawPix(g, HORSES[c.horse][1 - f], px, (hx + 2) * px, base - spH(hs, px) - 2 * px, false));   // the far horse
    g.strokeStyle = '#3a2416'; g.lineWidth = Math.max(1, px * .7); g.beginPath();   // the shafts
    g.moveTo(...P(L + 17, -5).map((v, i) => v + (i ? base : 0))); g.lineTo(...P(hx + 9, -7).map((v, i) => v + (i ? base - bob : 0))); g.stroke();
    drawPix(g, hs, px, hx * px, base - spH(hs, px) - bob, false);
    drawPix(g, body, px, L * px, coachY, false);
    g.strokeStyle = 'rgba(30,20,10,.8)'; g.lineWidth = Math.max(1, px * .4); g.beginPath();   // the reins
    g.moveTo(...P(L + 16, 0).map((v, i) => v + (i ? coachY + 6 * px : 0))); g.lineTo(...P(hx + 15, 0).map((v, i) => v + (i ? base - 11 * px - bob : 0))); g.stroke();
    const rot = (c.wx * c.dir) / px;                      // the wheels turn with the distance covered
    for (const [wx, r] of [[L + 4, 4.2], [L + 15, 3.2]]) {
      const cx = wx * px, cy = base - r * px;
      g.strokeStyle = '#c8a030'; g.lineWidth = Math.max(1, px * .8); g.beginPath(); g.arc(cx, cy, r * px, 0, TAU); g.stroke();
      g.lineWidth = Math.max(1, px * .45); g.beginPath();
      for (let k = 0; k < 4; k++) { const a = rot / r + k * Math.PI / 4; g.moveTo(cx - Math.cos(a) * r * px, cy - Math.sin(a) * r * px); g.lineTo(cx + Math.cos(a) * r * px, cy + Math.sin(a) * r * px); }
      g.stroke(); g.fillStyle = '#3a2416'; g.fillRect(cx - px, cy - px, px * 2, px * 2);
    }
    if (!E.widget) { glow(g, '255,220,140', (L + 18.5) * px, coachY + 6.5 * px, px * 5, .55 + .1 * Math.sin(t / 150 + c.ph));   // the lantern
      if (!c.vic) for (const wx of [L + 3, L + 10]) glow(g, '255,200,120', wx * px, coachY + 8.5 * px, px * 4, .35); }
    for (let k = 0; k < 4; k++) {                         // snow kicked up behind the wheels
      const p = (t / 600 + k / 4 + c.ph) % 1;
      g.fillStyle = `rgba(240,246,255,${.6 * (1 - p)})`; g.fillRect(Math.round((L - p * 6) * px), Math.round(base - p * (1 - p) * 10 * px - px), Math.max(1, px), Math.max(1, px));
    }
    g.restore();
  }
  // A skater (or a pair, hand in hand) gliding over the ice, with a faint reflection and the lines their blades leave.
  function drawSkater(g, s, E, iy, ih) {
    const { t, travel } = E, px = pxOf(E, .62), y = iy + ih * (s.y0 + Math.sin(t / 2600 + s.ph) * .07), flip = s.dir < 0;
    g.strokeStyle = 'rgba(225,240,255,.3)'; g.lineWidth = 1; g.beginPath();
    s.trail.forEach(([wx, y0], i) => { const tx = wx - travel, ty = iy + ih * y0 + px * .5; if (i) g.lineTo(tx, ty); else g.moveTo(tx, ty); }); g.stroke();
    const who = [[0, 0, s.pal, s.woman]]; if (s.pair) who.push([-s.dir * 7, 2, s.pal2, !s.woman]);   // a pair is always a man and a woman
    const f = s.k < .4 ? 0 : skLeg(((t / 1500 + s.ph) % 1 + 1) % 1);   // gliding through a turn; otherwise a lazy stride, in step with a partner
    for (const [dx, dy, pal, woman] of who.sort((a, b) => a[1] - b[1])) {
      const sp = (woman ? SK_W : SK_M)[pal][f], w = spW(sp, px), h = spH(sp, px), x = s.wx - travel + dx * px - w / 2, yy = y + dy * px;
      withAlpha(g, .16, () => { g.save(); g.translate(0, yy * 2); g.scale(1, -1); drawPix(g, sp, px, x, yy - h, flip); g.restore(); });
      drawPix(g, sp, px, x, yy - h, flip);
    }
    if (s.pair) { g.fillStyle = '#2a2a2a'; g.fillRect(Math.round(s.wx - travel - s.dir * 4 * px - px), Math.round(y - 7 * px), px * 3, Math.max(1, px)); }   // holding hands
  }

  registerTheme('xmas', { name: 'Christmas Village',
    kit: { styles: ['cottage', 'pairs', 'cottage', 'tall', 'wide', 'cottage'], roofs: [['pyramid', 4], ['pyramid', 3], ['pyramid', 5.5], ['pyramid', 2.5], ['pyramid', 7], ['pyramid', 4], ['pyramid', 9]],
      tall: .22, shrink: .82, w0: 6, gaps: [.6, 1.6], landmarks: ['workshop', 'inn', 'chapel', 'bakery', 'townhouse', 'ginger', 'clocktower', 'cabin'], lmChance: .6, lmScale: 2 },
    minF: .16, maxF: .56, weather: 'snow', noBack: true, planes: false, roofLights: false, searchlights: false,
    sky: [[0, '#020615'], [.6, '#0a1838'], [1, '#1c3256']], skyToGround: true,
    stars: true, moon: false, cloud: 'rgba(160,180,220,.12)', fogRGB: '190,205,230',
    body: '#141019', side: '#1d1822', top: '#262030',
    win: c => ({ h: 30 + c.h / 360 * 20, s: 90, m: c.m }),   // warm candle-gold, still swelling with the music
    back: { h: .45, density: .6, body: '#0b1428', win: () => 'rgba(255,200,120,.3)' },
    drawFar(g, E) {                                       // snowy mountains and a pine ridge, sliding slower than the town
      const { W, GY } = E, d = dpr(), k = `${W},${GY},${d}`;
      if (st.hk !== k) { st.hk = k; st.hills = hills(W, GY); }
      const w = W * 2, ox = ((E.travel * .3) % w + w) % w;
      g.drawImage(st.hills, -ox, 0, w, GY); g.drawImage(st.hills, w - ox, 0, w, GY);
    },
    drawSky(g, E) {                                       // now and then, a faint aurora behind everything
      step(E); const a = auA(E.t);
      if (a > 0) curtains(g, E, .35 + .4 * avg(E.bands, 3, 7), E.t / 3, a * .45);
    },
    drawBehind(g, E) {                                    // the star, the angels and the sleigh, in front of the clouds, behind the rooftops
      step(E); if (E.widget) return;                 // the widget has no sky
      star(g, E);
      const a = auA(E.t); if (a > 0) angels(g, E, a);
      const s = st.santa; if (!s) return;
      const px = pxOf(E, .42), flip = s.dir < 0, f = Math.floor(E.t / 160) % 2, bob = Math.sin(E.t / 500 + s.ph) * px * 3;
      const sw = spW(SLEIGH, px), dw = spW(LEAD[0], px), gap = dw * 1.15, sy = s.y + bob;
      const at = k => s.x + s.dir * (sw * .5 + gap * (k + .4));   // reindeer k's centre, ahead of the sleigh
      g.strokeStyle = 'rgba(232,192,64,.7)'; g.lineWidth = Math.max(1, px * .5); g.beginPath();   // the reins
      g.moveTo(s.x + s.dir * sw * .2, sy - px * 4); g.lineTo(at(4), sy - px * 2 + Math.sin(E.t / 500 + s.ph + 2) * px); g.stroke();
      for (let k = 4; k >= 0; k--) {                      // four pairs, then the leader with the glowing red nose
        const lead = k === 4, sp = (lead ? LEAD : TEAM)[(f + k) % 2], dy = Math.sin(E.t / 500 + s.ph + k * .5) * px * 1.5;
        for (const row of lead ? [0] : [-1, 1]) drawPix(g, sp, px, at(k) - dw / 2 + row * px * 1.5, sy - px * 7 + dy + row * px * 2, flip);
        if (lead) glow(g, '255,60,50', at(k) + s.dir * dw * .5, sy - px * 5 + dy, px * 4, .55 + .45 * Math.sin(E.t / 300));
      }
      drawPix(g, SLEIGH, px, s.x - sw / 2, sy - spH(SLEIGH, px), flip);
      for (let i = 0; i < 6; i++) {                        // a faint trail of golden sparkles
        const tx = s.x - s.dir * (sw * .5 + i * px * 6), ty = sy - px * 2 + Math.sin(E.t / 200 + i) * px * 2;
        withAlpha(g, .5 - i * .08, () => { g.fillStyle = '#ffe9a0'; g.fillRect(tx, ty, px, px); });
      }
    },
    drawExtras(g, b, cx, tip, E) {                        // snow on the roofs, string lights along the eaves, wreaths
      if (b.lm || !b.roof) return;
      const u = E.unit, top = b.tiers[b.tiers.length - 1], tw = top.w * u, h = b.roof[1] * u, k = Math.min(.85, .5 * (1 + (E.snowCap - 1) * .5));
      g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(tip[0], tip[1] - .5); g.lineTo(tip[0] - tw / 2 * k, tip[1] + h * k);
      g.lineTo(tip[0] - tw * .1, tip[1] + h * k * .8); g.lineTo(tip[0] + tw * .05, tip[1] + h * k); g.lineTo(tip[0] + tw / 2 * k, tip[1] + h * k); g.fill();
      const ey = tip[1] + h, v = b.id % 5;
      let ly = E.GY;                                        // snow along each step where a narrower tier sits on a wider one
      for (const tr of b.tiers) { ly -= tr.h * u; if (tr !== top) { g.fillStyle = '#eef3fb'; g.fillRect(cx - tr.w * u / 2 - u * .2, ly - u * .35, tr.w * u + u * .4, u * .45); } }
      if (h > u * 3.2) {                                    // a little round attic window up in the gable
        const ay = tip[1] + h * .62, ar = Math.max(1, u * .45);
        g.fillStyle = '#0c0a10'; g.beginPath(); g.arc(tip[0], ay, ar + Math.max(1, u * .15), 0, TAU); g.fill();
        withAlpha(g, .4 + .6 * b.level, () => { g.fillStyle = '#ffcc7a'; g.beginPath(); g.arc(tip[0], ay, ar, 0, TAU); g.fill(); });
      }
      g.fillStyle = 'rgba(222,236,255,.9)';                 // icicles hanging from the eaves, longer and shorter
      for (let x = cx - tw / 2 + u * .3, i = 0; x < cx + tw / 2 - u * .2; x += u * .75, i++) g.fillRect(Math.round(x), ey, Math.max(1, Math.round(u * .2)), Math.round(u * (.35 + .6 * hash(b.id, i, 96))));
      const bw = b.tiers[0].w * u;                          // snow drifted up against the walls
      g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(cx - bw / 2 - u * 1.2, E.GY);
      g.quadraticCurveTo(cx - bw / 2, E.GY - u * 1.4, cx - bw * .2, E.GY - u * .5); g.quadraticCurveTo(cx + bw * .15, E.GY - u * .3, cx + bw / 2 - u * .2, E.GY - u * 1);
      g.quadraticCurveTo(cx + bw / 2 + u * .4, E.GY - u * 1.1, cx + bw / 2 + u * 1.2, E.GY); g.fill();
      if (v === 0 || v === 2 || v === 3) {                  // a chimney, sometimes smoking
        const chx = tip[0] - tw * .26, chy = tip[1] + h * .45;
        g.fillStyle = '#141019'; g.fillRect(chx, chy - u * 2.4, u * 1.2, u * 2.4); g.fillStyle = '#eef3fb'; g.fillRect(chx - u * .15, chy - u * 2.6, u * 1.5, u * .4);
        if (v !== 3 && !E.widget) for (let k = 0; k < 3; k++) {
          const p = (E.t / 3400 + k / 3 + b.id * .37) % 1;
          withAlpha(g, .3 * (1 - p), () => { g.fillStyle = '#d6dcec'; g.beginPath(); g.arc(chx + u * .6 + p * u * 2, chy - u * 3 - p * u * 5, u * (.4 + p * .8), 0, TAU); g.fill(); });
        }
      }
      const n = Math.max(3, Math.round(tw / (u * 1.4))), r = Math.max(1, u * .28);
      const lit = b.level * (n + 1), head = (E.t / 120 + b.id * 3) % (n + 1);   // how many are lit, and a chaser running along
      if (v <= 1) for (let i = 0; i <= n; i++) {           // coloured bulbs filling along the string with the music, a chaser on top
        const x = cx - tw / 2 + tw * i / n, sag = (i % 2) * u * .25, c = BULBS[(i + Math.floor(E.t / 700) + b.id) % 4];
        const on = Math.max(.25, Math.min(1, lit - i + .5), 1 - Math.min(Math.abs(i - head), 2) / 2);
        if (on > .6 && !E.widget) glow(g, BULB_RGB[(i + Math.floor(E.t / 700) + b.id) % 4], x, ey + sag, r * 4, .35 * on);
        withAlpha(g, on, () => { g.fillStyle = c; g.beginPath(); g.arc(x, ey + sag, r, 0, TAU); g.fill(); });
      } else if (v === 2) withAlpha(g, .35 + .65 * b.level, () => {   // warm white icicle lights, twinkling
        g.fillStyle = '#fff2c8';
        for (let i = 0; i <= n * 2; i++) if ((i * 5 + Math.floor(E.t / 300)) % 7 || b.level > .6) g.fillRect(cx - tw / 2 + tw * i / (n * 2), ey, Math.max(1, u * .2), u * (.4 + .5 * ((i * 7) % 3) / 2));
      }); else if (v === 4) {                              // a candy-cane garland
        const m = n * 2;
        const sh = Math.floor(E.t / 400);               // the stripes march along
        for (let i = 0; i < m; i++) { g.fillStyle = (i + sh) % 2 ? '#ffffff' : '#e8202a'; g.fillRect(cx - tw / 2 + tw * i / m, ey, tw / m + .5, Math.max(1, u * .35)); }
      }
      if (!E.widget) {                                      // a lit front door at street level, set off-centre on some
        const bw = b.tiers[0].w * u, dx = (hash(b.id, 1, 95) - .5) * bw * .5, dw = Math.max(2, u * 1.5), dh = u * 2.6, gy = E.GY;
        g.fillStyle = '#0c0a10'; g.fillRect(cx + dx - dw / 2 - u * .25, gy - dh - u * .25, dw + u * .5, dh + u * .25);
        withAlpha(g, .55 + .45 * b.level, () => { g.fillStyle = '#ffcc7a'; g.fillRect(cx + dx - dw / 2, gy - dh, dw, dh); });
        if (v === 1 || v === 4) {                            // a lantern by the door, flickering
          const lx = cx + dx + dw / 2 + u * .7, fl = .8 + .2 * Math.sin(E.t / 170 + b.id);
          glow(g, '255,190,100', lx, gy - dh * .8, u * 1.8, .5 * fl); g.fillStyle = '#ffd88a'; g.fillRect(lx - u * .2, gy - dh * .9, u * .4, u * .6);
        }
        if (v === 2) {                                       // a striped shop awning over the door
          const aw = dw * 2.4, ax = cx + dx - aw / 2, ay = gy - dh - u * 1.2, m = 6;
          for (let i = 0; i < m; i++) { g.fillStyle = i % 2 ? '#f4f4f4' : '#c82a2a'; g.fillRect(ax + aw * i / m, ay, aw / m + .5, u * .9); }
          g.fillStyle = '#eef3fb'; g.fillRect(ax, ay - u * .2, aw, u * .3);
        }
        if (v === 3) { g.strokeStyle = '#1f7a36'; g.lineWidth = Math.max(1, u * .3); g.beginPath(); g.arc(cx + dx, gy - dh * .62, dw * .3, 0, TAU); g.stroke(); }
      }
      if (b.id % 3 === 0 && !E.widget) {                    // a wreath with a red bow
        const wy = ey + u * 3, wr = Math.max(2, u * 1.1);
        g.strokeStyle = '#1f7a36'; g.lineWidth = Math.max(1.5, u * .55); g.beginPath(); g.arc(cx, wy, wr, 0, TAU); g.stroke();
        g.fillStyle = '#e02a2a'; g.fillRect(cx - u * .5, wy + wr - u * .3, u, u * .6);
      }
    },
    ground: { h: .3, draw(g, E) {                          // the snowy road and its back path, then the frozen river
      const { W, H, GY, unit: u, travel } = E, gh = H - GY, road = gh * ROAD, iy = GY + road, ih = gh - road;
      g.fillStyle = lin(g, 0, GY, 0, iy, [[0, '#dfe7f4'], [1, '#b9c6dc']]); g.fillRect(0, GY, W, road);
      g.fillStyle = 'rgba(150,165,200,.35)';               // soft drifts and footprints over the back path, scrolling with the town
      for (let i = Math.floor(travel / (u * 7)) - 1; i * u * 7 - travel < W; i++) {
        const x = i * u * 7 - travel + hash(i, 1, 66) * u * 4, y = GY + road * (.15 + .5 * hash(i, 2, 66));
        g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(u * (.6 + hash(i, 3, 66)))), 1);
      }
      g.fillStyle = 'rgba(120,135,170,.4)';                // wheel and hoof ruts in the two carriage lanes
      for (let x = -(travel % (u * 6)); x < W; x += u * 6) for (const ly of [.74, .88]) { g.fillRect(x, GY + road * ly - 1, u * 3.5, 1); g.fillRect(x + u * 2.6, GY + road * ly + 1, u * 2.6, 1); }
      const k = `${W},${H},${GY}`;
      if (st.ik !== k) {                                    // the ice, drawn once per size
        st.ik = k; const d = dpr(), r = (i, s) => hash(i, s, 62);
        st.ice = mk(W * d, ih * d, x => {
          x.scale(d, d); x.fillStyle = lin(x, 0, 0, 0, ih, [[0, '#4a6a8c'], [.35, '#2c4868'], [1, '#101e30']]); x.fillRect(0, 0, W, ih);
          for (let i = 0; i < W / 120; i++) {               // polished patches, catching the light
            const cx = r(i, 10) * W, cy = ih * (.2 + .6 * r(i, 11)), rx = 30 + 90 * r(i, 12);
            const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rx); gr.addColorStop(0, 'rgba(200,225,255,.13)'); gr.addColorStop(1, 'rgba(200,225,255,0)');
            x.fillStyle = gr; x.save(); x.translate(cx, cy); x.scale(1, .25); x.translate(-cx, -cy); x.beginPath(); x.arc(cx, cy, rx, 0, TAU); x.fill(); x.restore();
          }
          for (let i = 0; i < W / 90; i++) {                // dustings of snow blown across the ice
            const cx = r(i, 20) * W, cy = ih * r(i, 21), n = 6 + Math.floor(r(i, 22) * 10);
            x.fillStyle = 'rgba(235,242,252,.22)';
            for (let j = 0; j < n; j++) x.fillRect(Math.round(cx + (hash(i, j, 65) - .5) * 40), Math.round(cy + (hash(i, j, 67) - .5) * 6), 2 + Math.round(hash(i, j, 68) * 7), 1);
          }
          x.strokeStyle = 'rgba(210,235,255,.16)'; x.lineWidth = 1;   // cracks, some branching
          for (let i = 0; i < W / 60; i++) {
            let cx = r(i, 1) * W, cy = r(i, 2) * ih; x.beginPath(); x.moveTo(cx, cy);
            for (let s = 0; s < 5; s++) { cx += (hash(i, s, 63) - .5) * 40; cy += (hash(i, s, 64) - .5) * ih * .35; x.lineTo(cx, cy); if (hash(i, s, 69) < .3) { x.lineTo(cx + 10, cy - 5); x.moveTo(cx, cy); } }
            x.stroke();
          }
          x.strokeStyle = 'rgba(230,240,255,.12)';          // old skate scratches, long shallow curves
          for (let i = 0; i < W / 70; i++) { const cx = r(i, 30) * W, cy = ih * (.15 + .7 * r(i, 31)), l = 40 + 80 * r(i, 32); x.beginPath(); x.moveTo(cx - l, cy); x.quadraticCurveTo(cx, cy + (r(i, 33) - .5) * 14, cx + l, cy); x.stroke(); }
          x.fillStyle = 'rgba(220,240,255,.35)';            // little frozen bubbles
          for (let i = 0; i < W / 25; i++) x.fillRect(Math.round(r(i, 40) * W), Math.round(r(i, 41) * ih), 1 + (r(i, 42) < .3), 1 + (r(i, 42) < .3));
        });
      }
      const ox = ((travel % W) + W) % W;
      g.drawImage(st.ice, -ox, iy, W, ih); g.drawImage(st.ice, W - ox, iy, W, ih);
      for (const b of st.list) {                           // the windows' warm glow on the ice
        const x = E.toScreen(b.cx); if (x < -b.wpx || x > W + b.wpx) continue;
        withAlpha(g, .1 + .35 * b.level, () => g.drawImage(sprite('255,190,100'), x - b.wpx * .45, iy, b.wpx * .9, ih));
      }
      g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(0, iy + 1);   // the snowy bank along the river
      for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, iy - road * .05 * (1 + Math.sin((x + travel) / (u * 7)) * .6));
      g.lineTo(W, iy + 1); g.fill();
      const rs = u * 6;                                    // snow-capped stones half buried along the bank, alone or in little heaps
      for (let i = Math.floor(travel / rs) - 1; i * rs - travel < W; i++) {
        if (hash(i, 1, 64) < .6) continue;
        const x0 = i * rs - travel + hash(i, 2, 64) * rs, n = 1 + Math.floor(hash(i, 3, 64) * 3);
        for (let j = 0; j < n; j++) {
          const rw = u * (1.6 + 1.8 * hash(i, j + 4, 64)), rh = rw * (.55 + .2 * hash(i, j + 8, 64)), x = x0 + j * u * 1.9 - (j === 2 ? u * 2.8 : 0), y = iy + u * (.2 + .25 * (j === 2));
          g.fillStyle = '#3e4658'; g.beginPath(); g.ellipse(x, y, rw / 2, rh, 0, Math.PI, TAU); g.fill();
          g.fillStyle = '#566078'; g.beginPath(); g.ellipse(x - rw * .12, y - rh * .2, rw * .3, rh * .6, 0, Math.PI, TAU); g.fill();
          g.fillStyle = '#eef3fb'; g.beginPath(); g.ellipse(x, y - rh * .62, rw * .42, rh * .42, 0, Math.PI, TAU); g.fill();
        }
      }
    } },
    decorate(b, r) { b.body = WALLS[Math.floor(r() * WALLS.length)]; },
    afterLayout(list, r, E) {                             // the great tree stands in front of the town, right of its middle (where Fit shows it)
      st.list = list; const want = (list[0].cx + list[list.length - 1].cx) / 2 + E.W * .36;
      st.treeX = list.reduce((a, b) => Math.abs(b.cx - want) < Math.abs(a.cx - want) ? b : a).cx;
      st.fights.clear(); st.cars = []; st.skaters = []; st.men = null;
    },
    crowdState() {                                        // for the tests: who's out, and what the children are doing
      const kids = [...st.fights.values()].flatMap(f => f.kids);
      return { kids: kids.length, poses: kids.map(k => k.ph), balls: [...st.fights.values()].reduce((n, f) => n + f.balls.length, 0),
        cars: st.cars.length, carsAt: st.cars.map(c => [c.wx, c.vic, c.dir]), onIce: st.skaters.reduce((n, s) => n + (s.pair ? 2 : 1), 0), men: !!st.men, treeX: st.treeX };
    },
    drawTop(g, E) {                                       // everything on the snow and the ice, painted from the back to the front
      step(E);
      const { GY, H, unit: u, travel } = E, gh = H - GY, road = gh * ROAD, iy = GY + road, ih = gh - road, items = [];
      g0 = g;
      if (!E.widget) items.push([GY + road * .24, () => tree(g, E)]);
      if (gh > u * 9) {                                   // not in the tour, whose ground is a thin strip: no room for a crowd there
        const px = pxOf(E, .55), w = spW(RIDERS[0][0], px), f = Math.floor(E.t / 260) % 2;
        st.gapW = w * 1.35;
        if (st.men) { const y = GY + road * .13; items.push([y, () => { for (let i = 0; i < 3; i++) drawPix(g, RIDERS[i][(f + i) % 2], px, st.men.wx - travel + i * st.gapW, y - spH(RIDERS[0][0], px), true); }]); }
        backPath(E, items); gapPines(E, items);
        for (const c of st.cars) items.push([GY + road * (c.dir > 0 ? .88 : .74), () => drawCarriage(g, c, E)]);
        for (const s of st.skaters) items.push([iy + ih * s.y0 + 1, () => drawSkater(g, s, E, iy, ih)]);
        items.push([iy, () => lamps(g, E, iy)]);
      }
      items.sort((a, b) => a[0] - b[0]).forEach(([, d]) => d());
    },
  });
}
})();
