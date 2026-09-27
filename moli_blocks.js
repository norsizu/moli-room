/* 茉莉方块 MOLI BLOCKS — a falling-block versus cartridge for the MOLINK console, round 1 only.
   Plugs into moli_arcade.js: MoliBlocks(ctx, MoliKit) → { step, draw, key, tap, music, release, done, … }.
   Every line you clear is a move: 1 团子拳 · 2 翻滚踢 · 3 橡皮臂 · 4 独眼光波 · 4 after 4 ×字斩.
   The swirl alien on the saucer throws poop bombs that push garbage rows into your well; clears cancel them.
   KO the alien (or clear 25 lines) and moli dances. FC feel: no hold, NES gravity, plus a ghost piece and ↑ hard drop.
   The tune is an original arrangement of the public-domain folk song 货郎 (Korobeiniki). */
(function () {
'use strict';
window.MoliBlocks = function (g, K) {
const { W, H, R, cv, text, tone, CJK } = K;
const COLS = 10, ROWS = 20, CS = 10, WX = 12, WY = 30;          // the well: 100 × 200 px
const AX = 122, AY = 26, AW = 194, AH = 112, FLOOR = AY + AH - 12; // the arena
const INK = '#141217', WHITE = '#fcfcfc', YEL = '#f5c518', RED = '#d82800', GREY = '#8c8799';
const GOAL = 25, MZ = 1.5;          // moli is drawn 1.5× (natively, not blown up) in the arena

/* ---------- pieces: NES spawn orientations, bar on row 1 so the pivot is its middle ---------- */
const BASE = {
  T: ['...', 'XXX', '.X.'], J: ['...', 'XXX', '..X'], L: ['...', 'XXX', 'X..'],
  S: ['...', '.XX', 'XX.'], Z: ['...', 'XX.', '.XX'], I: ['....', 'XXXX', '....', '....'], O: ['....', '.XX.', '.XX.', '....'],
};
const KINDS = 'TJZOSLI';
const SHAPES = {};
for (const k of KINDS) {
  const b = BASE[k], n = b.length;
  let cells = []; b.forEach((row, y) => [...row].forEach((ch, x) => ch === 'X' && cells.push([x, y])));
  SHAPES[k] = [];
  for (let r = 0; r < 4; r++) { SHAPES[k].push(cells); if (k !== 'O') cells = cells.map(([x, y]) => [n - 1 - y, x]); }
}
/* NES level palettes: [colour 1, colour 2] */
const LVPAL = [['#0058f8', '#3cbcfc'], ['#00a800', '#b8f818'], ['#d800cc', '#f878f8'], ['#0058f8', '#58d854'], ['#e40058', '#58f898'],
  ['#58f898', '#6888fc'], ['#f83800', '#7c7c7c'], ['#6844fc', '#a80020'], ['#0058f8', '#f83800'], ['#f83800', '#fca044']];
const STYLE = { T: 0, O: 0, I: 0, J: 1, S: 1, L: 2, Z: 2 };
const GRAV = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2];
const PTS = [0, 40, 100, 300, 1200];
const MOVES = [null,
  { cn: '团子拳', en: 'MOCHI PUNCH', dmg: 6, len: 36, hit: 13 },
  { cn: '翻滚踢', en: 'ROLLING KICK', dmg: 14, len: 50, hit: 22 },
  { cn: '橡皮臂', en: 'NOODLE ARM', dmg: 30, len: 46, hit: 20 },
  { cn: '独眼光波', en: 'ONE-EYE BEAM', dmg: 50, len: 76, hit: 30 },
  { cn: '×字斩', en: 'X-SLASH', dmg: 70, len: 76, hit: 44 },
];

/* ---------- pixel helpers ---------- */
function ell(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
    c.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1);
  }
}
function line(c, x0, y0, x1, y1, col, w = 1) {
  c.fillStyle = col;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; c.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); }
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const ease = t => { t = clamp01(t); return t * t * (3 - 2 * t); };

/* ---------- moli, fighter edition: a black bean with one big eye and a × navel, nothing else ----------
   x = body centre, y = feet. o: { f facing, t, eye [dx,dy], pose {arms, legs, dy}, ball angle, glow, sweat, squint, hurt } */
