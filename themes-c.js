// City Pulse plugin: themed cities (themes-c). Loaded by index.html after the core script, before start().
// Register with CityPulse.registerTheme(key, def); see the field list above registerTheme in index.html.
// Jungle City: aged, ivy-hung stone towers deep in a rainforest, a stepped temple, a great carved head, waterfalls in the
// misty hills behind, fireflies, and an explorer who wanders the city until he steals the golden skull from its shrine.
// All sizes are in units (E.unit px) or explorer pixels, so they scale from the widget to a 4K TV.
(() => {
  const CP = window.CityPulse;
  if (!CP) return;
  const { registerTheme, registerLandmark, sprite, hash, STY, mk, withAlpha, glow, lin } = CP;
  const TAU = Math.PI * 2;
  const dpr = () => window.devicePixelRatio || 1;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  STY.temple = { cw: 3.2, ch: 4, ww: .34, wh: .5 };        // few, deep window openings
  const STONE = ['#2f362d', '#363830', '#2b3331', '#3a3b31', '#323a2e'];   // mossy greys
  const LEAF = ['#1f5a26', '#2a6e2c', '#174a20', '#357a30'];

  // ---------- landmarks ----------
  // Ivy hanging from a ledge, in unit coordinates (for the landmarks).
  const ivyU = (g, x, y, len, seed) => {
    for (let k = 0; k < len; k += .55) {
      const xx = x + Math.sin(k * 1.3 + seed) * .35;
      g.fillStyle = LEAF[Math.floor(hash(seed, k * 10, 31) * 4)]; g.fillRect(xx - (k * 10 % 2 ? .45 : 0), y + k, .45, .38);
    }
  };
  // The stepped temple: five terraces, a steep central stair, carved panels, a shrine with a torchlit doorway and a roof comb.
  registerLandmark('steptemple', { w: 36, h: 28, draw(g, L) {
    const c = col => L.side ? L.body : col, T = [[18, 0, 4], [15, 4, 4], [12, 8, 4], [9, 12, 4], [6.5, 16, 3.6]];
    for (const [hw, y0, h] of T) { g.fillStyle = c('#3a3d31'); g.fillRect(-hw, -y0 - h, hw * 2, h); }
    g.fillStyle = c('#34372c'); g.fillRect(-4.6, -25.6, 9.2, 6); g.fillRect(-3.2, -28, 6.4, 2.4);   // the shrine and its roof comb
    g.fillStyle = L.win(Math.max(.35, L.lit(21))); g.beginPath(); g.moveTo(-1.4, -19.6); g.lineTo(-1.4, -22.6); g.lineTo(0, -24); g.lineTo(1.4, -22.6); g.lineTo(1.4, -19.6); g.fill();
    for (const [hw, y0] of T.slice(0, 4)) for (const s of [-1, 1]) { g.fillStyle = L.win(L.lit(y0 + 2)); g.fillRect(s * (hw - 2.4) - .4, -y0 - 2.6, .8, 1.4); }
    if (L.side) return;
    for (const [hw, y0, h] of T) {
      g.fillStyle = '#4a4d3e'; g.fillRect(-hw, -y0 - h, hw * 2, .5);                       // the ledge, catching light
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-hw, -y0 - h + .5, hw * 2, .35);
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -hw + 1.5; x < hw; x += 2.2) g.fillRect(x, -y0 - h + 1.2, 1.2, h - 1.8);   // carved panels
    }
    g.fillStyle = '#4d4f40'; g.beginPath(); g.moveTo(-3.4, 0); g.lineTo(-2.2, -19.6); g.lineTo(2.2, -19.6); g.lineTo(3.4, 0); g.fill();   // the stair
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = -.6; y > -19.6; y -= .7) g.fillRect(-3.4 + (-y / 19.6) * 1.2, y, 6.8 - (-y / 19.6) * 2.4, .18);
    g.fillStyle = '#2a2c22'; g.beginPath(); g.moveTo(-3.8, 0); g.lineTo(-2.6, -19.6); g.lineTo(-2.2, -19.6); g.lineTo(-3.4, 0); g.fill();
    g.beginPath(); g.moveTo(3.8, 0); g.lineTo(2.6, -19.6); g.lineTo(2.2, -19.6); g.lineTo(3.4, 0); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let x = -2.6; x < 3; x += 1.3) g.fillRect(x, -27.4, .6, 1.2);   // openings in the comb
    for (const [x, y, l, s] of [[-14, -8, 3.6, 1], [-9.5, -16, 4, 2], [8, -12, 5, 3], [13.6, -4, 3, 4], [-5.6, -19.6, 2.6, 5], [4.2, -25.6, 3.4, 6]]) ivyU(g, x, y, l, s);
    const fl = .8 + .2 * Math.sin(performance.now() / 150);
    for (const s of [-1, 1]) { glow(g, '255,150,60', s * 3.2, -21.5, 2.6, .55 * fl); g.fillStyle = '#ffb040'; g.fillRect(s * 3.2 - .2, -22, .4, .7); }
  } });
  // A great carved stone head, half swallowed by the jungle: a banded headdress, heavy brows, broad nose, glowing eyes.
  registerLandmark('stonehead', { w: 15, h: 16, draw(g, L) {
    const c = col => L.side ? L.body : col;
    g.fillStyle = c('#45463a'); g.beginPath(); g.roundRect(-6.4, -14.6, 12.8, 14.6, [3.4, 3.4, 1.2, 1.2]); g.fill();
    g.fillStyle = c('#3a3b30'); g.fillRect(-7, -15.6, 14, 3.4); g.fillRect(-7.6, -11.6, 1.4, 6.4); g.fillRect(6.2, -11.6, 1.4, 6.4);   // headdress, ear flaps
    for (const s of [-1, 1]) { g.fillStyle = L.win(L.lit(9)); g.beginPath(); g.ellipse(s * 2.6, -8.8, 1.4, .55, 0, 0, TAU); g.fill(); }
    if (L.side) return;
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let x = -6.4; x < 7; x += 1.6) g.fillRect(x, -15, .7, 2.2);   // the band's carving
    g.fillStyle = '#34352a'; g.fillRect(-5, -10.4, 10, .9);                                   // the brow
    g.fillStyle = '#525344'; g.beginPath(); g.moveTo(-.9, -9.6); g.lineTo(-2, -5.4); g.lineTo(2, -5.4); g.lineTo(.9, -9.6); g.fill();   // the nose
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-1.6, -5.6, 1, .5); g.fillRect(.6, -5.6, 1, .5);
    g.fillStyle = '#2e2f25'; g.fillRect(-3, -4, 6, .6); g.fillStyle = '#3e3f33'; g.fillRect(-2.6, -3.4, 5.2, .9);   // the lips
    g.fillStyle = 'rgba(80,140,60,.55)'; g.beginPath(); g.ellipse(-3, -14.4, 4, 1, 0, 0, TAU); g.ellipse(4, -13.8, 2.6, .8, 0, 0, TAU); g.fill();   // moss on the crown
    for (const [x, y, l, s] of [[-6.6, -14, 7, 1], [5.8, -13.4, 9, 2], [-4.4, -14.6, 3, 3], [1.4, -14.8, 2.4, 4]]) ivyU(g, x, y, l, s);
  } });

  // ---------- the golden skull ----------
  const SKULL = ['..yyyyy..', '.ywwyyyy.', 'ywyyyyyyo', 'yddyyddyo', 'yddyyddyo', 'yyyynyyyo', '.yyyyyyo.', '..tytyt..', '..oyoyo..'];
  const MINI = ['.yyy.', 'yyyyy', 'ydydy', 'yyyyo', '.tyt.'];
  const GOLD = { y: '#f2c440', w: '#fff3c0', o: '#b8862a', d: '#3a2408', n: '#5a3a10', t: '#fff0b0' };
  // A pixel sprite whose top-left is at (x, y); flip mirrors it. Rows of palette keys, '.' clear.
  const rowsAt = (g, rows, pal, x, y, px, flip) => {
    const n = rows[0].length;
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < n; i++) {
      const ch = rows[j][flip ? n - 1 - i : i]; if (ch === '.') continue;
      g.fillStyle = pal[ch]; g.fillRect(x + i * px, y + j * px, px, px);
    }
  };
  // The skull on its pedestal: gold, with a bright band of shine sweeping across every few seconds and a few sparkles.
  function skull(g, x, y, px, t, beat) {                  // x centre, y the skull's bottom
    const w = 9 * px, h = 9 * px, x0 = Math.round(x - w / 2), y0 = Math.round(y - h), p = .5 + .5 * Math.sin(t / 900);
    glow(g, '255,205,90', x, y - h / 2, px * (12 + 3 * p + 4 * beat), .35 + .2 * p + .25 * beat);
    rowsAt(g, SKULL, GOLD, x0, y0, px, false);
    const k = (t / 2600 % 1) * 22 - 6;                    // the shine: a diagonal band crossing it
    g.fillStyle = 'rgba(255,250,220,.8)';
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) if (Math.abs(i + j - k) < .7 && SKULL[j][i] !== '.' && SKULL[j][i] !== 'd') g.fillRect(x0 + i * px, y0 + j * px, px, px);
    for (let s = 0; s < 2; s++) {                         // little four-point sparkles that wink on and off
      const n = Math.floor(t / 450) + s * 7, a = clamp01(Math.sin((t / 450 % 1) * Math.PI) * 1.2);
      const sx = x0 + (hash(n, 1, 41) * 11 - 1) * px, sy = y0 + (hash(n, 2, 41) * 9) * px;
      withAlpha(g, a, () => { g.fillStyle = '#fffbe0'; g.fillRect(sx, sy - px, px, px * 3); g.fillRect(sx - px, sy, px * 3, px); });
    }
  }

  // ---------- the explorer ----------
  // Drawn pixel by pixel, facing right before mirroring. (x, y) = between his feet on the ground. o: face (1 right, -1 left),
  // walk (0-3 frame, or -1 standing), lift (1 = the breath in: chest, shoulders and head rise a pixel), look (1 = head tipped
  // up), arm: 'hang' | 'shade' (hand over the eyes) | 'reach' | 'carry' (holding the skull up), swing (arm swing, px).
  const C = { boot: '#2c1a0e', bootHi: '#4a2e18', pants: '#c4a272', pantsSh: '#9a7a4e', belt: '#3a2414', buckle: '#d0a848',
    shirt: '#eee6d2', shirtSh: '#c6bca4', jacket: '#6e4226', jacketSh: '#4a2a16', jacketHi: '#8c5834', skin: '#d9a06c',
    skinSh: '#b07a4c', stubble: '#8a6040', hair: '#3a2614', eye: '#1a1008', hat: '#7a5030', hatSh: '#583820', hatHi: '#946640',
    band: '#2a1a0e', strap: '#a08a5a', bag: '#8a744a' };
  const WALK = [[2, 0, -2, 0, 0], [1, 0, 0, 2, 1], [-2, 0, 2, 0, 0], [0, 2, -1, 0, 1]];   // front dx, lift, back dx, lift, bob
  function man(g, x, y, px, o) {
    const f = o.face, X = Math.round(x), Y = Math.round(y);
    const R = (cx, cy, w, h, col) => { g.fillStyle = col; g.fillRect(X + (f > 0 ? cx : -cx - w) * px, Y - (cy + h) * px, w * px, h * px); };
    const line = (x0, y0, x1, y1, w, col) => {           // a limb: a 2-wide run of cells from one point to another
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) R(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, 1, col);
    };
    const [fd, fl, bd, bl, bob] = o.walk >= 0 ? WALK[o.walk] : [0, 0, 0, 0, 0], U = o.walk >= 0 ? bob : o.lift, lk = o.look;
    const leg = (hx, dx, lift, pc, bc) => {
      line(hx, 9 + U, hx + dx, 2 + lift, 2, pc);
      R(hx + dx, lift, 2, 2, bc); R(hx + dx + 2, lift, 1, 1, bc); R(hx + dx, lift + 1, 1, 1, C.bootHi);
    };
    const swing = o.walk >= 0 ? [-2, 0, 2, 0][o.walk] : 0;
    // the far arm and leg first, in shadow
    leg(-2, bd, bl, C.pantsSh, C.boot);
    line(-1, 17 + U, -1 - swing, 12 + U, 2, C.jacketSh); R(-1 - swing, 11 + U, 2, 1, C.skinSh);
    R(-5, 9 + U, 2, 3, C.bag); R(-5, 11 + U, 2, 1, C.strap);  // the satchel at his hip
    leg(0, fd, fl, C.pants, C.boot);
    R(-3, 10 + U, 7, 1, C.belt); R(1, 10 + U, 1, 1, C.buckle);
    R(-3, 11 + U, 7, 8, C.jacket); R(-3, 11 + U, 1, 8, C.jacketSh);                          // the open jacket
    R(1, 12 + U, 2, 7, C.shirt); R(1, 12 + U, 1, 2, C.shirtSh); R(0, 18 + U, 3, 1, C.shirt);  // the shirt, open at the collar
    R(3, 14 + U, 1, 5, C.jacketHi);                                                          // the front lapel
    line(-3, 18 + U, 2, 12 + U, 1, C.strap);                                                  // the satchel strap across his chest
    R(-1, 19 + U, 2, 1, C.skinSh);                                                            // neck
    R(-2, 20 + U, 4, 5, C.skin); R(-2, 20 + U, 1, 1, C.skinSh); R(0, 20 + U, 2, 1, C.stubble);   // head and jaw
    R(-2, 21 + U, 1, 4, C.hair); R(-1, 22 + U, 1, 1, C.skinSh);                               // hair at the back, ear
    R(2, 22 + U + lk, 1, 1, C.skin); R(1, 23 + U + lk, 1, 1, C.eye);                          // nose and eye (higher when looking up)
    if (!lk) R(1, 24 + U, 1, 1, C.hair);                                                      // the brow
    if (lk) { R(-4, 25 + U, 4, 1, C.hatSh); R(0, 26 + U, 4, 1, C.hat); }                       // the brim, tipped up at the front
    else { R(-4, 25 + U, 8, 1, C.hat); R(-4, 25 + U, 2, 1, C.hatSh); }
    R(-2, 26 + U, 5, 2, C.hat); R(-2, 26 + U, 5, 1, C.band); R(-1, 28 + U, 3, 1, C.hat); R(1, 27 + U, 1, 1, C.hatHi);
    const arm = o.arm;                                                                        // the near arm, last
    if (arm === 'shade') { line(0, 17 + U, 2, 23 + U, 2, C.jacket); R(2, 24 + U, 3, 1, C.skin); }   // hand flat over the eyes
    else if (arm === 'reach') { line(0, 17 + U, 4, 17 + U, 2, C.jacket); R(5, 16 + U, 2, 2, C.skin); }
    else if (arm === 'carry') {
      line(0, 17 + U, 1, 13 + U, 2, C.jacket); line(1, 13 + U, 3, 14 + U, 2, C.jacket); R(4, 14 + U, 2, 2, C.skin);
      const sx = f > 0 ? X + 3 * px : X - 8 * px; rowsAt(g, MINI, GOLD, sx, Y - 21 * px - U * px, px, f < 0);
      glow(g, '255,205,90', sx + 2.5 * px, Y - 18.5 * px, px * 7, .3 + .1 * Math.sin(performance.now() / 300));
    } else { line(0, 17 + U, swing, 12 + U, 2, C.jacket); R(swing, 11 + U, 2, 1, C.skin); }
  }

  // ---------- state ----------
  const st = { list: [], skullB: null, fk: '', far: null, falls: [], vk: '', vines: null, flies: null, stone: null, sk: 0,
    ex: { ph: 'away', at: 'street', x: 0, face: 1, q: [], t0: 0, until: 0, alpha: 0, carry: false, heistAt: 0, walk: 0, b: null, win: null, last: null },
    ped: { s: 'up', t0: 0 }, skullOn: true, lastT: -1 };
  const ex = st.ex, ped = st.ped, M = new DOMMatrix();   // M: the stone pattern's offset, reused every tier
  const exPx = E => Math.max(1, Math.round(E.unit * .36));
  const topY = (b, E) => E.GY - b.hU * E.unit;
  const shrineW = (b, E) => Math.min(b.tiers[b.tiers.length - 1].w * .8, 9) * E.unit;
  // The skull tower: a plain tower near the middle of what's on screen, wide enough on top for the shrine.
  function pickSkull(list, E) {
    const plain = list.filter(b => !b.lm), wide = plain.filter(b => b.tiers[b.tiers.length - 1].w >= 6);
    const pool = wide.length ? wide : plain;
    const score = b => { const x = E.toScreen(b.cx) / E.W; return b.hU * (x > .25 && x < .8 ? 2 : x > 0 && x < 1 ? 1 : .2); };
    return pool.reduce((a, b) => score(b) > score(a) ? b : a, pool[0]) || null;
  }
  const onScreen = (b, E) => { const x = E.toScreen(b.cx); return x > E.W * .06 && x < E.W * .94; };
  function pickBuilding(E) {
    const ok = st.list.filter(b => b.door && b !== st.skullB && b !== ex.last);
    const seen = ok.filter(b => onScreen(b, E));
    const pool = seen.length ? seen : ok;
    return pool[Math.floor(Math.random() * pool.length)] || st.skullB;
  }
  const R01 = (a, b) => a + (b - a) * Math.random();
  // What he does next: a look at a building, a visit inside (sometimes waving from a window), or, once two to three minutes
  // have passed, the heist.
  function plan(E) {
    const t = E.t, q = ex.q;
    if (st.skullB && st.skullOn && ped.s === 'up' && t >= ex.heistAt) {
      const b = st.skullB; ex.b = b;
      q.push({ ph: 'walk', tx: b.cx }, { ph: 'look', dur: 5500, shade: true }, { ph: 'fade', dir: -1, at: 'street', dur: 700 }, { ph: 'inside', dur: 4500 },
        { ph: 'fade', dir: 1, at: 'top', dur: 700 }, { ph: 'top', dur: 2200 }, { ph: 'reach', dur: 1300, steal: true }, { ph: 'top', dur: 4800 },
        { ph: 'fade', dir: -1, at: 'top', dur: 700 }, { ph: 'inside', dur: 3500 }, { ph: 'fade', dir: 1, at: 'street', dur: 700 }, { ph: 'idle', dur: 1200 }, { ph: 'exit' });
      return;
    }
    const b = pickBuilding(E); ex.b = b; ex.last = b;
    q.push({ ph: 'walk', tx: b.cx });                   // to its door
    const roll = Math.random();
    if (roll < .4) q.push({ ph: 'look', dur: R01(3000, 6500), shade: Math.random() < .4 }, { ph: 'idle', dur: R01(1200, 3000) });
    else {
      q.push({ ph: 'look', dur: R01(1800, 3500), shade: Math.random() < .3 }, { ph: 'fade', dir: -1, at: 'street', dur: 700 }, { ph: 'inside', dur: R01(2500, 6000) });
      if (roll < .85) {
        ex.win = { dx: (Math.random() < .5 ? -1 : 1) * R01(.12, .28), yf: R01(.3, .7), face: Math.random() < .5 ? 1 : -1 };
        q.push({ ph: 'fade', dir: 1, at: 'window', dur: 500 }, { ph: 'window', dur: R01(3500, 7000) }, { ph: 'fade', dir: -1, at: 'window', dur: 500 }, { ph: 'inside', dur: R01(1500, 3000) });
      }
      q.push({ ph: 'fade', dir: 1, at: 'street', dur: 700 }, { ph: 'idle', dur: R01(1000, 2500) });
    }
  }
  function step(E) {
    if (st.lastT === E.t) return; st.lastT = E.t;
    const t = E.t, dt = E.dt, px = exPx(E), W = E.W;
    if (ped.s === 'sinking' && t - ped.t0 > 4000) { ped.s = 'down'; ped.t0 = t; }
    else if (ped.s === 'down' && t - ped.t0 > 120000) { ped.s = 'rising'; ped.t0 = t; st.skullOn = true; }
    else if (ped.s === 'rising' && t - ped.t0 > 4000) { ped.s = 'up'; if (ex.ph === 'away') ex.until = t + R01(3000, 8000); }
    if (ex.ph === 'away') {
      if (!ex.until) ex.until = t + R01(2000, 5000);
      if (t < ex.until || ped.s !== 'up' || !st.list.length) return;
      const side = Math.random() < .5 ? -1 : 1;           // in from one edge of the screen
      ex.x = (side < 0 ? -px * 12 : W + px * 12) + E.off; ex.face = -side; ex.carry = false; ex.alpha = 1; ex.at = 'street';
      ex.heistAt = t + R01(120000, 180000); ex.q = []; ex.ph = 'go';
    }
    if (!ex.q.length) plan(E);
    const s = ex.q[0];
    if (s.t0 === undefined) s.t0 = t;
    const done = s.dur !== undefined && t - s.t0 >= s.dur;
    ex.ph = s.ph;
    if (s.ph === 'walk' || s.ph === 'exit') {
      const v = px * 15, sx = E.toScreen(ex.x);
      let tx = s.tx;
      if (s.ph === 'exit') { if (s.dir === undefined) s.dir = sx < W / 2 ? -1 : 1; tx = ex.x + s.dir * W; }
      const d = tx - ex.x, mv = v * dt;
      if (Math.abs(d) > 1e-3) ex.face = Math.sign(d);
      ex.walk += mv / (px * 3.5);
      if (s.ph === 'exit' && (sx < -px * 14 || sx > W + px * 14)) { ex.q = []; ex.ph = 'away'; ex.until = ped.s === 'up' ? t + R01(3000, 8000) : Infinity; return; }
      if (Math.abs(d) <= mv) { ex.x = tx; ex.q.shift(); } else ex.x += Math.sign(d) * mv;
      return;
    }
    if (s.ph === 'fade') { ex.at = s.at; ex.alpha = clamp01(s.dir > 0 ? (t - s.t0) / s.dur : 1 - (t - s.t0) / s.dur); }
    else if (s.ph === 'inside') ex.alpha = 0;
    else ex.alpha = 1;
    if (s.ph === 'reach' && s.steal && t - s.t0 > s.dur * .6) { s.steal = false; ex.carry = true; st.skullOn = false; ped.s = 'sinking'; ped.t0 = t; }
    if (s.ph === 'idle' && Math.floor((t - s.t0) / 900) % 3 === 1) ex.glance = true; else ex.glance = false;   // a look over his shoulder
    if (done) ex.q.shift();
  }
  // Where and how to draw him this frame.
  function drawExplorer(g, E) {
    if (ex.ph === 'away' || ex.ph === 'inside' || ex.alpha <= 0) return;
    const px = exPx(E), t = E.t, breath = Math.sin(t / 4200 * TAU) > .2 ? 1 : 0;   // about 14 breaths a minute
    const pose = { face: ex.glance ? -ex.face : ex.face, walk: -1, lift: breath, look: 0, arm: ex.carry ? 'carry' : 'hang' };
    if (ex.ph === 'walk' || ex.ph === 'exit') pose.walk = Math.floor(ex.walk) % 4;
    const s = ex.q[0] || {};
    if (ex.ph === 'look') { pose.look = 1; if (s.shade && t - s.t0 > 700) pose.arm = 'shade'; }
    if (ex.ph === 'reach' && !ex.carry) pose.arm = 'reach';
    withAlpha(g, ex.alpha, () => {
      if (ex.at === 'street') man(g, E.toScreen(ex.x), E.GY + px * 3, px, pose);
      else if (ex.at === 'top' && st.skullB) {
        const b = st.skullB, x = E.toScreen(b.cx) - shrineW(b, E) * .28;
        man(g, x, topY(b, E), px, { ...pose, face: ex.carry && ex.ph !== 'reach' ? -1 : 1 });
      } else if (ex.at === 'window' && ex.b && ex.win) {
        const b = ex.b, w0 = b.tiers[0].w * E.unit, wx = E.toScreen(b.cx) + ex.win.dx * w0, ww = 12 * px, wh = 17 * px;
        const wy = Math.min(E.GY - b.tiers[0].h * E.unit * ex.win.yf, E.GY - 38 * px);   // the window's bottom, always above the door
        g.fillStyle = '#1a1a14'; g.fillRect(Math.round(wx - ww / 2 - px), Math.round(wy - wh - px), ww + 2 * px, wh + 2 * px);
        g.fillStyle = lin(g, 0, wy - wh, 0, wy, [[0, '#e8a050'], [1, '#a85a20']]); g.fillRect(Math.round(wx - ww / 2), Math.round(wy - wh), ww, wh);
        g.save(); g.beginPath(); g.rect(Math.round(wx - ww / 2), Math.round(wy - wh), ww, wh); g.clip();
        man(g, wx, wy + 14 * px, px, { ...pose, face: ex.win.face, look: 0, arm: 'hang' });
        g.restore();
        g.fillStyle = '#4a4a3c'; g.fillRect(Math.round(wx - ww / 2 - 2 * px), Math.round(wy), ww + 4 * px, px * 2);   // the sill
      }
    });
  }

  // ---------- scenery ----------
  // Behind the city, two screens wide and seamless: misty ranges, a far stepped pyramid, cliffs with waterfalls and the
  // canopy. Drawn once per size; the waterfalls move on top.
  function far(W, GY) {
    const d = dpr(), w = W * 2; st.falls = [];
    return mk(w * d, GY * d, g => {
      g.scale(d, d);
      for (const o of [-w, 0, w]) for (let i = 0; i < 9; i++) {   // misty mountains, each again one tile over so the seam doesn't show
        const px = hash(i, 1, 51) * w + o, ph = GY * (.25 + .2 * hash(i, 2, 51)), hw = ph * (.8 + .6 * hash(i, 3, 51)), top = GY * .8 - ph;
        if (px + hw < 0 || px - hw > w) continue;
        g.fillStyle = lin(g, 0, top, 0, GY * .8, [[0, '#1d4a40'], [1, '#0f2a24']]);
        g.beginPath(); g.moveTo(px - hw, GY * .8);
        for (let k = 0; k <= 8; k++) { const f = k / 8, x = px - hw + 2 * hw * f, y = top + ph * Math.abs(f - .5) * 2 + (hash(i, k, 52) - .5) * ph * .12; g.lineTo(x, y); }
        g.lineTo(px + hw, GY * .8); g.fill();
      }
      for (const o of [-w, 0, w]) {                        // the far pyramid on its hill, a faint light at the top
        const x = w * .62 + o, base = GY * .74;
        if (x < -GY || x > w + GY) continue;
        g.fillStyle = '#123630';
        for (let k = 0; k < 6; k++) { const hw = GY * (.11 - k * .017), h = GY * .022; g.fillRect(x - hw, base - (k + 1) * h, hw * 2, h + .5); }
        g.fillStyle = 'rgba(255,170,90,.4)'; g.fillRect(x - 2, base - GY * .138, 4, 4);
      }
      g.fillStyle = lin(g, 0, GY * .55, 0, GY * .8, [[0, 'rgba(160,210,190,0)'], [1, 'rgba(160,210,190,.18)']]); g.fillRect(0, GY * .55, w, GY * .25);
      for (let i = 0; i < 3; i++) {                        // cliffs, each with a waterfall pouring down a cleft
        const cx = w * (.18 + i * .33) + hash(i, 4, 53) * w * .08, cw = GY * (.22 + .1 * hash(i, 5, 53)), ct = GY * (.5 + .1 * hash(i, 6, 53));
        const edge = [[cx - cw, GY], [cx - cw * .8, ct + GY * .05], [cx - cw * .3, ct], [cx + cw * .25, ct + GY * .02], [cx + cw * .9, ct + GY * .07], [cx + cw, GY]];
        g.fillStyle = lin(g, 0, ct, 0, GY, [[0, '#24483e'], [1, '#0f2a24']]); g.beginPath(); edge.forEach(p => g.lineTo(...p)); g.fill();
        st.falls.push({ x: cx, y0: ct + 2, w: cw * .13 });
      }
      const crowns = (y, r, col, seed) => {               // a row of rounded tree crowns, tall ones poking out
        g.fillStyle = col;
        for (let x = -r, i = 0; x < w + r; i++, x += r * (.7 + .5 * hash(i, 1, seed))) {
          const rr = r * (.7 + .7 * hash(i, 2, seed)), yy = y - (hash(i, 3, seed) < .15 ? r * 1.6 : 0);
          g.beginPath(); g.arc(x, yy, rr, 0, TAU); g.arc(x + rr * .6, yy + rr * .3, rr * .7, 0, TAU); g.fill();
          if (yy < y) g.fillRect(x - rr * .08, yy, rr * .16, y - yy + rr);
        }
        g.fillRect(0, y, w, GY - y);
      };
      crowns(GY * .8, GY * .05, '#0b2a20', 54);
      crowns(GY * .9, GY * .045, '#061c15', 55);
      for (const f of st.falls) f.y1 = GY * .73;            // they vanish into the canopy
    });
  }
  // Framing foliage: palm and broad leaves hanging into both top corners, and a few long vines. Drawn once per size.
  function vines(W, H) {
    const d = dpr(), s = Math.min(W, H);
    return mk(W * d, H * d, g => {
      g.scale(d, d);
      const frond = (x, y, ang, len, col) => {           // a drooping palm frond: a curved rib with leaflets down both sides
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1, len * .015);
        const pt = f => [x + Math.cos(ang) * len * f, y + Math.sin(ang) * len * f + len * .35 * f * f];
        g.beginPath(); g.moveTo(x, y); for (let f = .05; f <= 1; f += .05) g.lineTo(...pt(f)); g.stroke();
        for (let f = .1; f < 1; f += .06) {
          const [a, b] = pt(f), [c, e] = pt(f + .02), nx = -(e - b), ny = c - a, n = Math.hypot(nx, ny) || 1, l = len * .2 * Math.sin(f * Math.PI);
          for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo(a + nx / n * l * .6 * sd + len * .02, b + ny / n * l * .6 * sd + l * .4, a + nx / n * l * sd * .4, b + ny / n * l * sd + l * .7); g.lineTo(c, e); g.fill(); }
        }
      };
      for (const [x, ang, len, col] of [[-s * .02, .35, s * .45, '#05140c'], [-s * .03, .9, s * .38, '#071a10'], [s * .05, .1, s * .3, '#0a2214']]) frond(x, -s * .02, ang, len, col);
      for (const [x, ang, len, col] of [[W + s * .02, Math.PI - .35, s * .45, '#05140c'], [W + s * .03, Math.PI - .95, s * .36, '#071a10'], [W - s * .04, Math.PI - .15, s * .28, '#0a2214']]) frond(x, -s * .02, ang, len, col);
      for (let i = 0; i < 7; i++) {                        // long vines hanging from the canopy above
        const x = i < 4 ? s * (.04 + i * .06) : W - s * (.04 + (i - 4) * .07), len = H * (.18 + .25 * hash(i, 1, 56));
        g.strokeStyle = '#08180e'; g.lineWidth = Math.max(1, s * .003); g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y < len; y += 6) g.lineTo(x + Math.sin(y / 30 + i) * s * .01, y); g.stroke();
        g.fillStyle = '#0c2414';
        for (let y = 10; y < len; y += s * .018) { const xx = x + Math.sin(y / 30 + i) * s * .01; g.beginPath(); g.ellipse(xx + (y % 2 ? 4 : -4), y, s * .008, s * .004, y % 2 ? .6 : -.6, 0, TAU); g.fill(); }
      }
    });
  }
  // The stone texture: courses of blocks with offset joints, and a few darker stones. A pattern tile, made once per scale.
  function stonePattern(g, u) {
    const tw = Math.round(u * 6), th = Math.round(u * 3.2);
    const c = mk(tw, th, x => {
      x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, 0, tw, 1); x.fillRect(0, th / 2, tw, 1);
      x.fillRect(Math.round(tw * .25), 0, 1, th / 2); x.fillRect(Math.round(tw * .75), 0, 1, th / 2); x.fillRect(0, th / 2, 1, th / 2); x.fillRect(Math.round(tw * .5), th / 2, 1, th / 2);
      x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(Math.round(tw * .25) + 1, 1, Math.round(tw * .5) - 1, th / 2 - 1);
      x.fillStyle = 'rgba(255,255,230,.05)'; x.fillRect(1, th / 2 + 1, Math.round(tw * .5) - 1, 1);
    });
    return g.createPattern(c, 'repeat');
  }

  // ---------- wildlife ----------
  // Macaws (scarlet and blue-and-gold) cross the sky in small flocks, taking off on a big bass hit; a monkey swings across
  // the top on the hanging vines now and then; blue butterflies flutter low, glowing with the music; jaguar eyes blink in the
  // far canopy.
  const MACAW = [['....bb....', '...ybb....', '..rrrrrwk.', 'rrrrrrr...', 'r.........'], ['..........', '..........', '..rrrrrwk.', 'rrrybbr...', 'r...bb....']];
  const MAC_PAL = [{ r: '#e8342a', b: '#2a6ad8', y: '#ffd23a', w: '#f4efe0', k: '#2a2a2a' }, { r: '#2a8ad8', b: '#1a4aa8', y: '#ffd23a', w: '#f4efe0', k: '#2a2a2a' }];
  const MONKEY = [['.....a...', '.....a...', '...hha...', '..hhffe..', '..hhff...', '...bbb...', '..bbbbb..', '..bbbb.t.', '..b..b.t.', '.......t.'],
    ['..a..a...', '..a..a...', '..ahha...', '..hhffe..', '..hhff...', '...bbb...', '..bbbbb..', '..bbbb.t.', '..b..b.t.', '.......t.']];
  const MON_PAL = { a: '#5a3a22', h: '#5a3a22', f: '#c8a07a', e: '#1a1008', b: '#6a4428', t: '#5a3a22' };
  function birds(g, E) {
    const { W, GY, t, dt } = E, px = Math.max(1, Math.round(E.unit * .42));
    const beat = st.prevBF < .9 && E.bassFlash >= .9; st.prevBF = E.bassFlash;
    if (!st.nextFlock) st.nextFlock = t + 8000;
    if (!st.flock && t > st.nextFlock && (beat || t > st.nextFlock + 20000)) {
      const dir = Math.random() < .5 ? 1 : -1;
      st.flock = { dir, x: dir > 0 ? -W * .05 : W * 1.05, y: GY * (.25 + .25 * Math.random()), v: W / (9 + 4 * Math.random()), n: 3 + Math.floor(Math.random() * 3), ph: Math.random() * 9 };
      st.nextFlock = t + 25000 + 25000 * Math.random();
    }
    const f = st.flock; if (!f) return;
    f.x += f.dir * f.v * dt;
    for (let i = 0; i < f.n; i++) {                       // a loose V, each bird bobbing and flapping on its own beat
      const x = f.x - f.dir * i * px * 15, y = f.y + Math.sin(t / 380 + i * 1.3 + f.ph) * px * 3 + (i % 2 ? px * 7 : 0) + i * px * 2;
      rowsAt(g, MACAW[Math.floor(t / 130 + i * .5) % 2], MAC_PAL[i % 2], Math.round(x), Math.round(y), px, f.dir < 0);
    }
    if (f.x < -W * .5 || f.x > W * 1.5) st.flock = null;
  }
  function monkey(g, E) {                                 // swinging hand over hand from vine to vine, like a pendulum
    const { W, GY, t } = E, px = Math.max(1, Math.round(E.unit * .5)), L = GY * .2, th = .7, gap = 2 * L * Math.sin(th);
    if (!st.nextMonkey) st.nextMonkey = t + 20000 + 20000 * Math.random();
    if (!st.mk && t > st.nextMonkey) { const dir = Math.random() < .5 ? 1 : -1; st.mk = { dir, t0: t, x0: dir > 0 ? -gap : W + gap }; }
    const m = st.mk; if (!m) return;
    const p = (t - m.t0) / 1150, k = Math.floor(p), sw = p - k, ease = (1 - Math.cos(Math.PI * sw)) / 2;
    const ax = m.x0 + m.dir * (k + .5) * gap, a = m.dir * (-th + 2 * th * ease), hx = ax + Math.sin(a) * L, hy = Math.cos(a) * L;
    g.strokeStyle = '#0c2412'; g.lineWidth = Math.max(1, px * .7); g.beginPath(); g.moveTo(ax, 0); g.lineTo(hx, hy); g.stroke();
    const sp = MONKEY[sw > .9 || sw < .1 ? 1 : 0];        // both arms out as he lets go and catches the next vine
    rowsAt(g, sp, MON_PAL, Math.round(hx - (m.dir > 0 ? 5.5 : 3.5) * px), Math.round(hy), px, m.dir < 0);
    if (hx < -gap * 2 || hx > W + gap * 2) { st.mk = null; st.nextMonkey = t + 40000 + 40000 * Math.random(); }
  }
  function butterflies(g, E) {
    const { W, GY, H, t, dt, unit: u } = E;
    if (!st.bf) st.bf = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * W, y: GY - u * (2 + 10 * Math.random()), ph: Math.random() * 9, k: i * 5 }));
    for (const b of st.bf) {
      b.x += (Math.cos(t / 2700 + b.ph) * u * 2 - E.scrollV) * dt; b.x = (b.x % (W + 40) + W + 40) % (W + 40) - 20;
      const y = b.y + Math.sin(t / 1300 + b.ph) * u * 2, lv = E.spectrum[b.k % E.spectrum.length] || 0;
      const fl = Math.abs(Math.sin(t / (85 - 30 * lv) + b.ph)), r = u;   // wings beat faster with the music
      glow(g, '90,170,255', b.x, y, u * (2 + 2 * lv), .25 + .35 * lv);
      g.fillStyle = '#3aa0ff';
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(b.x + sd * r * fl * .55, y, r * fl * .55 + .5, r * .7, sd * .3, 0, TAU); g.fill(); }
      g.fillStyle = '#10202a'; g.fillRect(b.x - .5, y - r * .5, 1, r);
    }
  }
  function jaguar(g, E, ox, w) {                          // a pair of eyes in the far canopy, blinking, then gone
    const t = E.t;
    if (!st.nextJag) st.nextJag = t + 15000;
    if (!st.jag && t > st.nextJag) st.jag = { x: Math.random() * w, y: E.GY * (.84 + .05 * Math.random()), t0: t };
    const j = st.jag; if (!j) return;
    const age = t - j.t0, a = clamp01(Math.min(age / 600, (6000 - age) / 600)), blink = (age > 1800 && age < 1950) || (age > 4100 && age < 4250);
    if (age > 6000) { st.jag = null; st.nextJag = t + 20000 + 25000 * Math.random(); return; }
    const x = ((j.x - ox) % w + w) % w, r = Math.max(1, E.unit * .22);
    if (x > E.W) return;
    for (const sd of [-1, 1]) {
      glow(g, '220,255,90', x + sd * r * 2.2, j.y, r * 4, .4 * a);
      g.fillStyle = `rgba(225,255,120,${a})`; g.fillRect(x + sd * r * 2.2 - r, j.y - (blink ? r * .2 : r * .6), r * 2, blink ? r * .4 : r * 1.2);
    }
  }

  registerTheme('jungle', { name: 'Jungle City',
    kit: { styles: ['temple', 'tall', 'temple', 'pairs', 'temple'], roofs: [['ziggurat', 4], null, ['ziggurat', 6], null, ['ziggurat', 3]],
      tall: .3, shrink: .8, w0: 7, gaps: [.5, 1.5], setbacks: true, landmarks: ['steptemple', 'stonehead'], lmChance: .25, lmScale: 1.6 },
    minF: .2, maxF: .62, noBack: true, planes: false, roofLights: false, searchlights: false,
    sky: [[0, '#020c0a'], [.55, '#0a2620'], [1, '#1b4436']], skyToGround: true,
    stars: true, moon: true, cloud: 'rgba(120,170,150,.1)', fogRGB: '150,190,170', rain: 'rgba(170,210,190,.4)',
    body: '#2f362d', side: '#232a22', top: '#3c4436',
    win: c => ({ h: 22 + c.h / 360 * 22, s: 85, m: c.m }),   // torchlight, still swelling with the music
    decorate(b, r) { b.body = STONE[Math.floor(r() * STONE.length)]; b.door = r() < .5; },
    afterLayout(list, r, E) {
      st.list = list; st.skullB = pickSkull(list, E);
      if (st.skullB) { st.skullB.roof = null; st.skullB.blink = false; st.skullB.door = true; }
      if (ex.ph !== 'away') { ex.ph = 'away'; ex.q = []; ex.until = 0; ex.carry = false; }   // the city changed under him: start over
      if (!st.skullOn && ped.s === 'up') st.skullOn = true;
    },
    explorerState: () => ({ ph: ex.ph, at: ex.at, carry: ex.carry, ped: ped.s, skull: st.skullOn, heistAt: ex.heistAt }),   // for the tests
    drawFar(g, E) {
      const { W, GY, t } = E, d = dpr(), k = `${W},${GY},${d}`;
      if (st.fk !== k) { st.fk = k; st.far = far(W, GY); }
      const w = W * 2, ox = ((E.travel * .3) % w + w) % w;
      g.drawImage(st.far, -ox, 0, w, GY); g.drawImage(st.far, w - ox, 0, w, GY);
      const lvl = .6 + .4 * (E.bands ? (E.bands[2].level + E.bands[3].level) / 2 : 0);
      for (const f of st.falls) for (const o of [-ox, w - ox]) {   // the waterfalls: streaks pouring down, mist where they land
        const x = f.x + o; if (x < -f.w * 4 || x > W + f.w * 4) continue;
        g.fillStyle = lin(g, 0, f.y0, 0, f.y1, [[0, `rgba(225,245,240,${.5 * lvl})`], [1, `rgba(200,235,225,${.22 * lvl})`]]);   // a sheet that spreads a little as it falls
        g.beginPath(); g.moveTo(x - f.w * .35, f.y0); g.lineTo(x + f.w * .35, f.y0); g.lineTo(x + f.w * .6, f.y1); g.lineTo(x - f.w * .6, f.y1); g.fill();
        g.strokeStyle = `rgba(245,255,252,${.55 * lvl})`; g.lineWidth = 1.5; g.setLineDash([f.w * 1.2, f.w * 1.6]);
        for (let i = 0; i < 5; i++) { const fx = (i / 4 - .5) * .7; g.lineDashOffset = -((t / (7 + i * 2)) % (f.w * 2.8)); g.beginPath(); g.moveTo(x + fx * f.w, f.y0); g.lineTo(x + fx * f.w * 1.7, f.y1); g.stroke(); }
        g.setLineDash([]);
        glow(g, '210,240,232', x, f.y1, f.w * 3.5, .45 * lvl);   // the spray where it lands
      }
      jaguar(g, E, ox, w);
    },
    drawBehind(g, E) { if (!E.widget) birds(g, E); },     // in front of the hills, behind the towers
    drawFront(g, E) {                                     // low mist drifting between the towers
      const { W, GY, t, unit: u } = E;
      for (let i = 0; i < 5; i++) {
        const x = ((t / 90 * (.5 + hash(i, 1, 57)) + hash(i, 2, 57) * W * 1.5) % (W * 1.5)) - W * .25, wd = W * (.25 + .15 * hash(i, 3, 57));
        withAlpha(g, .1, () => g.drawImage(sprite('170,210,190'), x - wd / 2, GY - u * (2 + 3 * hash(i, 4, 57)), wd, u * 5));
      }
    },
    drawExtras(g, b, cx, tip, E) {                        // stone courses, a carved frieze, ivy, moss, a torchlit doorway
      if (b.lm) return;
      const u = E.unit, GY = E.GY, px = exPx(E);
      if (st.sk !== u + ',' + GY) { st.sk = u + ',' + GY; st.stone = stonePattern(g, u); st.moss = lin(g, 0, GY - u * 5, 0, GY, [[0, 'rgba(60,110,50,0)'], [1, 'rgba(60,110,50,.45)']]); }
      let y = GY;
      for (const tr of b.tiers) {
        const tw = tr.w * u, th = tr.h * u, x0 = cx - tw / 2;
        M.e = x0; M.f = y; st.stone.setTransform(M); g.fillStyle = st.stone; g.fillRect(x0, y - th, tw, th);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0, y - th, tw, Math.max(1, u * .3));                 // the shadow under each ledge
        y -= th;
      }
      const t0 = b.tiers[0], w0 = t0.w * u, x0 = cx - w0 / 2, fy = GY - t0.h * u + u * 1.4;
      g.fillStyle = 'rgba(0,0,0,.28)';                    // the frieze: a band of stepped frets under the first ledge
      for (let x = x0 + u * .5, i = 0; x < x0 + w0 - u; x += u * 2, i++) { g.fillRect(x, fy, u * 1.4, u * .3); g.fillRect(x + (i % 2 ? u : 0), fy, u * .3, u); g.fillRect(x, fy + u * .7, u * 1.4, u * .3); }
      g.fillStyle = st.moss; g.fillRect(x0, GY - u * 5, w0, u * 5);   // moss creeping up
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1;   // a crack or two
      for (let k = 0; k < 1 + (b.id % 2); k++) {
        let x = x0 + w0 * (.2 + .6 * hash(b.id, k, 58)), yy = GY - t0.h * u * (.4 + .5 * hash(b.id, k, 59));
        g.beginPath(); g.moveTo(x, yy); for (let s = 0; s < 5; s++) { x += (hash(b.id, s + k * 9, 60) - .5) * u * 1.6; yy += u * (.6 + .6 * hash(b.id, s, 61)); g.lineTo(x, yy); } g.stroke();
      }
      y = GY;                                             // ivy draping from the ledges: a stem, paired leaves, now and then an orchid
      for (let ti = 0; ti < b.tiers.length; ti++) {
        const tr = b.tiers[ti], tw = tr.w * u, th = tr.h * u, top = y - th, n = Math.max(1, Math.round(tw / (u * 3)));
        for (let i = 0; i < n; i++) {
          const hs = hash(b.id, ti * 10 + i, 62); if (hs < .45) continue;
          const sx = cx - tw / 2 + tw * (i + .25 + .5 * hash(b.id, i, 63)) / n, len = Math.min(th * .9, u * (2.5 + 8 * hash(b.id, ti * 10 + i, 64)));
          const at = k => sx + Math.sin(k / u * .9 + i) * u * .3;
          g.strokeStyle = '#123a18'; g.lineWidth = Math.max(1, u * .12); g.beginPath(); g.moveTo(at(0), top);
          for (let k = u; k <= len; k += u) g.lineTo(at(k), top + k);
          g.stroke();
          for (let k = u * .3, j = 0; k < len; k += u * .7, j++) {
            const sd = j % 2 ? 1 : -1, r = u * (.42 - .18 * k / len);
            g.fillStyle = LEAF[(j + i) % 4]; g.beginPath(); g.ellipse(at(k) + sd * r * .8, top + k, r, r * .62, sd * .5, 0, TAU); g.fill();
          }
          if (hs > .88) { const ox = at(len * .5) + u * .45, oy = top + len * .5; g.fillStyle = '#f08ac8'; g.beginPath(); g.arc(ox, oy, u * .3, 0, TAU); g.fill(); g.fillStyle = '#fff2a0'; g.fillRect(ox - u * .06, oy - u * .06, u * .12, u * .12); }
        }
        y = top;
      }
      if (!b.door) return;                                // the skull tower always has one
      const dw = 10 * px, dh = Math.min(32 * px, t0.h * u * .7), dx = cx - dw / 2;   // the doorway he walks through
      g.fillStyle = '#4a4a3c'; g.fillRect(dx - px * 2, GY - dh - px * 3, dw + px * 4, px * 3);
      g.fillStyle = '#080605'; g.fillRect(dx, GY - dh, dw, dh);
      const warm = ex.b === b && ex.at === 'street' && ex.ph === 'fade' ? ex.alpha : 0;   // light spills out as he comes and goes
      g.fillStyle = lin(g, 0, GY - dh, 0, GY, [[0, 'rgba(255,150,60,0)'], [1, `rgba(255,150,60,${.25 + .3 * warm})`]]); g.fillRect(dx, GY - dh, dw, dh);
      if (!E.widget) for (const s of [-1, 1]) {           // torches either side, flaring with the music
        const tx = cx + s * (dw / 2 + px * 3), ty = GY - dh * .72, fl = .75 + .25 * Math.sin(E.t / 110 + b.id * 3 + s), lv = b.level;
        g.fillStyle = '#2a1a0e'; g.fillRect(tx - px / 2, ty, px, px * 4);
        glow(g, '255,150,60', tx, ty - px * 2, px * (6 + 6 * lv), (.3 + .45 * lv) * fl);
        g.fillStyle = '#ff9a30'; g.fillRect(tx - px, ty - px * (2 + 2 * fl + 2 * lv), px * 2, px * (2 + 2 * fl + 2 * lv));
        g.fillStyle = '#ffe080'; g.fillRect(tx - px / 2, ty - px * (1 + fl + lv), px, px * (1 + fl + lv));
      }
      if (b !== st.skullB) return;
      // The shrine on the skull tower: two carved columns under a stepped lintel, the pedestal and its skull between them.
      const ty = tip[1], sw = shrineW(b, E), colW = u * 1.1, sh = u * 9.5;   // tall enough for him to stand inside
      g.fillStyle = '#3e4134';
      for (const s of [-1, 1]) g.fillRect(cx + s * sw / 2 - colW / 2, ty - sh, colW, sh);
      g.fillRect(cx - sw / 2 - u, ty - sh - u * 1.2, sw + u * 2, u * 1.2); g.fillRect(cx - sw / 2, ty - sh - u * 2.2, sw, u); g.fillRect(cx - sw * .3, ty - sh - u * 3, sw * .6, u * .8);
      g.fillStyle = 'rgba(0,0,0,.3)'; for (const s of [-1, 1]) for (let k = 1; k < 6; k++) g.fillRect(cx + s * sw / 2 - colW / 2, ty - sh * k / 6, colW, 1);
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { g.fillStyle = LEAF[k % 4]; g.fillRect(cx + s * sw / 2 + Math.sin(k) * u * .3, ty - sh + k * u * .6, u * .5, u * .4); }
      const pw = u * 1.8, ph = u * 3, p = ped.s === 'sinking' ? clamp01((E.t - ped.t0) / 4000) : ped.s === 'down' ? 1 : ped.s === 'rising' ? 1 - clamp01((E.t - ped.t0) / 4000) : 0;
      if (p >= 1) return;
      g.save(); g.beginPath(); g.rect(cx - sw, ty - sh * 2, sw * 2, sh * 2); g.clip();   // it sinks into the roof, fading as it goes
      withAlpha(g, 1 - p, () => {
        const py = ty + ph * p;
        g.fillStyle = '#55584a'; g.fillRect(cx - pw / 2, py - ph, pw, ph); g.fillRect(cx - pw * .7, py - ph - u * .4, pw * 1.4, u * .4);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx + pw * .2, py - ph, pw * .3, ph);
        if (st.skullOn) skull(g, cx, py - ph - u * .4, px, E.t, E.bassFlash);
      });
      g.restore();
    },
    ground: { h: .2, draw(g, E) {                          // the stone causeway, ferns and glowing mushrooms, big leaves in front
      const { W, H, GY, unit: u, travel, t } = E, gh = H - GY, path = gh * .42;
      g.fillStyle = lin(g, 0, GY, 0, H, [[0, '#1c1e14'], [1, '#070a06']]); g.fillRect(0, GY, W, gh);
      g.fillStyle = '#3a3a2e'; g.fillRect(0, GY, W, path);
      const sw = u * 4;                                    // flagstones, two rows, scrolling with the town
      for (let row = 0; row < 2; row++) {
        const y = GY + row * path / 2, sh = path / 2, o = row * sw / 2;
        for (let i = Math.floor((travel - o) / sw) - 1; i * sw + o - travel < W + sw; i++) {
          const x = i * sw + o - travel, h = hash(i, row, 65);
          g.fillStyle = `rgb(${68 + h * 14},${70 + h * 12},${56 + h * 8})`; g.fillRect(x + 1, y + 1, sw - 2, sh - 2);
          if (h < .35) { g.fillStyle = 'rgba(70,130,50,.6)'; g.fillRect(x - u * .3, y + sh - u * .4, u * .9, u * .4); }   // moss in the gaps
        }
      }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, GY + path, W, Math.max(1, u * .3));
      const fs = u * 5;                                    // ferns, and here and there glowing mushrooms that pulse with the music
      for (let i = Math.floor(travel / fs) - 1; i * fs - travel < W + fs; i++) {
        const x = i * fs - travel + hash(i, 1, 66) * fs * .6, by = GY + path + gh * (.25 + .3 * hash(i, 2, 66)), len = u * (3 + 3 * hash(i, 3, 66));
        g.strokeStyle = hash(i, 4, 66) < .5 ? '#163a1e' : '#0f2c16'; g.lineWidth = Math.max(1, u * .25);
        for (const a of [-2.4, -1.9, -1.5, -1.2, -.8]) {
          g.beginPath(); g.moveTo(x, by); const ex2 = x + Math.cos(a) * len, ey = by + Math.sin(a) * len;
          g.quadraticCurveTo(x + Math.cos(a) * len * .5, by + Math.sin(a) * len * .7 - u, ex2, ey + u); g.stroke();
        }
        if (hash(i, 5, 66) < .3) {
          const lv = E.spectrum[i % E.spectrum.length] || 0;
          glow(g, '90,255,220', x + u * 1.2, by - u * .3, u * (1.5 + 2 * lv), .3 + .5 * lv);
          g.fillStyle = '#9af8e8'; g.beginPath(); g.arc(x + u * 1.2, by - u * .4, u * .45, Math.PI, 0); g.fill();
        }
      }
      const ls = u * 9;                                    // big dark leaves along the front, a little faster (nearer)
      g.fillStyle = '#030a06';
      for (let i = Math.floor(travel * 1.3 / ls) - 1; i * ls - travel * 1.3 < W + ls; i++) {
        const x = i * ls - travel * 1.3 + hash(i, 1, 67) * ls * .5, l = u * (4 + 4 * hash(i, 2, 67)), a = -1.2 - hash(i, 3, 67) * .8 + Math.sin(t / 1800 + i) * .04;
        g.save(); g.translate(x, H + u); g.rotate(a); g.beginPath(); g.ellipse(l / 2, 0, l / 2, l * .18, 0, 0, TAU); g.fill(); g.restore();
      }
    } },
    drawTop(g, E) {                                       // the explorer, fireflies, and the foliage framing the view
      step(E);
      if (E.widget) return;
      drawExplorer(g, E);
      const { W, H, GY, t, dt } = E;
      if (!st.flies) st.flies = Array.from({ length: 36 }, (_, i) => ({ x: Math.random(), y: .45 + Math.random() * .5, ph: Math.random() * TAU, k: i }));
      for (const f of st.flies) {
        f.x = (f.x + (Math.sin(t / 2600 + f.ph) * .006 - E.scrollV / W * .5) * dt + 1) % 1;
        const x = f.x * W, y = f.y * GY + Math.sin(t / 1700 + f.ph * 2) * GY * .03, lv = E.spectrum[f.k % E.spectrum.length] || 0;
        const a = (.3 + .7 * lv) * (.6 + .4 * Math.sin(t / 500 + f.ph));
        glow(g, '200,255,120', x, y, 6 + 6 * lv, .5 * a); g.fillStyle = `rgba(230,255,170,${a})`; g.fillRect(x - 1, y - 1, 2, 2);
      }
      butterflies(g, E); monkey(g, E);                   // the monkey before the leaves, so they hang in front of him
      const d = dpr(), k = `${W},${H},${d}`;
      if (st.vk !== k) { st.vk = k; st.vines = vines(W, H); }
      g.drawImage(st.vines, 0, 0, W, H);
    },
  });
})();