const POSES = {                // fist and foot positions from moli's feet (x forward, y up is negative)
  guard: { dy: 0, fa: [15, -15], ba: [-13, -11], fl: [5, 0], bl: [-5, 0] },
  punch: { dy: 0, fa: [25, -17], ba: [-12, -12], fl: [7, 0], bl: [-6, 0] },
  lunge: { dy: 1, fa: [18, -21], ba: [-15, -14], fl: [8, 0], bl: [-7, 0] },
  whip:  { dy: 0, fa: [12, -17], ba: [-13, -11], fl: [5, 0], bl: [-6, 0] },
  beam:  { dy: 1, fa: [14, -11], ba: [-14, -11], fl: [6, 0], bl: [-6, 0] },
  hurt:  { dy: 0, fa: [16, -24], ba: [-19, -20], fl: [3, 0], bl: [-7, -1] },
  cheer: { dy: -1, fa: [21, -23], ba: [-21, -23], fl: [4, 0], bl: [-4, 0] },
  squatL:{ dy: 3, fa: [14, -21], ba: [-14, -21], fl: [4, 0], bl: [-15, -4] },
  squatR:{ dy: 3, fa: [14, -21], ba: [-14, -21], fl: [15, -4], bl: [-4, 0] },
  hands: { dy: 0, fa: [19, -25], ba: [-19, -25], fl: [6, 0], bl: [-6, 0] },
  sad:   { dy: 1, fa: [12, -6], ba: [-12, -6], fl: [4, 0], bl: [-4, 0] },
};
/* poses ease into each other instead of snapping: one blended pose per scale (arena / dance / over screen) */
const BLEND = {};
function blendPose(key, want, t) {
  let b = BLEND[key];
  if (!b || t - b.t > 3 || t < b.t) b = BLEND[key] = { t, dy: want.dy || 0, fa: [...want.fa], ba: [...want.ba], fl: [...want.fl], bl: [...want.bl] };
  const k = Math.min(1, 0.38 * Math.max(1, t - b.t)); b.t = t;
  b.dy = lerp(b.dy, want.dy || 0, k);
  for (const n of ['fa', 'ba', 'fl', 'bl']) { b[n][0] = lerp(b[n][0], want[n][0], k); b[n][1] = lerp(b[n][1], want[n][1], k); }
  return b;
}
function drawMoli(c, x, y, o = {}) {
  const f = o.f || 1, t = o.t || 0, z = o.z || 1, Z = v => v * z;
  const want = POSES[o.pose || 'guard'], P = o.snap ? want : blendPose(z, { fl: [5, 0], bl: [-5, 0], dy: 0, ...want }, t);
  x = Math.round(x); y = Math.round(y);
  const px = Math.max(1, Math.round(z));                 // stroke / dot size
  if (o.ball != null) {                                  // curled into a ball for the rolling kick
    const a = o.ball, cy = y - Z(12);
    ell(c, x, cy, Z(12), Z(12), '#3a3650'); ell(c, x, cy, Z(12) - 1, Z(12) - 1, INK);
    for (let k = -4; k <= 4; k++) { const aa = a + Math.PI * 0.75 + k * 0.08; c.fillStyle = YEL; c.fillRect(Math.round(x + Math.cos(aa) * Z(8)), Math.round(cy + Math.sin(aa) * Z(8)), px, px); }
    const ex = x + Math.cos(a) * Z(5), ey = cy + Math.sin(a) * Z(5);
    ell(c, ex, ey, Z(4.5), Z(4), WHITE); ell(c, ex + Math.cos(a) * z, ey + Math.sin(a) * z, Z(2.2), Z(2.2), INK);
    return;
  }
  const dy = Math.round(Z(P.dy)), T = y - Z(31) + dy, B = y - Z(5) + dy, hw = Z(10), hurt = o.hurt && (t >> 1) % 2;
  /* legs: short straight sticks, flat oval feet turned outward */
  for (const [lx, ly] of [P.bl, P.fl]) {
    const side = lx >= 0 ? 1 : -1, hx = x + Z(4) * side * f, hy = B - Z(1);
    let vx = lx - 4 * side, vy = ly + 4.5 - P.dy; const len = Math.hypot(vx, vy) || 1;   // stick legs keep their length too
    if (len > 8) { vx *= 8 / len; vy *= 8 / len; }
    const fx = hx + Z(vx) * f, fy = hy + Z(vy) + Z(1.5);
    line(c, hx, B - Z(1), fx, fy - Z(1.5), INK, Math.max(1, Math.round(Z(1.8))));
    ell(c, fx + Z(1) * side * f, fy - Z(1.2), Z(3.2), Z(1.6), INK);
  }
  /* arms: thin sticks from the sides, round fists; the front arm may reach further for a punch */
  const reachOf = (ax, side) => side > 0 && ax > 20 ? 14 : 10;
  const arm = ([ax, ay]) => {
    const side = ax >= 0 ? 1 : -1, sx = x + Z(8.5) * side * f, sy = T + Z(15);
    let vx = ax - 8.5 * side, vy = ay + 16; const len = Math.hypot(vx, vy) || 1, max = reachOf(ax, side);
    if (len > max) { vx *= max / len; vy *= max / len; }
    const ex = sx + Z(vx) * f, ey = sy + Z(vy);
    line(c, sx, sy, ex, ey, INK, Math.max(1, Math.round(Z(1.6))));
    ell(c, ex, ey, Z(3) + 1, Z(3) + 1, '#3a3650'); ell(c, ex, ey, Z(3), Z(3), INK);
  };
  arm(P.ba);
  /* the body: a tombstone — elliptical dome, straight sides, rounded bottom corners. A faint rim keeps it readable on dark skies. */
  const tomb = (grow, col) => {
    c.fillStyle = col;
    const t0 = T - grow, b0 = B + grow, w0 = hw + grow, rd = w0 * 0.85, rc = Z(4);
    for (let yy = Math.floor(t0); yy <= b0; yy++) {
      let w = w0 + (yy - t0) / (b0 - t0) * Z(0.8);
      if (yy < t0 + rd) { const k = (t0 + rd - yy) / rd; w = w0 * Math.sqrt(Math.max(0, 1 - k * k)); }
      if (yy > b0 - rc) { const k = (yy - (b0 - rc)) / rc; w = Math.min(w, w0 - rc + rc * Math.sqrt(Math.max(0, 1 - k * k))); }
      const hwr = Math.round(w); c.fillRect(x - hwr, yy, hwr * 2 + 1, 1);
    }
  };
  tomb(1, '#3a3650'); tomb(0, hurt ? '#6c6c80' : INK);
  /* the eye: a white oval ~40% down with a big round pupil; moods are drawn in black inside the white */
  const ex = x + Z(1.5) * f, ey = T + Z(11), rx = Z(o.wide ? 6.8 : 6), ry = Z(o.wide ? 5.8 : 5.2), lw = Math.max(1, Math.round(Z(1.2)));
  const blink = !o.glow && !o.squint && !o.cross && (t % 200) > 194;
  if (o.glow) { const r = Z(7) + (t >> 1) % 2; ell(c, ex, ey, r, r, '#fca044'); ell(c, ex, ey, Z(5.5), Z(5), '#fce38a'); ell(c, ex, ey, Z(3.5), Z(3), WHITE); }
  else if (blink) { ell(c, ex, ey + Z(1), rx, Z(1.2), WHITE); }
  else {
    ell(c, ex, ey, rx, ry, WHITE);
    if (o.squint) {                                      // happy: a black ^ arc inside the white, like the sticker
      line(c, ex - Z(3), ey + Z(1.2), ex - Z(1.2), ey - Z(1), INK, lw); line(c, ex - Z(1.2), ey - Z(1), ex + Z(1.2), ey - Z(1), INK, lw); line(c, ex + Z(1.2), ey - Z(1), ex + Z(3), ey + Z(1.2), INK, lw);
    } else if (o.cross) {                                // > <
      line(c, ex - Z(4), ey - Z(2), ex - Z(1.2), ey, INK, lw); line(c, ex - Z(1.2), ey, ex - Z(4), ey + Z(2), INK, lw);
      line(c, ex + Z(4), ey - Z(2), ex + Z(1.2), ey, INK, lw); line(c, ex + Z(1.2), ey, ex + Z(4), ey + Z(2), INK, lw);
    } else {
      const [pdx, pdy] = o.eye || [f * 1, 0], lim = Z(1.8);
      ell(c, ex + Math.max(-lim, Math.min(lim, Z(pdx))), ey + Math.max(-lim * 0.7, Math.min(lim * 0.7, Z(pdy))), Z(2.9), Z(2.9), INK);
    }
  }
  /* × navel, low and centred */
  const nx = Math.round(x + Z(0.5) * f), ny = Math.round(B - Z(5));
  c.fillStyle = YEL; for (const [a, b] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]) c.fillRect(nx + a * px, ny + b * px, px, px);
  /* sweat when the well is filling up */
  if (o.sweat) { const sx = Math.round(x - Z(12) * f), sy = Math.round(T + Z(3) + ((t >> 2) % 6) * z); c.fillStyle = '#6888fc'; c.fillRect(sx, sy, px * 2, px * 3); c.fillStyle = WHITE; c.fillRect(sx, sy, px, px); }
  arm(P.fa);
}

/* ---------- the villain: a caramel three-tier swirl on a little saucer. Original design. ---------- */
const CAR = { o: '#2a1400', d: '#7a4418', b: '#b8702c', l: '#e8a850', s: '#fcd890' };
function drawFoe(c, x, y, o = {}) {
  const t = o.t || 0; x = Math.round(x); y = Math.round(y);
  const flash = o.hurt && (t >> 1) % 2;
  /* saucer */
  ell(c, x, y + 15, 18, 5, INK); ell(c, x, y + 14, 17, 4, '#bcbcbc'); ell(c, x, y + 16, 15, 2, '#747474');
  for (let i = 0; i < 4; i++) { const on = ((t >> 3) + i) % 2; c.fillStyle = on ? YEL : '#e40058'; c.fillRect(x - 12 + i * 8, y + 15, 2, 1); }
  if (!o.ko) { c.fillStyle = (t >> 1) % 2 ? '#fce38a' : '#fca044'; c.fillRect(x - 3, y + 20, 7, 2); c.fillRect(x - 1, y + 22, 3, 2); }
  /* antennae */
  const wob = Math.sin(t * 0.2) * 2;
  line(c, x - 3, y - 12, x - 8 + wob, y - 23, INK, 1); line(c, x + 3, y - 12, x + 7 + wob, y - 24, INK, 1);
  ell(c, x - 8 + wob, y - 24, 2, 2, YEL); ell(c, x + 7 + wob, y - 25, 2, 2, YEL);
  /* the swirl: three tiers, each outlined, shaded, then lit from the upper left */
  const tier = (cx, cy, rx, ry) => {
    ell(c, cx, cy, rx + 1, ry + 1, CAR.o);
    ell(c, cx, cy, rx, ry, flash ? WHITE : CAR.d);
    if (!flash) { ell(c, cx - 1, cy - 1, rx - 2, ry - 2, CAR.b); ell(c, cx - rx * 0.4, cy - ry * 0.45, rx * 0.35, ry * 0.3, CAR.l); c.fillStyle = CAR.s; c.fillRect(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.55), 2, 1); }
  };
  tier(x, y + 6, 16, 7); tier(x - 1, y - 2, 12, 6); tier(x + 1, y - 9, 8, 5);
  ell(c, x + 5, y - 14, 3, 2.5, CAR.o); ell(c, x + 5, y - 14, 2, 1.6, flash ? WHITE : CAR.b); c.fillStyle = CAR.o; c.fillRect(x + 7, y - 18, 2, 2);
  /* face on the middle tier, looking left at moli */
  if (o.ko || o.dizzy) {
    for (const ex of [x - 6, x + 1]) { line(c, ex - 1, y - 4, ex + 1, y - 2, INK, 1); line(c, ex + 1, y - 4, ex - 1, y - 2, INK, 1); }
  } else if (o.hurt) {
    line(c, x - 7, y - 5, x - 5, y - 3, INK, 1); line(c, x - 7, y - 1, x - 5, y - 3, INK, 1);
    line(c, x + 2, y - 5, x, y - 3, INK, 1); line(c, x + 2, y - 1, x, y - 3, INK, 1);
  } else {
    for (const ex of [x - 6, x + 1]) { ell(c, ex, y - 3, 2, 2.5, WHITE); c.fillStyle = INK; c.fillRect(ex - 1 - (o.look || 0), y - 3, 2, 2); }
  }
  /* crooked smirk (or an O when hit) */
  if (o.hurt || o.ko) { ell(c, x - 2, y + 5, 2, 2, CAR.o); }
  else { c.fillStyle = CAR.o; c.fillRect(x - 6, y + 4, 3, 1); c.fillRect(x - 3, y + 5, 4, 1); c.fillRect(x + 1, y + 4, 2, 1); c.fillRect(x + 3, y + 3, 1, 1); }
  if (o.plaster) { c.fillStyle = '#fcd8a8'; c.fillRect(x + 4, y - 9, 6, 2); c.fillRect(x + 6, y - 11, 2, 6); }
}
/* the poop bomb it throws: a mini swirl with a fizzing fuse */
function drawBomb(c, x, y, t, s = 1) {
  x = Math.round(x); y = Math.round(y);
  ell(c, x, y + 2 * s, 5 * s, 3 * s, CAR.o); ell(c, x, y + 2 * s, 4 * s, 2 * s, CAR.b);
  ell(c, x, y - 1 * s, 3 * s, 2 * s, CAR.o); ell(c, x, y - 1 * s, 2 * s, 1.5 * s, CAR.l);
  c.fillStyle = INK; c.fillRect(x + 1, y - 3 * s - 2, 1, 2);
  c.fillStyle = (t >> 1) % 2 ? YEL : RED; c.fillRect(x + 1 + ((t >> 2) % 2), y - 3 * s - 4, 2, 2);
}

/* ---------- audio ---------- */
let nbuf = null;
function noise(d, f, vol, delay = 0) {
  const ac = K.ac; if (!ac || K.muted) return;
  if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const dd = nbuf.getChannelData(0); for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1; }
  const t0 = ac.currentTime + delay, s = ac.createBufferSource(), lp = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = nbuf; s.loop = true; lp.type = 'lowpass'; lp.frequency.setValueAtTime(f, t0); lp.frequency.exponentialRampToValueAtTime(Math.max(60, f * 0.25), t0 + d);
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
  s.connect(lp); lp.connect(gn); gn.connect(K.out || ac.destination); s.start(t0, Math.random() * 0.8); s.stop(t0 + d + 0.05);
}
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const arp = (notes, st, vol = 0.04, type = 'square') => notes.forEach((n, i) => n && tone(hz(n), st * 0.95, type, 0, vol, i * st));
const SFX = {
  move: () => tone(1320, 0.025, 'square', 0, 0.012),
  rot: () => tone(660, 0.04, 'square', 990, 0.02),
  lock: () => tone(140, 0.07, 'triangle', 70, 0.09),
  clear: n => arp([72, 76, 79, 84].slice(0, n + 1), 0.05, 0.035),
  quad: () => { arp([72, 76, 79, 84, 88, 91, 96], 0.04, 0.04); noise(0.3, 3000, 0.04, 0.1); },
  level: () => arp([79, 84, 88, 91], 0.06, 0.035),
  punch: () => { noise(0.08, 2400, 0.12); tone(220, 0.07, 'square', 90, 0.04); },
  kick: () => { noise(0.12, 1600, 0.14); tone(180, 0.1, 'square', 60, 0.05); },
  whip: () => { tone(2400, 0.08, 'sawtooth', 600, 0.02); noise(0.05, 6000, 0.08, 0.06); },
  charge: () => tone(200, 0.45, 'sawtooth', 1400, 0.02),
  beam: () => { tone(1800, 0.6, 'sawtooth', 300, 0.03); noise(0.7, 5000, 0.06); },
  slash: () => { tone(3000, 0.3, 'square', 400, 0.025); noise(0.3, 7000, 0.08); },
  thud: () => { noise(0.25, 500, 0.2); tone(90, 0.2, 'triangle', 40, 0.1); },
  wind: () => arp([60, 0, 60, 0, 63], 0.07, 0.02, 'triangle'),
  toss: () => tone(500, 0.35, 'triangle', 200, 0.05),
  block: () => arp([84, 91], 0.05, 0.03),
  ko: () => { noise(1, 700, 0.22); arp([76, 72, 67, 64, 60, 55], 0.08, 0.04); },
  blip: () => tone(880, 0.05, 'square', 0, 0.03),
  start: () => arp([69, 72, 76, 0, 76, 81], 0.08, 0.045),
  pause: () => arp([88, 84, 88, 84], 0.07, 0.03),
  over: () => arp([69, 0, 67, 64, 0, 62, 60, 0, 57], 0.13, 0.04, 'triangle'),
  win: () => arp([72, 76, 79, 84, 0, 83, 84, 86, 0, 88, 0, 88, 88, 91], 0.09, 0.045),
};
/* 货郎 (public-domain folk melody), our own two-voice arrangement: pulse lead + a third below, octave-hopping triangle bass */
const MEL_A = [[76, 2], [71, 1], [72, 1], [74, 2], [72, 1], [71, 1], [69, 2], [69, 1], [72, 1], [76, 2], [74, 1], [72, 1],
  [71, 3], [72, 1], [74, 2], [76, 2], [72, 2], [69, 2], [69, 2], [0, 2]];
const MEL_B = [[0, 1], [74, 2], [77, 1], [81, 2], [79, 1], [77, 1], [76, 3], [72, 1], [76, 2], [74, 1], [72, 1],
  [71, 2], [71, 1], [72, 1], [74, 2], [76, 2], [72, 2], [69, 2], [69, 2], [0, 2]];
const MELODY = [...MEL_A, ...MEL_A, ...MEL_B, ...MEL_B];
const ROOTS = [40, 45, 40, 45, 40, 45, 40, 45, 38, 36, 40, 45, 38, 36, 40, 45];
const SC = [9, 11, 0, 2, 4, 5, 7];
const below = n => { const i = SC.indexOf(n % 12); if (i < 0) return n - 4; const j = (i + 5) % 7; let m = n - n % 12 + SC[j]; if (m >= n) m -= 12; return m; };
const song = { on: false, t: 0, step: 0, li: 0, left: 0, bus: null };
function voice(type, f, t0, d, vol) {
  const ac = K.ac, o = ac.createOscillator(), gn = ac.createGain();
  if (typeof type === 'number') o.setPeriodicWave(K.pulse(type)); else o.type = type;
  o.frequency.value = f;
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 0.006); gn.gain.setTargetAtTime(vol * 0.6, t0 + 0.02, 0.06); gn.gain.setTargetAtTime(0, t0 + d * 0.85, 0.015);
  o.connect(gn); gn.connect(song.bus); o.start(t0); o.stop(t0 + d + 0.1);
}
function hat(t0, vol) {
  const ac = K.ac, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = nbuf; fl.type = 'highpass'; fl.frequency.value = 7000;
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.035);
  s.connect(fl); fl.connect(gn); gn.connect(song.bus); s.start(t0, Math.random() * 0.5); s.stop(t0 + 0.05);
}
function songStop() {
  if (!song.on) return; song.on = false;
  const ac = K.ac;
  if (song.bus && ac) { const b = song.bus; b.gain.setTargetAtTime(0, ac.currentTime, 0.03); setTimeout(() => b.disconnect(), 400); }
  song.bus = null;
}
function songPump(fast) {
  const ac = K.ac; if (!ac || K.muted) { songStop(); return; }
  if (!song.on) {
    song.on = true; song.t = ac.currentTime + 0.06; song.step = 0; song.li = 0; song.left = 0;
    song.bus = ac.createGain(); song.bus.gain.value = 1; song.bus.connect(ac.destination);
    if (!nbuf) noise(0.01, 100, 0.0001);
  }
  const sx = fast ? 0.058 : 0.078;                 // seconds per 16th; the tune speeds up when the well is nearly full
  if (song.t < ac.currentTime - 0.25) song.t = ac.currentTime + 0.02;
  while (song.t < ac.currentTime + 0.18) {
    const s = song.step % 256, bar = s >> 4, inBar = s & 15, t0 = song.t;
    if (song.left === 0) {
      const [n, len] = MELODY[song.li];
      if (n) { voice(0.25, hz(n), t0, len * 2 * sx, 0.042); voice(0.125, hz(below(n)), t0, len * 2 * sx * 0.8, 0.018); }
      song.left = len * 2; song.li = (song.li + 1) % MELODY.length;
    }
    song.left--;
    if (inBar % 2 === 0) voice('triangle', hz(ROOTS[bar] + ((inBar >> 1) % 2 ? 12 : 0)), t0, sx * 1.7, 0.12);
    if (nbuf && inBar % 2 === 0) hat(t0, inBar % 8 === 4 ? 0.04 : 0.016);
    song.t += sx; song.step++;
  }
}

/* ---------- state ---------- */
const keys = { L: false, R: false, U: false, D: false, J: false, B: false };
const S = { mode: 'title', mt: 0, t: 0, done: false, idle: 0, paused: false, overSel: 0 };
let board, cur, nextK, lines, level, score, st, stT, clearRows, gravT, das, dasDir, softLock, lastClear, flashT, shake, topOutT;
let foe, mo, atkQ, fx, banner, bombs, garbageQ, holeCol, stats;
function rng() { return Math.random(); }
function rollPiece(prev) { let k = KINDS[Math.floor(rng() * 8) % 8] ; if (!k || k === prev) k = KINDS[Math.floor(rng() * 7)]; return k; }   // NES: reroll once on a repeat
function resetRound() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  lines = 0; level = 0; score = 0; st = 'are'; stT = 0; clearRows = []; gravT = 0; das = 0; dasDir = 0;
  softLock = false; lastClear = 0; flashT = 0; shake = 0; topOutT = 0; cur = null; nextK = rollPiece(null);
  foe = { hp: 100, disp: 100, st: 'idle', t: 0, next: 60 * 20, pending: 0, x: AX + 150, y: FLOOR - 40, hurt: 0, count: 0, back: 0, blocked: 0 };
  mo = { x: AX + 44, hurt: 0, cheer: 0 };
  atkQ = []; fx = []; banner = null; bombs = []; garbageQ = 0; holeCol = 0; stats = { quads: 0, moves: 0 };
}
resetRound();
const fits = (k, r, x, y) => SHAPES[k][r].every(([cx, cy]) => { const X = x + cx, Y = y + cy; return X >= 0 && X < COLS && Y < ROWS && (Y < 0 || !board[Y][X]); });
function spawn() {
  const k = nextK; nextK = rollPiece(k);
  cur = { k, r: 0, x: 3, y: -1, fresh: true };
  gravT = 0; softLock = keys.D;
  if (!fits(k, 0, cur.x, cur.y)) { cur.y--; if (!fits(k, 0, cur.x, cur.y)) topOut(); }
}
function topOut() { st = 'dead'; stT = 0; songStop(); SFX.over(); }
function tryMove(dx, dy) { if (cur && fits(cur.k, cur.r, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; } return false; }
function tryRot(d) {
  if (!cur || cur.k === 'O') return;
  const r = (cur.r + d + 4) % 4;
  for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [0, -1]]) if (fits(cur.k, r, cur.x + kx, cur.y + ky)) { cur.r = r; cur.x += kx; cur.y += ky; SFX.rot(); return; }
}
function ghostY() { let y = cur.y; while (fits(cur.k, cur.r, cur.x, y + 1)) y++; return y; }
function stackHeight() { for (let y = 0; y < ROWS; y++) if (board[y].some(Boolean)) return ROWS - y; return 0; }
function lock() {
  let above = false;
  for (const [cx, cy] of SHAPES[cur.k][cur.r]) { const X = cur.x + cx, Y = cur.y + cy; if (Y < 0) above = true; else board[Y][X] = cur.k; }
  cur = null; SFX.lock();
  if (above) { topOut(); return; }
  clearRows = []; for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) clearRows.push(y);
  if (clearRows.length) {
    const n = clearRows.length;
    score += PTS[n] * (level + 1);
    const kind = n === 4 && lastClear === 4 ? 5 : n;
    lastClear = n;
    atkQ.push(kind); stats.moves++;
    if (n === 4) { stats.quads++; flashT = 12; SFX.quad(); } else SFX.clear(n);
    /* clears counter whatever the alien is winding up */
    if (foe.st === 'wind' && foe.pending > 0) { foe.pending = Math.max(0, foe.pending - n); if (foe.pending === 0) { foe.blocked = 50; SFX.block(); } }
    if (garbageQ > 0) garbageQ = Math.max(0, garbageQ - n);
    st = 'clear'; stT = 0;
  } else { st = 'are'; stT = 0; }
}
function collapse() {
  const n = clearRows.length;
  board = board.filter((_, y) => !clearRows.includes(y));
  while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
  const lv0 = level; lines += n; level = Math.floor(lines / 10);
  if (Math.floor(lines / 10) > Math.floor((lines - n) / 10) && lines >= 10) { level = Math.max(level, lv0 + 1); SFX.level(); }
  clearRows = [];
}
function addGarbage(n) {
  if (!n) return;
  for (let i = 0; i < n; i++) {
    if (board[0].some(Boolean)) { topOut(); return; }
    board.shift();
    const row = Array(COLS).fill('g'); row[holeCol] = null; board.push(row);
  }
  shake = 10; mo.hurt = 24; SFX.thud();
}

/* ---------- step ---------- */
function stepWell() {
  if (st === 'fall' && cur) {
    /* DAS: move on press, then after 12 frames every 5 */
    const dir = keys.L && !keys.R ? -1 : keys.R && !keys.L ? 1 : 0;
    if (dir !== dasDir) { dasDir = dir; das = 0; if (dir && tryMove(dir, 0)) SFX.move(); }
    else if (dir) { das++; if (das >= 12 && (das - 12) % 5 === 0 && tryMove(dir, 0)) SFX.move(); }
    if (!keys.D) softLock = false;
    let dropped = false;
    if (keys.D && !softLock && S.mt % 2 === 0) { if (tryMove(0, 1)) { score += 1; gravT = 0; } else { lock(); return; } dropped = true; }
    if (!dropped && ++gravT >= GRAV[Math.min(level, GRAV.length - 1)]) { gravT = 0; if (!tryMove(0, 1)) { lock(); return; } }
    if (cur) cur.fresh = false;
  } else if (st === 'clear') { if (++stT >= 20) { collapse(); st = 'are'; stT = 0; } }
  else if (st === 'are') {
    if (++stT >= 10) {
      if (garbageQ > 0) { holeCol = Math.floor(rng() * COLS); addGarbage(garbageQ); garbageQ = 0; if (st === 'dead') return; }
      st = 'fall'; spawn();
    }
  } else if (st === 'dead') { stT++; if (stT > 20 * 3 + 60) { S.overSel = 0; setMode('over'); } }
}
function interval() { return Math.max(60 * 10, 60 * 18 - level * 60 - foe.count * 20); }
function stepFoe() {
  foe.disp += (foe.hp - foe.disp) * 0.12;
  if (foe.hurt > 0) foe.hurt--;
  if (foe.blocked > 0) foe.blocked--;
  if (foe.back > 0) foe.back *= 0.85;
  foe.t++;
  if (foe.st === 'ko') { if (foe.t > 110) setMode('clear'); return; }
  if (st === 'dead') return;
  if (foe.st === 'idle') {
    if (--foe.next <= 0 && !mo.atk) { foe.st = 'wind'; foe.t = 0; foe.pending = [1, 1, 1, 1, 2, 1, 2][Math.min(foe.count, 6)] + (level >= 8 ? 1 : 0); SFX.wind(); }
  } else if (foe.st === 'wind') {
    if (foe.pending <= 0) { foe.st = 'idle'; foe.next = interval(); foe.count++; }
    else if (foe.t >= 180) { foe.st = 'throw'; foe.t = 0; SFX.toss(); for (let i = 0; i < foe.pending; i++) bombs.push({ t: -i * 6, n: 1 }); foe.pending = 0; }
  } else if (foe.st === 'throw') {
    if (foe.t >= 30) { foe.st = 'idle'; foe.next = interval(); foe.count++; }
  }
  for (const b of bombs) if (++b.t === 40) garbageQ += b.n;
  bombs = bombs.filter(b => b.t < 40);
}
function stepMoli() {
  if (mo.hurt > 0) mo.hurt--;
  if (!mo.atk && atkQ.length && foe.st !== 'ko') {
    const k = atkQ.shift(); mo.atk = { k, t: 0 }; banner = { k, t: 0 };
    if (k === 4) SFX.charge();
  }
  if (mo.atk) {
    const a = mo.atk, M = MOVES[a.k];
    a.t++;
    if (a.k === 1 && a.t === 10) SFX.punch();
    if (a.k === 2 && a.t === 20) SFX.kick();
    if (a.k === 3 && a.t === 14) SFX.whip();
    if (a.k === 4 && a.t === 26) SFX.beam();
    if (a.k === 5 && a.t === 30) SFX.slash();
    if (a.t === M.hit) {
      foe.hp = Math.max(0, foe.hp - M.dmg); foe.hurt = 24; foe.back = a.k >= 4 ? 18 : 8;
      fx.push({ k: 'spark', x: foe.x - 12, y: foe.y - 2, t: 0, big: a.k >= 4 });
      if (a.k >= 4) shake = 8;
      if (foe.hp <= 0) { foe.st = 'ko'; foe.t = 0; bombs = []; SFX.ko(); songStop(); }
    }
    if (a.t >= M.len) mo.atk = null;
  }
  if (lines >= GOAL && foe.st !== 'ko' && !mo.atk && !atkQ.length) { foe.hp = 0; foe.st = 'ko'; foe.t = 0; bombs = []; SFX.ko(); songStop(); }
  if (banner && ++banner.t > 70) banner = null;
  for (const e of fx) e.t++;
  fx = fx.filter(e => e.t < 20);
  if (flashT > 0) flashT--;
  if (shake > 0) shake--;
}
function setMode(m) { S.mode = m; S.mt = 0; if (m !== 'play') songStop(); if (m === 'clear') SFX.win(); }
function step(live) {
  S.mt++; S.t++;
  if (S.mode === 'title') { if (live && ++S.idle > 60 * 45) S.done = true; }
  else if (S.mode === 'ready') { stepFoe0(); if (S.mt > 120) { setMode('play'); } }
  else if (S.mode === 'play') {
    if (!live || S.paused) return;
    stepWell(); stepMoli();
    if (S.mode === 'play') stepFoe();
  }
  else if (S.mode === 'clear') { if (S.mt > 480 + 900) S.done = true; }
}
function stepFoe0() { foe.t++; }

/* ---------- drawing: well ---------- */
function drawCell(x, y, k, lv, dim) {
  if (k === 'g') {                                       // garbage: caramel lumps from the bombs
    R(g, x, y, 9, 9, CAR.d); R(g, x + 1, y + 1, 7, 6, CAR.b); R(g, x + 1, y + 1, 3, 2, CAR.l); R(g, x + 2, y + 1, 1, 1, CAR.s);
    return;
  }
  const [c1, c2] = LVPAL[lv % 10], s = STYLE[k], col = s === 2 ? c2 : c1;
  if (dim) { R(g, x, y, 9, 9, col); R(g, x + 1, y + 1, 7, 7, '#15122a'); return; }
  R(g, x, y, 9, 9, col);
  if (s === 0) { R(g, x + 2, y + 2, 5, 5, WHITE); R(g, x, y, 1, 1, WHITE); }
  else { R(g, x, y, 1, 1, WHITE); R(g, x + 1, y + 1, 2, 1, WHITE); R(g, x + 1, y + 2, 1, 1, WHITE); }
}
function drawWell() {
  /* frame: grey bricks like the old block-game borders */
  R(g, WX - 4, WY - 4, COLS * CS + 8, ROWS * CS + 8, '#5d5870');
  R(g, WX - 3, WY - 3, COLS * CS + 6, ROWS * CS + 6, '#bcbcbc');
  for (let i = 0; i < ROWS * CS + 6; i += 5) { R(g, WX - 3, WY - 3 + i, 2, 1, '#747474'); R(g, WX + COLS * CS + 1, WY - 3 + i, 2, 1, '#747474'); }
  R(g, WX - 1, WY - 1, COLS * CS + 2, ROWS * CS + 2, INK);
  R(g, WX, WY, COLS * CS, ROWS * CS, '#000');
  if (S.paused) { text(g, 'PAUSE', WX + 50, WY + 90, { align: 'center', color: WHITE }); text(g, '⌫ 返回卡带', WX + 50, WY + 108, { align: 'center', size: 11, fam: CJK, color: GREY }); return; }
  const dead = st === 'dead';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    let k = board[y][x];
    if (dead && y < Math.floor(stT / 3)) k = 'dead';
    if (!k) continue;
    if (st === 'clear' && clearRows.includes(y)) { const half = Math.floor(stT / 4) + 1; if (Math.abs(x - 4.5) < half) continue; }
    if (k === 'dead') { R(g, WX + x * CS, WY + y * CS, 9, 9, '#747474'); R(g, WX + x * CS + 1, WY + y * CS + 1, 7, 2, '#bcbcbc'); continue; }
    drawCell(WX + x * CS, WY + y * CS, k, level);
  }
  if (cur && !dead) {
    const gy = ghostY();
    if (gy !== cur.y) for (const [cx, cy] of SHAPES[cur.k][cur.r]) if (gy + cy >= 0) drawCell(WX + (cur.x + cx) * CS, WY + (gy + cy) * CS, cur.k, level, true);
    for (const [cx, cy] of SHAPES[cur.k][cur.r]) if (cur.y + cy >= 0) drawCell(WX + (cur.x + cx) * CS, WY + (cur.y + cy) * CS, cur.k, level);
  }
  /* incoming bombs queue above the well */
  const inc = (foe.st === 'wind' ? foe.pending : 0) + garbageQ + bombs.length;
  for (let i = 0; i < Math.min(inc, 6); i++) drawBomb(g, WX + 8 + i * 14, WY - 12, S.t + i * 3, 1);
  if (foe.blocked > 0 && (foe.blocked >> 2) % 2) text(g, '抵消!', WX + 50, WY + 4, { align: 'center', size: 14, fam: CJK, color: YEL, shadow: INK });
}

/* ---------- drawing: arena ---------- */
function arenaBG() {
  const bands = ['#0c0c3c', '#1c145c', '#3c1c7c', '#6c2c8c', '#a8407c', '#d8606c', '#f8905c'];
  const bh = Math.ceil((AH - 22) / bands.length);
  bands.forEach((c, i) => R(g, AX, AY + i * bh, AW, bh, c));
  for (let i = 0; i < 16; i++) { const sx = AX + (i * 53) % AW, sy = AY + (i * 29) % 30 + 2; if ((S.t >> 4) % 4 !== i % 4) R(g, sx, sy, 1, 1, WHITE); }
  disc4(AX + 150, FLOOR - 34, 12, '#fca044'); disc4(AX + 150, FLOOR - 34, 10, '#fcd890');
  /* city skyline */
  for (let x = 0; x < AW; x += 12) { const bh2 = 12 + ((x * 37) % 23); R(g, AX + x, FLOOR - bh2, 11, bh2, '#2c1c4c'); for (let wy = FLOOR - bh2 + 3; wy < FLOOR - 3; wy += 5) if (((x + wy) * 13) % 7 < 2) R(g, AX + x + 3, wy, 2, 2, '#fce38a'); }
  /* rooftop */
  R(g, AX, FLOOR, AW, 1, '#fcd890'); R(g, AX, FLOOR + 1, AW, AY + AH - FLOOR - 1, '#6c3c2c');
  for (let x = 0; x < AW; x += 16) R(g, AX + x, FLOOR + 1, 1, AY + AH - FLOOR - 1, '#4c2418');
  R(g, AX, FLOOR + 5, AW, 1, '#4c2418');
}
function disc4(cx, cy, r, c) { K.disc(g, cx, cy, r, c); }
function drawArena() {
  g.save(); g.beginPath(); g.rect(AX, AY, AW, AH); g.clip();
  const sx = shake ? ((shake & 1) ? 2 : -2) : 0;
  g.translate(sx, 0);
  arenaBG();
  /* foe */
  const fT = foe.t, ko = foe.st === 'ko';
  let fx0 = foe.x + foe.back, fy0 = foe.y + Math.sin(S.t * 0.07) * 3;
  if (foe.st === 'wind') fx0 += Math.sin(fT * 0.8) * 1.5;
  if (ko) { fx0 += fT * 1.6; fy0 += -fT * 1.2 + fT * fT * 0.03; }
  if (!(ko && fT > 100)) drawFoe(g, fx0, fy0, { t: S.t, hurt: foe.hurt > 0 || ko, ko, look: mo.atk ? 1 : 0 });
  if (foe.st === 'wind') { const s = Math.min(1.6, 0.6 + foe.t / 90); drawBomb(g, fx0 + 2, fy0 - 32, S.t, s); }
  /* moli */
  const a = mo.atk, base = mo.x, cur2 = cur;
  const eye = cur2 ? [(cur2.x - 4) * 0.25 - 2, (cur2.y - 8) * 0.18] : [1.5, 0];
  const o = { f: 1, t: S.t, z: MZ, eye, pose: 'guard', sweat: stackHeight() >= 14 && st !== 'dead', wide: stackHeight() >= 14 };
  let x = base, y = FLOOR;
  if (st === 'dead') { o.pose = 'sad'; o.cross = true; y = FLOOR; }
  else if (mo.hurt > 0) { o.pose = 'hurt'; o.cross = mo.hurt > 12; x -= Math.sin(mo.hurt * 0.3) * 3; }
  if (a) {
    const t = a.t, reach = foe.x - 42;
    if (a.k === 1) {
      const out = t < 10 ? ease(t / 10) : t < 22 ? 1 : 1 - ease((t - 22) / 14);
      x = lerp(base, reach, out); o.pose = t >= 10 && t < 22 ? 'punch' : 'lunge';
    } else if (a.k === 2) {
      const out = t < 22 ? t / 22 : 1 - ease((t - 22) / 28);
      x = lerp(base, reach + 6, out); y = FLOOR - Math.sin(clamp01(t / 22) * Math.PI) * 30 - (t >= 22 ? Math.sin(clamp01((t - 22) / 28) * Math.PI) * 14 : 0);
      if (t < 30) o.ball = t * 0.5;
    } else if (a.k === 3) {
      o.pose = 'whip';
    } else if (a.k === 4) {
      o.pose = 'beam'; o.glow = true;
    } else if (a.k === 5) {
      y = FLOOR - Math.sin(clamp01(t / 30) * Math.PI) * 18; o.pose = t < 30 ? 'cheer' : 'punch';
    }
  } else if (foe.st === 'ko') { o.pose = 'cheer'; o.squint = true; y = FLOOR - Math.abs(Math.sin(S.t * 0.15)) * 6; }
  drawMoli(g, x, y, o);
  /* move effects */
  if (a) {
    const t = a.t, ex = x + 1.5 * MZ, ey = y - 20 * MZ;
    if (a.k === 3 && t > 6 && t < 34) {                        // the stick arm stretches out like a noodle and whips
      const k = t < 20 ? clamp01((t - 6) / 12) : 1 - clamp01((t - 24) / 10), tipX = lerp(x + 8 * MZ, foe.x - 14, k), tipY = lerp(y - 17 * MZ, FLOOR - 40, k);
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, px = lerp(x + 6 * MZ, tipX, u), py = lerp(y - 16 * MZ, tipY, u) - Math.sin(u * Math.PI) * 16 * (1 - k * 0.6) + Math.sin(u * 12 - t) * 2 * u;
        if (i < 24) R(g, Math.round(px), Math.round(py), 3, 3, INK); else { ell(g, px, py, 4.5, 4.5, '#3a3650'); ell(g, px, py, 3.5, 3.5, INK); }
      }
    }
    if (a.k === 4) {
      if (t < 26) { for (let i = 0; i < 6; i++) { const ang = i + t * 0.4, r = 20 - t * 0.7; R(g, Math.round(ex + Math.cos(ang) * r), Math.round(ey + Math.sin(ang) * r), 2, 2, '#fce38a'); } }
      else if (t < 60) {
        const tx = foe.x + foe.back - 10, w = t < 30 ? (t - 26) * 2 : t > 52 ? Math.max(1, (60 - t) * 1.5) : 9 + (t & 1);
        R(g, ex, Math.round(ey - w / 2), tx - ex, Math.round(w), '#fca044');
        R(g, ex, Math.round(ey - w / 4), tx - ex, Math.max(1, Math.round(w / 2)), '#fce38a');
        R(g, ex, Math.round(ey - 1), tx - ex, 2, WHITE);
        for (let i = 0; i < 4; i++) R(g, ex + ((t * 9 + i * 29) % (tx - ex)), Math.round(ey + ((i * 7 + t) % 9) - 4), 3, 1, WHITE);
      }
    }
    if (a.k === 5 && t >= 30 && t < 46) {                       // the navel × flies out, growing and spinning
      const k = (t - 30) / 14, cx = lerp(x + 2 * MZ, foe.x - 6, k), cy = lerp(y - 10 * MZ, foe.y - 2, k), s = 3 + k * 9, sp = k * 3;
      for (const d of [0, Math.PI / 2]) { const ang = Math.PI / 4 + d + sp; line(g, cx - Math.cos(ang) * s, cy - Math.sin(ang) * s, cx + Math.cos(ang) * s, cy + Math.sin(ang) * s, YEL, 3); }
    }
  }
  for (const e of bombs) if (e.t >= 0) {                        // thrown poop bombs, flying off toward the well
    const k = e.t / 40, bx = lerp(foe.x - 6, AX - 70, k), by = lerp(foe.y - 30, AY - 10, k) - Math.sin(k * Math.PI) * 30;
    drawBomb(g, bx, by, S.t, 1.2);
  }
  for (const e of fx) {
    const r = (e.big ? 14 : 8) * (e.t / 20 + 0.3);
    for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4 + 0.3; R(g, Math.round(e.x + Math.cos(ang) * r), Math.round(e.y + Math.sin(ang) * r), 2, 2, e.t < 6 ? WHITE : YEL); }
  }
  if (ko && fT > 40) { const bx = AX + AW / 2; text(g, 'K.O.', bx, AY + 34, { align: 'center', size: 24, fam: CJK, color: (fT >> 2) % 2 ? YEL : RED, shadow: INK }); }
  if (banner && !ko) {
    const M = MOVES[banner.k], slide = Math.min(1, banner.t / 8);
    const bx = AX + AW / 2 + (1 - slide) * 80;
    R(g, AX, AY + 22, AW, 26, 'rgba(12,12,40,.55)');
    text(g, M.cn + '!', bx, AY + 23, { align: 'center', size: 16, fam: CJK, color: banner.k >= 4 ? YEL : WHITE, shadow: RED });
    text(g, M.en, bx, AY + 40, { align: 'center', color: '#fce38a' });
  }
  g.restore();
  R(g, AX - 1, AY - 1, AW + 2, 1, '#bcbcbc'); R(g, AX - 1, AY + AH, AW + 2, 1, '#bcbcbc'); R(g, AX - 1, AY, 1, AH, '#bcbcbc'); R(g, AX + AW, AY, 1, AH, '#bcbcbc');
}
function hpBar(x, y, w, v, rtl, col) {
  R(g, x - 1, y - 1, w + 2, 8, '#fcfcfc'); R(g, x, y, w, 6, '#a80020');
  const fw = Math.round(w * clamp01(v));
  R(g, rtl ? x + w - fw : x, y, fw, 6, col); R(g, rtl ? x + w - fw : x, y, fw, 2, '#fce38a');
}
function drawHUD() {
  /* street-fighter style header: moli's bar is the room left in her well */
  const room = 1 - stackHeight() / ROWS;
  hpBar(AX, 5, 80, room, true, '#f8b800'); hpBar(AX + AW - 80, 5, 80, foe.disp / 100, false, '#f8b800');
  text(g, '茉莉', AX, 13, { size: 10, fam: CJK, color: WHITE });
  text(g, '便便星人', AX + AW, 13, { align: 'right', size: 10, fam: CJK, color: WHITE });
  R(g, AX + 84, 1, 26, 22, INK); R(g, AX + 85, 2, 24, 20, '#241f38');
  text(g, String(Math.max(0, GOAL - lines)).padStart(2, '0'), AX + 97, 4, { align: 'center', color: YEL });
  text(g, '行', AX + 97, 12, { align: 'center', size: 9, fam: CJK, color: GREY });
  /* lower panel: next, level, score */
  const py = AY + AH + 8;
  R(g, AX, py, 56, 50, INK); R(g, AX + 1, py + 1, 54, 48, '#241f38');
  text(g, 'NEXT', AX + 28, py + 4, { align: 'center', color: GREY });
  if (nextK && !S.paused) {
    const cells = SHAPES[nextK][0], xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * CS, h = (Math.max(...ys) - Math.min(...ys) + 1) * CS;
    for (const [cx, cy] of cells) drawCell(AX + 28 - w / 2 + (cx - Math.min(...xs)) * CS, py + 30 - h / 2 + (cy - Math.min(...ys)) * CS, nextK, level);
  }
  const sx = AX + 66;
  text(g, 'SCORE', sx, py + 2, { color: GREY }); text(g, String(score).padStart(6, '0'), sx, py + 12, { color: WHITE });
  text(g, 'LINES', sx, py + 26, { color: GREY }); text(g, String(lines).padStart(3, '0') + '/' + GOAL, sx, py + 36, { color: WHITE });
  text(g, 'LV', sx + 84, py + 26, { color: GREY }); text(g, String(level).padStart(2, '0'), sx + 84, py + 36, { color: YEL });
  text(g, '消1行 拳 · 2 踢 · 3 臂 · 4 光波', AX + AW / 2, py + 54, { align: 'center', size: 11, fam: CJK, color: '#8c8799' });
}
function drawPlay() {
  R(g, 0, 0, W, H, '#15122a');
  for (let y = 0; y < H; y += 8) for (let x = (y >> 3) % 2 * 8; x < W; x += 16) R(g, x, y, 8, 8, '#1a1632');
  drawWell(); drawArena(); drawHUD();
  if (flashT > 0 && (flashT >> 1) % 2) { g.globalCompositeOperation = 'difference'; R(g, 0, 0, W, H, WHITE); g.globalCompositeOperation = 'source-over'; }
  if (mo.atk && mo.atk.k === 4 && mo.atk.t >= 26 && mo.atk.t < 30) { g.globalCompositeOperation = 'difference'; R(g, 0, 0, W, H, WHITE); g.globalCompositeOperation = 'source-over'; }
}

/* ---------- title / ready / over / clear ---------- */
let cover = null;
if (window.MOLI_COVERS && window.MOLI_COVERS.blocks) { const im = new Image(); im.onload = () => { cover = im; }; im.src = window.MOLI_COVERS.blocks; }
function drawTitle(live) {
  R(g, 0, 0, W, H, '#000');
  const ch = 216, cw = Math.round(ch * 2 / 3), cx = W - cw - 10, cy = 12;
  if (cover) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cover, cx, cy, cw, ch); g.imageSmoothingEnabled = false;
  } else {
    R(g, cx, cy, cw, ch, '#1c145c');
    drawMoli(g, cx + 44, cy + 170, { t: S.t, pose: 'punch', eye: [2, 0] });
    drawFoe(g, cx + 104, cy + 80, { t: S.t });
  }
  const L = 16;
  /* the name follows the room's 中 / EN switch; in English the big line already says it, so the small one steps aside */
  const nm = window.LANG === 'en' ? ['MOLI BLOCKS', 22] : ['茉莉方块', 28];
  text(g, nm[0], L - 1, 24, { size: nm[1], fam: CJK, color: '#fce38a' });
  text(g, nm[0], L, 24, { size: nm[1], fam: CJK, color: YEL, shadow: RED });
  if (!(window.LANG === 'en')) text(g, 'MOLI BLOCKS', L + 2, 64, { color: WHITE, shadow: INK });
  text(g, 'ROUND 1 · VS 便便星人', L + 2, 80, { size: 12, fam: CJK, color: '#b7b3c6' });
  text(g, '消 25 行或击倒对手 通关', L + 2, 108, { size: 11, fam: CJK, color: '#6e6a80' });
  if ((S.t >> 5) % 2 === 0) text(g, 'PUSH START', L + 2, 160, { color: WHITE });
  if (live) {
    text(g, '←→ 移动 · ↓ 加速 · ↑ 直落', L, 182, { size: 11, fam: CJK, color: '#b7b3c6' });
    text(g, 'K 右转 · J 左转 · 回车 开始', L, 198, { size: 11, fam: CJK, color: '#b7b3c6' });
  } else if ((S.t >> 5) % 2 === 0) text(g, '点击电视 开始游戏', L, 190, { size: 13, fam: CJK, color: YEL });
  text(g, '© MOLINK 1990', L, 224, { size: 8, color: '#4c4c58' });
}
function drawReady() {
  drawPlay();
  const m = S.mt;
  R(g, AX, AY + 36, AW, 30, 'rgba(0,0,0,.5)');
  if (m < 70) text(g, 'ROUND 1', AX + AW / 2, AY + 44, { align: 'center', color: WHITE });
  else if ((m >> 2) % 2) text(g, 'FIGHT!', AX + AW / 2, AY + 42, { align: 'center', size: 16, fam: CJK, color: YEL, shadow: RED });
}
function drawOver() {
  R(g, 0, 0, W, H, '#1c1a3a');
  text(g, 'SCORE ' + String(score).padStart(6, '0'), 40, 40);
  text(g, 'LINES ' + lines, 40, 56, { color: GREY });
  text(g, 'GAME OVER', W / 2, 92, { align: 'center', color: RED });
  drawMoli(g, W / 2 - 10, 206, { t: S.t, z: 2, pose: 'sad', cross: true });
  drawFoe(g, W / 2 + 60, 170, { t: S.t, look: 1 });
  ['CONTINUE', 'END'].forEach((o, i) => { text(g, o, W / 2 - 30, 120 + i * 18); if (i === S.overSel) text(g, '▶', W / 2 - 44, 118 + i * 18, { size: 10, fam: CJK, color: YEL }); });
}
/* the win: a little stage, moli dances a squat-kick number, the bandaged alien bobs along */
const DANCE = ['squatL', 'squatR', 'squatL', 'squatR', 'hands', 'cheer', 'hands', 'spin'];
function drawClear() {
  if (S.mt > 480) { K.disclaimer(g, S.mt - 480); return; }
  const t = S.mt;
  R(g, 0, 0, W, H, '#0c0c3c');
  for (let i = 0; i < 30; i++) R(g, (i * 71) % W, (i * 37) % 120, 1, 1, (t >> 3) % 3 === i % 3 ? WHITE : '#6868a8');
  /* curtains + stage */
  for (let x = 0; x < 40; x += 4) { R(g, x, 0, 3, 180, '#a80020'); R(g, W - 40 + x, 0, 3, 180, '#a80020'); R(g, x + 3, 0, 1, 180, '#6c0010'); R(g, W - 40 + x + 3, 0, 1, 180, '#6c0010'); }
  R(g, 0, 0, W, 10, '#a80020'); for (let x = 0; x < W; x += 16) disc4(x + 8, 10, 6, '#a80020');
  R(g, 0, 178, W, 62, '#6c3c2c'); for (let x = 0; x < W; x += 20) R(g, x, 178, 1, 62, '#4c2418'); R(g, 0, 178, W, 2, '#fcd890');
  /* spotlight */
  g.fillStyle = 'rgba(252,227,138,.12)'; g.beginPath(); g.moveTo(W / 2 - 14, 0); g.lineTo(W / 2 + 14, 0); g.lineTo(W / 2 + 58, 186); g.lineTo(W / 2 - 58, 186); g.fill();
  R(g, W / 2 - 50, 180, 100, 4, 'rgba(252,227,138,.25)');
  /* falling confetti pieces */
  for (let i = 0; i < 10; i++) {
    const k = KINDS[i % 7], px = 50 + (i * 97) % 220, py = ((t * (0.6 + (i % 3) * 0.25) + i * 40) % 220) - 30;
    for (const [cx, cy] of SHAPES[k][(i + (t >> 5)) % 4]) drawCell(px + cx * 6, py + cy * 6, k, i % 10);
  }
  /* moli at 3×, drawn natively so every edge stays a real pixel */
  const beat = Math.floor(t / 16), pose = DANCE[beat % DANCE.length], spin = pose === 'spin';
  const hop = pose === 'cheer' || pose === 'hands' || spin ? Math.abs(Math.sin(t * 0.2)) * 10 : 0;
  drawMoli(g, W / 2, 180 - hop, { t, z: 3, pose: spin ? 'cheer' : pose, f: spin ? ((t >> 2) % 2 ? 1 : -1) : 1, squint: true });
  drawFoe(g, W / 2 + 92, 140 + Math.sin(t * 0.2) * 5, { t, plaster: true, dizzy: t < 120 });
  text(g, 'YOU WIN!', W / 2, 24, { align: 'center', color: YEL, shadow: RED });
  text(g, '第一回合 通关！', W / 2, 38, { align: 'center', size: 14, fam: CJK, color: WHITE });
  text(g, 'SCORE ' + String(score).padStart(6, '0') + '  LINES ' + lines, W / 2, 200, { align: 'center', color: WHITE });
  text(g, '仅提供第一回合试玩', W / 2, 216, { align: 'center', size: 11, fam: CJK, color: '#fcd890' });
}

/* ---------- top level ---------- */
function begin() { resetRound(); S.paused = false; SFX.start(); setMode('ready'); }
return {
  get done() { return S.done; },
  get mode() { return S.mode; },
  get playing() { return S.mode === 'play' && !S.paused; },
  hints: [['←→', '移动'], ['↓ / ↑', '加速 / 直落'], ['K', 'A 右转'], ['J', 'B 左转'], ['Enter', '开始 / 暂停'], ['⌫', '返回卡带']],
  step,
  draw(live) {
    g.imageSmoothingEnabled = false;
    if (S.mode === 'title') drawTitle(live);
    else if (S.mode === 'ready') drawReady();
    else if (S.mode === 'play') drawPlay();
    else if (S.mode === 'over') drawOver();
    else drawClear();
  },
  music(live) {
    if (live && S.mode === 'play' && !S.paused && st !== 'dead' && foe.st !== 'ko') songPump(stackHeight() >= 14); else songStop();
  },
  key(k, down) {
    const was = keys[k]; if (k in keys) keys[k] = down;
    if (!down || was) return;
    S.idle = 0;
    if (S.mode === 'title') {
      if (k === 'S' || k === 'J') begin();
    } else if (S.mode === 'play') {
      if (k === 'S') { if (st !== 'dead') { S.paused = !S.paused; SFX.pause(); } return; }
      if (k === 'X') { songStop(); S.done = true; return; }
      if (S.paused || st !== 'fall' || !cur) return;
      if (k === 'J') tryRot(1);
      else if (k === 'B') tryRot(-1);
      else if (k === 'U') { const y = ghostY(); score += (y - cur.y) * 2; cur.y = y; lock(); }
    } else if (S.mode === 'over') {
      if (k === 'U' || k === 'D') { S.overSel ^= 1; SFX.blip(); }
      else if (k === 'S' || k === 'J') { if (S.overSel === 0) begin(); else S.done = true; }
    } else if (S.mode === 'clear' && (k === 'S' || k === 'J' || k === 'B')) { if (S.mt > 570) S.done = true; else if (S.mt > 120 && S.mt < 480) S.mt = 480; }
    if (k === 'X' && S.mode !== 'play') { songStop(); S.done = true; }
  },
  tap() {
    S.idle = 0;
    if (S.mode === 'title') begin();
    else if (S.mode === 'play' && S.paused) S.paused = false;
    else if (S.mode === 'over') { if (S.overSel === 0) begin(); else S.done = true; }
  },
  release() { for (const k in keys) keys[k] = false; songStop(); },
  stop() { songStop(); },
  sky() { return S.mode === 'play' ? 0x6c2c8c : S.mode === 'title' ? 0xf5c518 : 0x505060; },
  debug(arg) {
    begin(); setMode('play');
    if (arg === 'clear') setMode('clear');
    else if (arg === 'over') { S.overSel = 0; setMode('over'); }
    else if (arg === 'title') setMode('title');
  },
  /* test hooks */
  dbg: {
    get board() { return board; }, get cur() { return cur; }, get st() { return st; }, get foe() { return foe; }, get lines() { return lines; },
    get mo() { return mo; }, SHAPES, atk(k) { atkQ.push(k); }, fits, set garbage(n) { garbageQ = n; },
    fill(rows) { for (let y = ROWS - rows; y < ROWS; y++) for (let x = 0; x < COLS; x++) board[y][x] = x === 9 ? null : 'T'; },
  },
};
};
})();
