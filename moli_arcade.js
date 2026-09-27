/* 茉莉游戏机 — the in-world TV's game system.
   Everything renders into the TV screen canvas (320×240, NES-style 16px tiles);
   the room page maps that canvas onto the CRT and flies the camera into it. */
(function () {
'use strict';
const W = 320, H = 240, TS = 16, ROWS = 15;
const PIX = '"Press Start 2P", monospace';
const CJK = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const C = {
  sky: '#5c94fc', brick: '#c84c0c', light: '#fcbcb0', black: '#000000', ink: '#141217', white: '#fcfcfc',
  q: '#fc9838', pipe: '#00a800', pipeL: '#b8f818', pipeD: '#005000', bush: '#80d010', hill: '#00a800',
  yellow: '#f5c518', red: '#d82800', gold: '#fc9838',
};

/* ---------- pixel helpers ---------- */
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function sprite(rows, pal, flip) {
  const h = rows.length, w = rows[0].length, c = cv(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][flip ? w - 1 - x : x];
    if (pal[ch]) R(g, x, y, 1, 1, pal[ch]);
  }
  return c;
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -Math.floor(r); dy <= Math.floor(r); dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}

/* crisp text: rasterise once, hard-threshold alpha so the TV shows real pixels, cache */
const tcache = new Map();
function glyphs(s, color, size, fam) {
  const key = s + '|' + color + '|' + size + '|' + fam;
  let e = tcache.get(key); if (e) return e;
  if (tcache.size > 500) tcache.clear();
  const m = cv(1, 1).getContext('2d'); m.font = `${fam === PIX ? '' : '600 '}${size}px ${fam}`;
  const w = Math.max(1, Math.ceil(m.measureText(s).width) + 2), h = Math.ceil(size * 1.35) + 2;
  const c = cv(w, h), g = c.getContext('2d');
  g.font = m.font; g.textBaseline = 'top'; g.fillStyle = color; g.fillText(s, 1, 1);
  const d = g.getImageData(0, 0, w, h);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= (fam === PIX ? 110 : 72) ? 255 : 0;
  g.putImageData(d, 0, 0);
  e = { c, w }; tcache.set(key, e); return e;
}
function text(g, s, x, y, o = {}) {
  const { color = C.white, size = 8, fam = PIX, align = 'left', shadow = null } = o;
  s = String(s);
  const e = glyphs(s, color, size, fam);
  const dx = Math.round(align === 'center' ? x - e.w / 2 : align === 'right' ? x - e.w : x);
  if (shadow) g.drawImage(glyphs(s, shadow, size, fam).c, dx + 1, y + 1);
  g.drawImage(e.c, dx, y);
  return e.w;
}
if (document.fonts) {
  document.fonts.load('8px "Press Start 2P"').then(() => tcache.clear()).catch(() => {});
  document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => tcache.clear());
}

/* ---------- tiles ---------- */
const tile = fn => { const c = cv(16, 16); fn(c.getContext('2d')); return c; };
const TILE = {};
TILE.ground = tile(g => {
  R(g, 0, 0, 16, 16, C.brick);
  R(g, 0, 0, 9, 1, C.light); R(g, 10, 0, 5, 1, C.light); R(g, 0, 1, 1, 9, C.light); R(g, 10, 1, 1, 4, C.light);
  R(g, 9, 0, 1, 10, C.black); R(g, 15, 0, 1, 11, C.black); R(g, 10, 5, 5, 1, C.black);
  R(g, 0, 10, 9, 1, C.black); R(g, 10, 11, 5, 1, C.black);
  R(g, 1, 11, 1, 4, C.light); R(g, 1, 11, 5, 1, C.light); R(g, 11, 12, 1, 3, C.light);
  R(g, 6, 11, 1, 5, C.black); R(g, 0, 15, 16, 1, C.black);
});
TILE.brick = tile(g => {
  R(g, 0, 0, 16, 16, C.brick); R(g, 0, 0, 16, 1, C.light);
  for (const y of [3, 7, 11, 15]) R(g, 0, y, 16, 1, C.black);
  for (let row = 0; row < 4; row++) for (const x of row % 2 ? [3, 11] : [7, 15]) R(g, x, row * 4, 1, 3, C.black);
});
const QMARK = ['.XXXX.', 'XX..XX', 'XX..XX', '....XX', '...XX.', '..XX..', '..XX..', '......', '..XX..'];
TILE.q = ['#fc9838', '#fc9838', '#e8882a', '#c86c18'].map(fill => tile(g => {
  R(g, 0, 0, 16, 16, fill); R(g, 0, 0, 16, 1, C.brick); R(g, 0, 0, 1, 16, C.brick);
  R(g, 15, 0, 1, 16, C.black); R(g, 0, 15, 16, 1, C.black);
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) R(g, x, y, 1, 1, C.black);
  QMARK.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') { R(g, 5 + x + 1, 3 + y + 1, 1, 1, C.black); } }));
  QMARK.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') R(g, 5 + x, 3 + y, 1, 1, C.brick); }));
}));
TILE.used = tile(g => {
  R(g, 0, 0, 16, 16, C.black); R(g, 1, 1, 14, 14, C.brick);
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) R(g, x, y, 1, 1, C.black);
});
TILE.hard = tile(g => {
  R(g, 0, 0, 16, 16, C.brick); R(g, 0, 0, 15, 1, C.light); R(g, 0, 0, 1, 15, C.light);
  R(g, 15, 0, 1, 16, C.black); R(g, 0, 15, 16, 1, C.black);
  R(g, 2, 2, 11, 1, C.light); R(g, 2, 2, 1, 11, C.light); R(g, 13, 2, 1, 12, C.black); R(g, 2, 13, 12, 1, C.black);
});
const PIPE_TOP = cv(32, 16), PIPE_BODY = cv(32, 16);
(g => {
  R(g, 0, 0, 32, 16, C.black); R(g, 1, 1, 30, 14, C.pipe);
  R(g, 3, 1, 2, 14, C.pipeL); R(g, 7, 1, 1, 14, C.pipeL); R(g, 22, 1, 2, 14, C.pipeD); R(g, 26, 1, 1, 14, C.pipeD); R(g, 28, 1, 2, 14, C.pipeD);
})(PIPE_TOP.getContext('2d'));
(g => {
  R(g, 2, 0, 28, 16, C.black); R(g, 3, 0, 26, 16, C.pipe);
  R(g, 5, 0, 2, 16, C.pipeL); R(g, 9, 0, 1, 16, C.pipeL); R(g, 21, 0, 2, 16, C.pipeD); R(g, 25, 0, 1, 16, C.pipeD); R(g, 27, 0, 1, 16, C.pipeD);
})(PIPE_BODY.getContext('2d'));

/* ---------- sprites ---------- */
const MP = { k: C.ink, w: C.white, y: C.yellow, g: '#4d4858' };
/* small moli, facing right: dome body, ring eye looking ahead, a yellow navel dot, mitten hands off the sides */
const SMALL_BODY = [
  '.....kkkkkk.....',
  '....kgkkkkkk....',
  '...kgkkkwwwkk...',
  '...kgkkwwwwwk...',
  '...kkkkwwkkwk...',
  '...kkkkwwkkwk...',
  '...kkkkwwwwwk...',
  '...kkkkkwwwkk...',
  '..kkkkkkkkkkkk..',
  '.k.kkkkkkkkkk.k.',
  'kk.kkkkkykkkk.kk',
  'kk.kkkkkkkkkk.kk',
  '....kkkkkkkk....',
];
const SMALL_LEGS = {
  stand: ['.....k....k.....', '.....k....k.....', '.....kk...kk....'],
  walk1: ['.....k.....k....', '....k.......k...', '....kk......kk..'],
  walk2: ['......k..k......', '......k..k......', '......kk.kk.....'],
  jump: ['.....k....k.....', '....kk....kk....', '................'],
};
function smallRows(pose) {
  const rows = SMALL_BODY.slice();
  const put = (y, x, c) => { rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); };
  if (pose === 'jump') {
    /* right fist punches up */
    put(8, 13, '.'); for (const y of [9, 10, 11]) { put(y, 14, '.'); put(y, 15, '.'); }
    put(0, 14, 'k'); put(0, 15, 'k'); put(1, 14, 'k'); put(1, 15, 'k');
    for (let y = 2; y <= 7; y++) put(y, 14, 'k');
  }
  if (pose === 'walk1' || pose === 'walk2') { const o = pose === 'walk1' ? 1 : -1; for (const y of [10, 11]) { put(y, 0, o > 0 ? '.' : 'k'); put(y, 15, o > 0 ? 'k' : '.'); } }
  if (pose === 'dead') {
    for (let y = 2; y <= 7; y++) for (let x = 7; x <= 11; x++) put(y, x, 'k');
    for (let d = 0; d < 4; d++) { put(3 + d, 8 + d, 'w'); put(6 - d, 8 + d, 'w'); }
  }
  return rows.concat(SMALL_LEGS[pose === 'dead' ? 'stand' : pose]);
}
function bigRows(pose) {
  const g = Array.from({ length: 32 }, () => Array(16).fill('.'));
  const set = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 32) g[y][x] = c; };
  const HW = [2, 4, 4, 5];
  for (let y = 0; y <= 25; y++) {
    const hw = y < 4 ? HW[y] : y >= 24 ? (y === 24 ? 4 : 3) : 5;
    for (let x = 8 - hw; x <= 8 + hw; x++) set(x, y, 'k');
  }
  for (let y = 2; y <= 12; y++) set(8 - (y < 4 ? HW[y] : 5) + 1, y, 'g');
  for (let y = 5; y <= 12; y++) for (let x = 5; x <= 13; x++) {
    const dx = x - 9, dy = y - 8.5;
    if (dx * dx + dy * dy <= 11.5) set(x, y, pose === 'dead' ? (Math.abs(dy) < 1 ? 'w' : 'k') : 'w');
  }
  if (pose !== 'dead') for (let y = 7; y <= 10; y++) for (let x = 10; x <= 11; x++) set(x, y, 'k');
  set(8, 17, 'y'); set(9, 17, 'y'); set(8, 18, 'y'); set(9, 18, 'y');   // navel: just a yellow dot at this scale
  /* stick arms + mitten fists */
  for (let y = 11; y <= 16; y++) set(1, y, 'k');
  set(0, 17, 'k'); set(1, 17, 'k'); set(0, 18, 'k'); set(1, 18, 'k');
  if (pose === 'jump') {
    for (let y = 3; y <= 10; y++) set(15, y, 'k');
    set(14, 1, 'k'); set(15, 1, 'k'); set(14, 2, 'k'); set(15, 2, 'k');
  } else {
    for (let y = 11; y <= 16; y++) set(15, y, 'k');
    set(15, 17, 'k'); set(15, 18, 'k'); set(14, 18, 'k');
  }
  const legs = { stand: [[6, 6], [10, 10]], dead: [[6, 6], [10, 10]], walk1: [[6, 4], [10, 12]], walk2: [[7, 7], [9, 9]], jump: [[6, 4], [10, 12]] }[pose];
  for (const [top, bot] of legs) {
    const len = pose === 'jump' ? 4 : 5;
    for (let i = 0; i < len; i++) set(Math.round(top + (bot - top) * i / (len - 1)), 26 + i, 'k');
    const fy = 26 + len, fx = bot;
    set(fx, fy, 'k'); set(fx + (bot >= 8 ? 1 : -1), fy, 'k');
  }
  return g.map(r => r.join(''));
}
const MOLI = {};
for (const size of ['small', 'big']) {
  MOLI[size] = {};
  for (const pose of ['stand', 'walk1', 'walk2', 'jump', 'dead']) {
    const rows = size === 'small' ? smallRows(pose) : bigRows(pose);
    MOLI[size][pose] = [sprite(rows, MP, false), sprite(rows, MP, true)];
  }
}
const GP = { b: C.brick, t: C.light, k: C.black };
const GOOMBA_ROWS = [
  '......bbbb......',
  '.....bbbbbb.....',
  '....bbbbbbbb....',
  '...bbbbbbbbbb...',
  '..bkkbbbbbbkkb..',
  '.bbbtkbbbbktbbb.',
  '.bbbtkkkkkktbbb.',
  'bbbbtktbbtktbbbb',
  'bbbbtttbbtttbbbb',
  'bbbbbbbbbbbbbbbb',
  '.bbbbttttttbbbb.',
  '....tttttttt....',
  '....tttttttt....',
  '..kk.tttttt.....',
  '.kkkkkttttkkk...',
  '.kkkkk...kkkkk..',
];
const GOOMBA = [sprite(GOOMBA_ROWS, GP, false), sprite(GOOMBA_ROWS, GP, true)];
const GOOMBA_FLAT = sprite(['....bbbbbbbb....', '..bbkkbbbbkkbb..', '.bbbtkkkkkktbbb.', 'bbbbttbbbbttbbbb', '.bbbbbbbbbbbbbb.', '...tttttttttt...', '.kkkkk....kkkkk.', '.kkkkk....kkkkk.'], GP, false);
const MUSH = sprite([
  '......rrrr......',
  '....rrwwwwrr....',
  '...rrwwwwwwrr...',
  '..rrrwwwwwwrrr..',
  '.rrrrrwwwwrrrrr.',
  '.wwrrrrrrrrrrww.',
  'wwwwrrrrrrrrwwww',
  'wwwwrrrrrrrrwwww',
  'wwwrrrrrrrrrrwww',
  'rrrrrrrrrrrrrrrr',
  '.rrkkkkkkkkkkrr.',
  '...tttkttkttt...',
  '...tttkttkttt...',
  '...tttttttttt...',
  '....tttttttt....',
  '.....tttttt.....',
], { r: C.red, w: C.white, t: C.light, k: C.black }, false);
function coin(g, x, y, f) {
  const w = [6, 4, 2, 4][f % 4];
  R(g, x + 4 - w / 2, y + 1, w, 12, C.black); R(g, x + 4 - w / 2 + (w > 2 ? 1 : 0), y, w > 2 ? w - 2 : 2, 14, C.black);
  R(g, x + 4 - w / 2 + (w > 2 ? 1 : 0), y + 1, w > 2 ? w - 2 : 2, 12, C.gold);
  if (w > 2) R(g, x + 4 - w / 2 + 1, y + 3, 1, 8, C.light);
}

/* ---------- background period (48 tiles, like 1-1) ---------- */
function blobShape(g, x, y, n, fill) {
  const w = 16 * (n + 1), parts = [];
  for (let i = 0; i < n; i++) parts.push([x + 16 * (i + 1), y + 9, 9]);
  parts.push([x + 8, y + 15, 7], [x + w - 8, y + 15, 7]);
  for (const [cx, cy, r] of parts) disc(g, cx, cy, r + 1, C.black);
  R(g, x + 3, y + 14, w - 6, 10, C.black);
  for (const [cx, cy, r] of parts) disc(g, cx, cy, r, fill);
  R(g, x + 4, y + 14, w - 8, 9, fill);
}
function hill(g, x, big) {
  const base = 13 * TS, h = big ? 35 : 19, top = big ? 12 : 10, slope = big ? 1.2 : 1.5, cx = x + (big ? 40 : 24);
  const hw = yy => yy <= top ? Math.sqrt(Math.max(0, top * top - (top - yy) * (top - yy))) : top + (yy - top) * slope;
  for (let yy = 0; yy <= h; yy++) { const w = Math.round(hw(yy)) + 1; R(g, cx - w, base - h + yy - 1, w * 2 + 1, 1, C.black); }
  for (let yy = 1; yy <= h; yy++) { const w = Math.round(hw(yy)); R(g, cx - w, base - h + yy, w * 2 + 1, 1, C.hill); }
  const spots = big ? [[-8, 12], [6, 18], [-4, 26], [12, 28]] : [[-3, 9]];
  for (const [dx, dy] of spots) { R(g, cx + dx, base - h + dy, 2, 5, C.black); R(g, cx + dx - 1, base - h + dy + 1, 4, 3, C.black); }
}
const BG = cv(48 * TS, H);
(g => {
  R(g, 0, 0, BG.width, H, C.sky);
  hill(g, 0, true); hill(g, 16 * TS, false);
  for (const [c, n] of [[11, 3], [23, 1], [41, 2]]) blobShape(g, c * TS, 13 * TS - 23, n, C.bush);
  for (const [c, r, n] of [[8, 3, 1], [19, 2, 3], [27, 3, 2], [36, 2, 1]]) blobShape(g, c * TS, r * TS, n, C.white);
})(BG.getContext('2d'));

/* ---------- World 1-1 ---------- */
const COLS = 212;
const T = { SKY: 0, GROUND: 1, BRICK: 2, Q: 3, USED: 4, HARD: 5, PTL: 6, PTR: 7, PL: 8, PR: 9 };
const FLAG_COL = 198, CASTLE_COL = 202;
const GOOMBAS = [[22], [40], [51], [52.5], [80, 4], [82, 4], [97], [98.5], [107], [114], [115.5], [124], [125.5], [128], [129.5], [174], [175.5]];
let map, content, multi;
function buildLevel() {
  map = new Uint8Array(COLS * ROWS); content = new Map(); multi = new Map();
  const set = (c, r, v) => { map[c * ROWS + r] = v; };
  const gaps = [[69, 70], [86, 88], [153, 154]];
  for (let c = 0; c < COLS; c++) if (!gaps.some(([a, b]) => c >= a && c <= b)) { set(c, 13, T.GROUND); set(c, 14, T.GROUND); }
  const q = (c, r, what = 'coin') => { set(c, r, T.Q); content.set(c * ROWS + r, what); };
  const b = (c, r, what) => { set(c, r, T.BRICK); if (what) { content.set(c * ROWS + r, what); if (what === 'multi') multi.set(c * ROWS + r, 8); } };
  q(16, 9); b(20, 9); q(21, 9, 'mush'); b(22, 9); q(23, 9); b(24, 9); q(22, 5);
  b(77, 9); q(78, 9, 'mush'); b(79, 9); for (let c = 80; c <= 87; c++) b(c, 5);
  for (let c = 91; c <= 93; c++) b(c, 5); q(94, 5); b(94, 9, 'multi');
  b(100, 9); b(101, 9);
  q(106, 9); q(109, 9); q(112, 9); q(109, 5, 'mush');
  b(118, 9); for (let c = 121; c <= 123; c++) b(c, 5);
  b(128, 5); q(129, 5); q(130, 5); b(131, 5); b(129, 9); b(130, 9);
  b(168, 9); b(169, 9); q(170, 9); b(171, 9);
  const pipe = (c, h) => { const top = 13 - h; set(c, top, T.PTL); set(c + 1, top, T.PTR); for (let r = top + 1; r < 13; r++) { set(c, r, T.PL); set(c + 1, r, T.PR); } };
  pipe(28, 2); pipe(38, 3); pipe(46, 4); pipe(57, 4); pipe(163, 2); pipe(179, 2);
  const stack = (c, h) => { for (let r = 13 - h; r < 13; r++) set(c, r, T.HARD); };
  for (let i = 0; i < 4; i++) { stack(134 + i, i + 1); stack(140 + i, 4 - i); stack(148 + i, i + 1); stack(155 + i, 4 - i); }
  stack(152, 4);
  for (let i = 0; i < 8; i++) stack(181 + i, i + 1);
  stack(189, 8);
  set(FLAG_COL, 12, T.HARD);
}
const at = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? 0 : map[c * ROWS + r];
const solid = (c, r) => at(c, r) !== 0;

/* ---------- audio: tiny square-wave SFX ---------- */
let ac = null, muted = false, sfxBus = null;
/* every cartridge's sound effects go through one bus: boosted so they cut through the recorded soundtrack, a compressor catches the peaks */
function sfxOut() {
  if (!sfxBus) {
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
    sfxBus = ac.createGain(); sfxBus.gain.value = 5; sfxBus.connect(comp); comp.connect(ac.destination);
  }
  return sfxBus;
}
function wakeAudio() {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
}
function tone(f, d, type = 'square', f2 = 0, vol = 0.05, delay = 0) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
  o.connect(g); g.connect(sfxOut()); o.start(t0); o.stop(t0 + d + 0.03);
}
const seq = (notes, step, type = 'square', vol = 0.05) => notes.forEach((f, i) => f && tone(f, step * 0.95, type, 0, vol, i * step));
const SFX = {
  jump: () => tone(260, 0.2, 'square', 640, 0.04),
  coin: () => { tone(988, 0.06, 'square', 0, 0.04); tone(1319, 0.3, 'square', 0, 0.04, 0.06); },
  stomp: () => tone(520, 0.12, 'square', 130, 0.05),
  bump: () => tone(150, 0.09, 'triangle', 90, 0.12),
  brk: () => { tone(240, 0.16, 'sawtooth', 50, 0.05); tone(180, 0.12, 'square', 60, 0.03, 0.03); },
  sprout: () => seq([392, 523, 659, 784, 1046], 0.05),
  power: () => seq([523, 392, 523, 659, 784, 1046, 784, 1046], 0.06),
  pipe: () => seq([330, 262, 196], 0.08),
  hurt: () => seq([784, 523, 392, 262], 0.07),
  die: () => seq([494, 698, 0, 698, 698, 659, 587, 523, 330, 0, 262], 0.11),
  flag: () => tone(1200, 0.9, 'square', 200, 0.04),
  clear: () => seq([392, 523, 659, 784, 1046, 1319, 1568, 0, 1319, 0, 1568], 0.1),
  blip: () => tone(880, 0.05, 'square', 0, 0.035),
  start: () => seq([523, 0, 659, 784, 0, 659, 880, 0, 1046], 0.08),
  deny: () => { tone(160, 0.12, 'square', 0, 0.05); tone(120, 0.18, 'square', 0, 0.05, 0.12); },
  pause: () => seq([988, 784, 988, 784], 0.07),
};

/* ---------- BGM: an original bouncy overworld loop (lead square · triangle bass · noise hat) ---------- */
const LEAD = [
  [76,2],[0,1],[79,1],[0,2],[81,2],[79,2],[76,2],[72,2],[74,2],  [76,3],[74,1],[72,2],[69,2],[72,4],[0,4],
  [76,2],[0,1],[79,1],[0,2],[81,2],[84,2],[83,2],[81,2],[79,2],  [77,3],[76,1],[74,2],[79,2],[72,6],[0,2],
  [77,2],[81,2],[84,2],[81,2],[77,2],[81,2],[84,4],              [83,2],[79,2],[74,2],[79,2],[83,2],[86,2],[83,4],
  [84,2],[83,2],[81,2],[79,2],[77,2],[76,2],[74,2],[72,2],       [74,2],[76,2],[79,2],[74,2],[72,4],[0,4],
];
const ROOTS = [48, 41, 48, 43, 41, 43, 45, 43];
const BASS_BAR = [[0, 0], [3, 0], [6, 7], [8, 12], [12, 7], [14, 12]];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let noiseBuf = null;
const bgm = { on: false, t: 0, step: 0, li: 0, lstep: 0, bus: null };
function bgmStop() {
  if (!bgm.on) return; bgm.on = false;
  if (bgm.bus && ac) { const g = bgm.bus; g.gain.setTargetAtTime(0, ac.currentTime, 0.03); setTimeout(() => g.disconnect(), 400); }
  bgm.bus = null;
}
function bgmStart() {
  if (!ac || muted || bgm.on) return;
  bgm.on = true; bgm.t = ac.currentTime + 0.06; bgm.step = 0; bgm.li = 0; bgm.lstep = 0;
  bgm.bus = ac.createGain(); bgm.bus.gain.value = 1; bgm.bus.connect(ac.destination);
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
}
/* NES-ish pulse channels: 25% duty for the lead, 12.5% for the harmony */
const pulses = {};
function pulse(duty) {
  if (pulses[duty]) return pulses[duty];
  const N = 64, re = new Float32Array(N), im = new Float32Array(N);
  for (let k = 1; k < N; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.cos(k * Math.PI * duty), re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty) * Math.sin(k * Math.PI * duty);
  return (pulses[duty] = ac.createPeriodicWave(re, im));
}
const SCALE = [0, 2, 4, 5, 7, 9, 11];
function third(n) { const pc = n % 12, i = SCALE.indexOf(pc); if (i < 0) return n - 3; const j = i - 2, oct = j < 0 ? -12 : 0; return n - pc + SCALE[(j + 7) % 7] + oct; }
function voice(type, f, t0, d, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  if (typeof type === 'number') o.setPeriodicWave(pulse(type)); else o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.006); g.gain.setTargetAtTime(vol * 0.55, t0 + 0.02, 0.05); g.gain.setTargetAtTime(0, t0 + d * 0.85, 0.015);
  o.connect(g); g.connect(bgm.bus); o.start(t0); o.stop(t0 + d + 0.08);
}
function bgmPump(hurry) {
  if (!bgm.on || !ac) return;
  const sx = hurry ? 0.056 : 0.072;                 // seconds per 16th
  if (bgm.t < ac.currentTime - 0.25) bgm.t = ac.currentTime + 0.02;   // tab was asleep: don't burst-play the backlog
  while (bgm.t < ac.currentTime + 0.18) {
    const s16 = bgm.step % 128, bar = s16 >> 4, inBar = s16 & 15, t0 = bgm.t;
    if (bgm.lstep === 0) {
      const [n, len] = LEAD[bgm.li];
      if (n) { voice(0.25, midi(n), t0, Math.min(len, 3) * sx, 0.05); voice(0.125, midi(third(n)), t0, Math.min(len, 2) * sx, 0.022); }
      bgm.lstep = len; bgm.li = (bgm.li + 1) % LEAD.length;
    }
    bgm.lstep--;
    for (const [at, iv] of BASS_BAR) if (at === inBar) voice('triangle', midi(ROOTS[bar] + iv), t0, sx * 1.6, 0.11);
    if (inBar % 2 === 0) {
      const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7000;
      g.gain.setValueAtTime(inBar % 4 === 2 ? 0.05 : 0.022, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.04);
      src.connect(hp); hp.connect(g); g.connect(bgm.bus); src.start(t0); src.stop(t0 + 0.05);
    }
    bgm.t += sx; bgm.step++;
  }
}

/* ---------- cartridges ---------- */
const GAMES = [
  { id: 'moli', cn: '超级茉莉', en: 'SUPER MOLI', color: '#e4502a', ready: true, tag: '1-1 · 可以玩' },
  { id: 'contra', cn: '魂斗茉莉', en: 'MOLI FORCE', color: '#3d8a3a', ready: true, ext: 'MoliContra', tag: '丛林 · 可以玩' },
  { id: 'blocks', cn: '茉莉方块', en: 'MOLI BLOCKS', color: '#6e5bd6', ready: true, ext: 'MoliBlocks', tag: '对战 · 可以玩' },
  { id: 'circus', cn: '茉莉马戏团', en: 'MOLI CIRCUS', color: '#d1447e', ready: true, ext: 'MoliCircus', tag: '马戏 · 可以玩' },
];

/* shown after every stage clear: a fan tribute, first stage only, nothing more planned */
const DISCLAIMER_CN = ['本游戏为同人练习作品', '仅用于学习与技术演示', '只提供第一关试玩，不会制作更多内容', '非商业用途，无意侵犯任何权利', '原作相关权利归其权利人所有'];
const DISCLAIMER_EN = ['A fan-made tribute for learning', 'and demonstration only. First stage', 'trial only; no further content is', 'planned. Non-commercial, no', 'infringement intended. All rights', 'belong to their respective owners.'];
function disclaimer(g, t) {
  R(g, 0, 0, W, H, '#000');
  text(g, '声明 · NOTICE', W / 2, 14, { align: 'center', size: 14, fam: CJK, color: '#f5c518' });
  R(g, 40, 36, W - 80, 1, '#3a3650');
  DISCLAIMER_CN.forEach((l, i) => text(g, l, W / 2, 44 + i * 17, { align: 'center', size: 12, fam: CJK, color: '#fcfcfc' }));
  R(g, 40, 132, W - 80, 1, '#3a3650');
  DISCLAIMER_EN.forEach((l, i) => text(g, l, W / 2, 140 + i * 12, { align: 'center', color: '#b7b3c6' }));
  if (t > 90 && (t >> 5) % 2 === 0) text(g, '按 K / 回车 返回', W / 2, 222, { align: 'center', size: 11, fam: CJK, color: '#6e6a80' });
}

/* shared kit for cartridges that live in their own file (moli_contra.js …) */
window.MoliKit = { W, H, TS, PIX, CJK, C, cv, R, sprite, disc, text, glyphs, tone, seq, midi, disclaimer,
  pulse: d => pulse(d), get ac() { return ac; }, get out() { return ac ? sfxOut() : null; }, get muted() { return muted; } };
const MARIO_HINTS = [['←→', '移动'], ['K / Z', 'A 跳跃'], ['J / X', 'B 冲刺'], ['Enter', '开始 / 暂停'], ['⌫', '返回卡带']];
const MENU_HINTS = [['↑↓', '选卡带'], ['K / Enter', '开始'], ['Esc', '离开电视']];

window.MoliArcade = function (canvas) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const S = {
    mode: 'menu', sel: 0, t: 0, frame: 0, toast: 0, toastMsg: '', paused: false,
    score: 0, coins: 0, lives: 3, time: 400, timeF: 0, checkpoint: false, startCol: 3, modeT: 0,
  };
  const keys = { L: false, R: false, U: false, D: false, J: false, B: false };
  let jumpBuf = 0, acc = 0;
  let p, cam, enemies, items, fx, bumps, flag;
  let ext = null, extId = '';                 // a cartridge from another file, while it's in the slot

  const KEYMAP = {
    ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D',
    KeyZ: 'J', Space: 'J', KeyK: 'J', KeyX: 'B', ShiftLeft: 'B', ShiftRight: 'B', KeyJ: 'B',
  };

  function resetLevel() {
    buildLevel();
    const c = S.checkpoint ? 90 : S.startCol;
    p = { x: c * TS + 2, y: 13 * TS - 16, vx: 0, vy: 0, w: 12, h: 16, big: false, face: 1, ground: true, inv: 0, dead: false, deadT: 0, anim: 0, freeze: 0, growT: 0, hidden: false };
    cam = Math.max(0, Math.min(p.x - 120, COLS * TS - W));
    enemies = GOOMBAS.map(([c, r = 12]) => ({ x: c * TS, y: r * TS, w: 16, h: 16, vx: -0.5, vy: 0, alive: true, active: false, flat: 0, flip: false }));
    items = []; fx = []; bumps = [];
    flag = { y: 3 * TS + 4, state: 0, t: 0 };
    S.time = 400; S.timeF = 0;
  }
  function setMode(m) { S.mode = m; S.modeT = 0; }
  function startGame() {
    S.score = 0; S.coins = 0; S.lives = 3; S.checkpoint = false; S.paused = false;
    SFX.start(); setMode('intro');
  }
  function popup(x, y, s) { fx.push({ k: 'pop', x, y, s, t: 0 }); }
  function addScore(n, x, y) { S.score += n; if (x !== undefined) popup(x, y, n); }
  function addCoin() { S.coins++; if (S.coins >= 100) { S.coins -= 100; S.lives++; } }

  /* ---------- physics ---------- */
  function moveX(e, dx) {
    e.x += dx;
    const r0 = Math.floor(e.y / TS), r1 = Math.floor((e.y + e.h - 1) / TS);
    if (dx > 0) { const c = Math.floor((e.x + e.w - 1) / TS); for (let r = r0; r <= r1; r++) if (solid(c, r)) { e.x = c * TS - e.w; return true; } }
    else if (dx < 0) { const c = Math.floor(e.x / TS); for (let r = r0; r <= r1; r++) if (solid(c, r)) { e.x = (c + 1) * TS; return true; } }
    return false;
  }
  function moveY(e, dy) {
    e.y += dy;
    const c0 = Math.floor(e.x / TS), c1 = Math.floor((e.x + e.w - 1) / TS);
    if (dy > 0) { const r = Math.floor((e.y + e.h - 0.001) / TS);  /* feet resting exactly on a tile edge still count as ground, so the pose never flickers */ for (let c = c0; c <= c1; c++) if (solid(c, r)) { e.y = r * TS - e.h; return { floor: true }; } }
    else if (dy < 0) {
      const r = Math.floor(e.y / TS); let best = null, bd = 99;
      const mid = e.x + e.w / 2;
      for (let c = c0; c <= c1; c++) if (solid(c, r)) { const d = Math.abs(c * TS + 8 - mid); if (d < bd) { bd = d; best = c; } }
      if (best !== null) { e.y = (r + 1) * TS; return { ceil: true, c: best, r }; }
    }
    return null;
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function bump(c, r) {
    const k = c * ROWS + r, v = at(c, r);
    for (const e of enemies) if (e.alive && !e.flip && Math.abs(e.y + e.h - r * TS) < 2 && e.x + e.w > c * TS && e.x < c * TS + TS) { e.flip = true; e.vy = -3; addScore(100, e.x, e.y); SFX.stomp(); }
    for (const it of items) if (it.k === 'mush' && !it.emerge && Math.abs(it.y + it.h - r * TS) < 2 && it.x + it.w > c * TS && it.x < c * TS + TS) { it.vy = -3.5; it.vx = it.x + 8 < c * TS + 8 ? -1 : 1; }
    if (v === T.Q || (v === T.BRICK && content.has(k))) {
      const what = content.get(k);
      bumps.push({ c, r, t: 0 });
      if (what === 'mush') { items.push({ k: 'mush', x: c * TS, y: r * TS, w: 16, h: 16, vx: 1, vy: 0, emerge: 16 }); SFX.sprout(); map[k] = T.USED; content.delete(k); }
      else {
        fx.push({ k: 'coin', x: c * TS + 4, y: r * TS - 16, vy: -5, t: 0 }); addCoin(); S.score += 200; SFX.coin();
        if (what === 'multi') { const n = multi.get(k) - 1; multi.set(k, n); if (n <= 0) { map[k] = T.USED; content.delete(k); } }
        else { map[k] = T.USED; content.delete(k); }
      }
    } else if (v === T.BRICK) {
      if (p.big) {
        map[k] = T.SKY; SFX.brk(); S.score += 50;
        for (const [dx, dy, vx, vy] of [[0, 0, -1, -6], [8, 0, 1, -6], [0, 8, -1, -4], [8, 8, 1, -4]]) fx.push({ k: 'deb', x: c * TS + dx, y: r * TS + dy, vx, vy, t: 0 });
      } else { bumps.push({ c, r, t: 0 }); SFX.bump(); }
    } else SFX.bump();
  }

  function hurt() {
    if (p.inv > 0 || p.dead) return;
    if (p.big) { p.big = false; p.h = 16; p.y += 12; p.inv = 120; p.freeze = 40; p.growT = -40; SFX.hurt(); }
    else die();
  }
  function die() { if (p.dead) return; p.dead = true; p.deadT = 0; p.vx = 0; p.vy = 0; SFX.die(); }

  function stepPlay() {
    if (S.paused) return;
    const f = S.frame;
    /* flag sequence */
    if (flag.state) { stepFlag(); stepFx(); return; }
    if (p.dead) {
      p.deadT++;
      if (p.deadT === 30) p.vy = -5;
      if (p.deadT > 30) { p.vy = Math.min(p.vy + 0.25, 5); p.y += p.vy; }
      if (p.deadT > 170) {
        S.lives--;
        if (S.lives <= 0) setMode('over'); else setMode('intro');
      }
      return;
    }
    if (p.freeze > 0) { p.freeze--; if (p.freeze === 0) p.growT = 0; return; }

    /* timer */
    if (++S.timeF >= 24) { S.timeF = 0; S.time--; if (S.time === 100) SFX.pause(); if (S.time <= 0) { S.time = 0; die(); return; } }

    /* run / walk */
    const dir = (keys.R ? 1 : 0) - (keys.L ? 1 : 0);
    const max = keys.B ? 2.5 : 1.5;
    if (dir) {
      const skid = Math.sign(p.vx) === -dir && Math.abs(p.vx) > 0.4;
      p.vx += dir * (skid ? 0.2 : p.ground ? (keys.B ? 0.1 : 0.07) : 0.06);
      if (Math.abs(p.vx) > max) p.vx = Math.sign(p.vx) * Math.max(max, Math.abs(p.vx) - 0.05);
      if (p.ground) p.face = dir;
    } else if (p.ground) {
      p.vx = Math.abs(p.vx) < 0.08 ? 0 : p.vx - Math.sign(p.vx) * 0.08;
    }
    if (jumpBuf > 0 && p.ground) {
      p.vy = Math.abs(p.vx) > 2 ? -5.0 : -4.6; p.ground = false; jumpBuf = 0; SFX.jump();
    }
    if (jumpBuf > 0) jumpBuf--;
    p.vy += (p.vy < 0 && keys.J) ? 0.15 : 0.45;
    if (p.vy > 4.5) p.vy = 4.5;
    if (moveX(p, p.vx)) p.vx = 0;
    if (p.x < cam) { p.x = cam; if (p.vx < 0) p.vx = 0; }
    const hit = moveY(p, p.vy);
    if (hit && hit.floor) { p.ground = true; p.vy = 0; }
    else { p.ground = false; if (hit && hit.ceil) { p.vy = 1; bump(hit.c, hit.r); } }
    if (p.y > H + 16) { die(); return; }
    if (p.inv > 0) p.inv--;
    p.anim += Math.abs(p.vx) * 0.12;

    /* camera only scrolls forward */
    const target = p.x - 136;
    if (target > cam) cam = Math.min(target, COLS * TS - W);
    if (p.x > 90 * TS) S.checkpoint = true;

    /* flag */
    if (p.x + p.w >= FLAG_COL * TS + 6) {
      flag.state = 1; flag.t = 0; p.vx = 0; p.vy = 0; p.x = FLAG_COL * TS + 7 - p.w; p.face = 1;
      const y = p.y + p.h;
      addScore(y < 80 ? 5000 : y < 112 ? 2000 : y < 144 ? 800 : y < 176 ? 400 : 100, FLAG_COL * TS + 12, p.y);
      SFX.flag();
      return;
    }

    stepEnemies(); stepItems(); stepFx();
    for (const b of bumps) b.t++;
    bumps = bumps.filter(b => b.t < 10);
    void f;
  }
  function stepEnemies() {
    for (const e of enemies) {
      if (!e.alive) { if (e.flat > 0) e.flat--; continue; }
      if (e.flip) { e.vy += 0.3; e.y += e.vy; e.x += 0.6; if (e.y > H + 20) e.alive = false; continue; }
      if (!e.active) { if (e.x < cam + W + 24) e.active = true; else continue; }
      e.vy = Math.min(e.vy + 0.3, 4);
      if (moveX(e, e.vx)) e.vx = -e.vx;
      const h = moveY(e, e.vy); if (h && h.floor) e.vy = 0;
      if (e.y > H + 20 || e.x < cam - 48) { e.alive = false; continue; }
      for (const o of enemies) if (o !== e && o.alive && !o.flip && o.active && overlap(e, o)) {
        if ((e.x < o.x && e.vx > 0) || (e.x > o.x && e.vx < 0)) e.vx = -e.vx;
      }
      if (!p.dead && overlap({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: e.x + 2, y: e.y + 3, w: 12, h: 13 })) {
        if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 8) {
          e.alive = false; e.flat = 30; p.vy = keys.J ? -4.6 : -3.2; p.ground = false;
          addScore(100, e.x, e.y); SFX.stomp();
        } else hurt();
      }
    }
  }
  function stepItems() {
    for (const it of items) {
      if (it.dead) continue;
      if (it.emerge > 0) { it.y -= 0.5; it.emerge -= 0.5; continue; }
      it.vy = Math.min(it.vy + 0.3, 4);
      if (moveX(it, it.vx)) it.vx = -it.vx;
      const h = moveY(it, it.vy); if (h && h.floor) it.vy = 0;
      if (it.y > H + 20) it.dead = true;
      if (!p.dead && overlap(p, it)) {
        it.dead = true; addScore(1000, it.x, it.y); SFX.power();
        if (!p.big) { p.big = true; p.h = 28; p.y -= 12; p.freeze = 50; p.growT = 50; }
      }
    }
    items = items.filter(i => !i.dead);
  }
  function stepFx() {
    for (const e of fx) {
      e.t++;
      if (e.k === 'coin') { e.y += e.vy; e.vy += 0.35; if (e.t === 28) popup(e.x - 4, e.y, 200); }
      else if (e.k === 'deb') { e.x += e.vx; e.y += e.vy; e.vy += 0.3; }
      else if (e.k === 'pop') e.y -= 0.6;
    }
    fx = fx.filter(e => (e.k === 'coin' ? e.t < 28 : e.k === 'deb' ? e.y < H + 10 : e.t < 50));
  }
  function stepFlag() {
    flag.t++;
    const bottom = 12 * TS;
    if (flag.state === 1) {
      if (p.y + p.h < bottom) p.y = Math.min(bottom - p.h, p.y + 2.2);
      if (flag.y < 11 * TS) flag.y += 2.2;
      if (p.y + p.h >= bottom && flag.y >= 11 * TS) { flag.state = 2; flag.t = 0; p.face = -1; p.x = FLAG_COL * TS + 9; }
    } else if (flag.state === 2) {
      if (flag.t > 24) { flag.state = 3; flag.t = 0; p.face = 1; }
    } else if (flag.state === 3) {
      p.vx = 1.25; p.vy = Math.min(p.vy + 0.45, 4);
      moveX(p, p.vx); const h = moveY(p, p.vy); p.ground = !!(h && h.floor); if (p.ground) p.vy = 0;
      p.anim += 0.15;
      if (p.x + p.w / 2 >= (CASTLE_COL + 2) * TS + 8) { p.hidden = true; flag.state = 4; flag.t = 0; }
    } else if (flag.state === 4) {
      if (S.time > 0) { const n = Math.min(S.time, 2); S.time -= n; S.score += n * 50; if (flag.t % 4 === 0) SFX.blip(); }
      else if (flag.t > 20) { flag.state = 5; flag.t = 0; SFX.clear(); }
    } else if (flag.state === 5) {
      if (flag.t > 60 * 5) { setMode('clear'); }
    }
  }

  /* ---------- drawing: level ---------- */
  function drawTile(v, x, y, c, r) {
    if (v === T.GROUND) g.drawImage(TILE.ground, x, y);
    else if (v === T.BRICK) g.drawImage(TILE.brick, x, y);
    else if (v === T.Q) g.drawImage(TILE.q[Math.floor(S.frame / 8) % 4], x, y);
    else if (v === T.USED) g.drawImage(TILE.used, x, y);
    else if (v === T.HARD) g.drawImage(TILE.hard, x, y);
    else if (v === T.PTL) g.drawImage(PIPE_TOP, 0, 0, 16, 16, x, y, 16, 16);
    else if (v === T.PTR) g.drawImage(PIPE_TOP, 16, 0, 16, 16, x, y, 16, 16);
    else if (v === T.PL) g.drawImage(PIPE_BODY, 0, 0, 16, 16, x, y, 16, 16);
    else if (v === T.PR) g.drawImage(PIPE_BODY, 16, 0, 16, 16, x, y, 16, 16);
    void c; void r;
  }
  function drawCastle(cx) {
    const x0 = CASTLE_COL * TS - cx;
    if (x0 > W || x0 + 5 * TS < 0) return;
    for (let c = 0; c < 5; c++) for (const r of [11, 12]) g.drawImage(TILE.brick, x0 + c * TS, r * TS);
    for (let c = 0; c < 5; c++) { R(g, x0 + c * TS, 10 * TS + 8, TS, 8, C.brick); R(g, x0 + c * TS + 5, 10 * TS + 8, 6, 3, C.sky); R(g, x0 + c * TS, 10 * TS + 8, TS, 1, C.black); }
    for (let c = 1; c < 4; c++) for (const r of [8, 9]) g.drawImage(TILE.brick, x0 + c * TS, r * TS + 8);
    for (let c = 1; c < 4; c++) { R(g, x0 + c * TS, 8 * TS, TS, 8, C.brick); R(g, x0 + c * TS + 5, 8 * TS, 6, 3, C.sky); }
    R(g, x0 + TS + 4, 9 * TS, 6, 12, C.black); R(g, x0 + 3 * TS + 6, 9 * TS, 6, 12, C.black);
    R(g, x0 + 2 * TS + 1, 11 * TS + 4, 14, 28, C.black); disc(g, x0 + 2 * TS + 8, 11 * TS + 7, 7, C.black);
    /* moli's flag goes up the castle when you clear */
    if (flag.state >= 5) { const fy = 7 * TS + 8 - Math.min(20, flag.t * 0.5); R(g, x0 + 2 * TS + 7, fy, 1, 18, C.black); R(g, x0 + 2 * TS + 8, fy, 10, 8, C.yellow); }
  }
  function drawFlag(cx) {
    const x = FLAG_COL * TS + 7 - cx;
    if (x < -24 || x > W + 8) return;
    R(g, x, 3 * TS + 2, 2, 12 * TS - 3 * TS - 2, C.pipeL); R(g, x + 1, 3 * TS + 2, 1, 9 * TS - 2, C.pipe);
    disc(g, x + 1, 3 * TS - 2, 5, C.black); disc(g, x + 1, 3 * TS - 2, 4, C.pipe); R(g, x - 1, 3 * TS - 4, 2, 2, C.pipeL);
    /* yellow pennant with moli's ink × */
    const fy = Math.round(flag.y);
    for (let i = 0; i < 16; i++) { const w = 16 - Math.abs(i - 8) * 2; R(g, x - w, fy + i, w, 1, C.white); }
    for (let i = 1; i < 15; i++) { const w = 15 - Math.abs(i - 8) * 2; if (w > 0) R(g, x - w, fy + i, w, 1, C.yellow); }
    for (let d = -2; d <= 2; d++) { R(g, x - 8 + d, fy + 8 + d, 1, 1, C.ink); R(g, x - 8 - d, fy + 8 + d, 1, 1, C.ink); }
  }
  function drawMoli(x, y) {
    if (p.hidden) return;
    if (p.inv > 0 && Math.floor(p.inv / 3) % 2) return;
    let size = p.big ? 'big' : 'small';
    if (p.freeze > 0 && p.growT !== 0) size = Math.floor(p.freeze / 5) % 2 ? 'big' : 'small';
    let pose = 'stand';
    if (p.dead) pose = 'dead';
    else if (flag.state === 1 || flag.state === 2) pose = 'jump';
    else if (!p.ground && flag.state === 0) pose = 'jump';
    else if (Math.abs(p.vx) > 0.1) pose = Math.floor(p.anim) % 2 ? 'walk1' : 'walk2';
    const img = MOLI[size][pose][p.face > 0 ? 0 : 1];
    g.drawImage(img, Math.round(x - 2), Math.round(y + p.h - img.height));
  }
  function drawHUD() {
    text(g, 'MOLI', 24, 8, { shadow: C.black });
    text(g, String(S.score).padStart(6, '0'), 24, 17, { shadow: C.black });
    coin(g, 104, 16, Math.floor(S.frame / 10) % 3 === 0 ? 0 : 1);
    text(g, 'x' + String(S.coins).padStart(2, '0'), 114, 17, { shadow: C.black });
    text(g, 'WORLD', 168, 8, { shadow: C.black }); text(g, '1-1', 176, 17, { shadow: C.black });
    text(g, 'TIME', 248, 8, { shadow: C.black });
    if (S.mode === 'play') text(g, String(S.time).padStart(3, ' '), 256, 17, { shadow: C.black });
  }
  function drawPlay() {
    const cx = Math.round(cam);
    const o = cx % BG.width;
    g.drawImage(BG, -o, 0); g.drawImage(BG, BG.width - o, 0);
    drawCastle(cx);
    for (const it of items) if (it.emerge > 0) g.drawImage(MUSH, Math.round(it.x - cx), Math.round(it.y));
    const c0 = Math.floor(cx / TS), c1 = Math.min(COLS - 1, c0 + 21);
    for (let c = c0; c <= c1; c++) for (let r = 0; r < ROWS; r++) {
      const v = at(c, r); if (!v) continue;
      const b = bumps.find(b => b.c === c && b.r === r);
      const off = b ? -Math.round(Math.sin(b.t / 10 * Math.PI) * 5) : 0;
      drawTile(v, c * TS - cx, r * TS + off, c, r);
    }
    drawFlag(cx);
    for (const it of items) if (!it.emerge) g.drawImage(MUSH, Math.round(it.x - cx), Math.round(it.y));
    for (const e of enemies) {
      if (!e.active && e.alive) continue;
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.flip) { g.save(); g.translate(x, y + 16); g.scale(1, -1); g.drawImage(GOOMBA[0], 0, 0); g.restore(); }
      else if (e.alive) g.drawImage(GOOMBA[Math.floor(S.frame / 10) % 2], x, y);
      else if (e.flat > 0) g.drawImage(GOOMBA_FLAT, x, y + 8);
    }
    for (const e of fx) {
      if (e.k === 'coin') coin(g, Math.round(e.x - cx), Math.round(e.y), Math.floor(e.t / 3));
      else if (e.k === 'deb') { R(g, Math.round(e.x - cx), Math.round(e.y), 6, 6, C.black); R(g, Math.round(e.x - cx) + 1, Math.round(e.y) + 1, 4, 4, C.brick); }
    }
    drawMoli(p.x - cx, p.y);
    for (const e of fx) if (e.k === 'pop') text(g, e.s, Math.round(e.x - cx), Math.round(e.y), { shadow: C.black });
    drawHUD();
    if (flag.state === 5) {
      text(g, 'COURSE CLEAR!', W / 2, 84, { align: 'center', shadow: C.black });
      text(g, '谢谢你，茉莉！', W / 2, 100, { align: 'center', size: 16, fam: CJK, shadow: C.black });
    }
    if (S.paused) {
      R(g, 0, 0, W, H, 'rgba(0,0,0,.45)');
      text(g, 'PAUSE', W / 2, 104, { align: 'center', shadow: C.black });
      text(g, '按 回车 继续', W / 2, 120, { align: 'center', size: 14, fam: CJK, color: C.yellow });
    }
  }

  /* ---------- drawing: menu + covers ---------- */
  function coverMoli(cg, w, h, t) {
    R(cg, 0, 0, w, h, C.sky);
    blobShape(cg, 4, 60, 1, C.white); blobShape(cg, 70, 58, 2, C.white);
    cg.save(); cg.translate(-24, h - 32 - 13 * TS); hill(cg, 0, true); cg.restore();
    for (let x = 0; x < w; x += 16) { cg.drawImage(TILE.ground, x, h - 32); cg.drawImage(TILE.ground, x, h - 16); }
    cg.drawImage(PIPE_TOP, w - 36, h - 64); cg.drawImage(PIPE_BODY, w - 36, h - 48);
    cg.drawImage(TILE.brick, 56, h - 100); cg.drawImage(TILE.q[Math.floor(t * 7.5) % 4], 72, h - 100); cg.drawImage(TILE.brick, 88, h - 100);
    coin(cg, 76, h - 120 - Math.round(Math.abs(Math.sin(t * 3)) * 6), Math.floor(t * 8));
    const gx = 70 + Math.round(Math.sin(t * 0.8) * 10);
    cg.drawImage(GOOMBA[Math.floor(t * 6) % 2], gx, h - 48);
    /* hero moli, ×2, mid-jump */
    const jy = Math.round(Math.abs(Math.sin(t * 2.2)) * 16);
    cg.save(); cg.translate(18, h - 32 - 64 - jy); cg.scale(2, 2); cg.drawImage(MOLI.big.jump[0], 0, 0); cg.restore();
    /* logo */
    R(cg, 8, 8, w - 16, 44, C.black); R(cg, 9, 9, w - 18, 42, '#e4502a'); R(cg, 11, 11, w - 22, 38, C.light); R(cg, 12, 12, w - 24, 36, '#e4502a');
    text(cg, 'SUPER', w / 2, 15, { align: 'center', color: C.white, shadow: C.black });
    text(cg, 'MOLI', w / 2, 25, { align: 'center', size: 16, color: C.yellow, shadow: C.black });
  }
  function coverInk(cg, w, h, t) {
    R(cg, 0, 0, w, h, '#241f38');
    const cols = ['#f5c518', '#fcfcfc', '#6e5bd6', '#e4502a'];
    R(cg, 28, 24, 80, h - 36, '#15122a'); R(cg, 27, 24, 1, h - 36, C.white); R(cg, 108, 24, 1, h - 36, C.white);
    const cell = 10;
    const stack = [[0, 0, 0], [1, 0, 0], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 3], [6, 0, 2], [7, 0, 2], [0, 1, 0], [1, 1, 3], [3, 1, 1], [4, 1, 2], [5, 1, 2], [6, 1, 2], [7, 1, 0], [0, 2, 3], [4, 2, 0], [7, 2, 0]];
    for (const [x, y, c] of stack) { R(cg, 28 + x * cell, h - 12 - (y + 1) * cell, cell - 1, cell - 1, cols[c]); }
    const fy = 30 + (Math.floor(t * 3) % 8) * cell;
    for (const [x, y] of [[3, 0], [4, 0], [5, 0], [4, 1]]) R(cg, 28 + x * cell, fy + y * cell, cell - 1, cell - 1, C.ink);
  }
  function coverKart(cg, w, h, t) {
    R(cg, 0, 0, w, h * 0.45, '#f6a45c'); R(cg, 0, h * 0.45, w, h, '#2f9e6a');
    disc(cg, w - 30, 34, 12, '#fce38a');
    for (let y = Math.floor(h * 0.45); y < h; y++) {
      const k = (y - h * 0.45) / (h * 0.55), hw = 6 + k * 64;
      R(cg, w / 2 - hw, y, hw * 2, 1, '#5d5870');
      if (Math.floor(k * 12 - t * 4) % 2 === 0) { R(cg, w / 2 - hw - 3, y, 3, 1, C.white); R(cg, w / 2 + hw, y, 3, 1, C.white); }
    }
    cg.save(); cg.translate(w / 2 - 16, h - 56); cg.scale(2, 2); cg.drawImage(MOLI.small.stand[0], 0, 0); cg.restore();
    R(cg, w / 2 - 22, h - 26, 44, 10, '#e4502a'); R(cg, w / 2 - 20, h - 18, 8, 6, C.ink); R(cg, w / 2 + 12, h - 18, 8, 6, C.ink);
  }
  function coverCat(cg, w, h, t) {
    R(cg, 0, 0, w, h, '#1d2244'); disc(cg, w - 34, 30, 14, '#fce38a'); disc(cg, w - 28, 26, 12, '#1d2244');
    for (let i = 0; i < 14; i++) R(cg, (i * 37) % w, (i * 23) % 70 + 6, 1, 1, C.white);
    for (let x = 0; x < w; x += 18) { const bh = 30 + ((x * 7) % 40); R(cg, x, h - 20 - bh, 16, bh, '#2c2f5c'); }
    R(cg, 0, h - 20, w, 20, '#141217');
    const cx = 40 + ((t * 40) % 80), leg = Math.floor(t * 10) % 2;
    R(cg, cx, h - 38, 26, 10, C.ink); R(cg, cx + 22, h - 46, 12, 10, C.ink); R(cg, cx + 23, h - 50, 3, 4, C.ink); R(cg, cx + 30, h - 50, 3, 4, C.ink);
    R(cg, cx - 8, h - 42 - leg * 2, 10, 3, C.ink); R(cg, cx + 2 + leg * 3, h - 28, 3, 8, C.ink); R(cg, cx + 18 - leg * 3, h - 28, 3, 8, C.ink);
    R(cg, cx + 29, h - 43, 2, 2, '#9bc46a');
  }
  function coverEmpty(cg, w, h, t) {
    R(cg, 0, 0, w, h, '#1c1834');
    for (let y = 0; y < h; y += 6) R(cg, 0, y, w, 1, '#221d3e');
    const e = glyphs('?', '#3a3552', 32, PIX); cg.drawImage(e.c, Math.round((w - e.w) / 2), 48);
  }
  const COVERS = { moli: coverMoli, ink: coverInk, kart: coverKart, cat: coverCat, blocks: coverEmpty, circus: coverEmpty, slot4: coverEmpty };
  /* painted cartridge labels (assets/cover_*.js); the drawn covers stay as fallback */
  const LABELS = {};
  for (const id in (window.MOLI_COVERS || {})) { const im = new Image(); im.onload = () => { LABELS[id] = im; }; im.src = window.MOLI_COVERS[id]; }
  const coverCanvas = cv(136, 150), cg = coverCanvas.getContext('2d'); cg.imageSmoothingEnabled = false;

  function drawCart(x, y, color, locked) {
    R(g, x, y, 22, 26, locked ? '#3a3552' : '#8c8799'); R(g, x + 2, y + 2, 18, 3, locked ? '#2a2640' : '#5d5870');
    R(g, x + 3, y + 8, 16, 12, locked ? '#4b4566' : color); R(g, x + 4, y + 22, 14, 4, '#2a2640');
    if (locked) { R(g, x + 7, y + 10, 8, 6, '#8c8799'); R(g, x + 8, y + 7, 1, 3, '#8c8799'); R(g, x + 13, y + 7, 1, 3, '#8c8799'); R(g, x + 9, y + 6, 4, 1, '#8c8799'); R(g, x + 10, y + 12, 2, 2, '#3a3552'); }
    else { for (let d = -2; d <= 2; d++) { R(g, x + 11 + d, y + 14 + d, 1, 1, C.yellow); R(g, x + 11 - d, y + 14 + d, 1, 1, C.yellow); } }
  }
  function drawMenu(live) {
    const t = S.t;
    R(g, 0, 0, W, H, '#15122a');
    for (let y = 0; y < H; y += 4) R(g, 0, y, W, 1, '#1a1632');
    /* multicart header: just MOLINK [4 IN 1] */
    text(g, 'MOLINK', 12, 8, { color: C.yellow });
    R(g, 63, 3, 54, 17, C.yellow); R(g, 64, 4, 52, 15, '#d82800');
    text(g, '4 IN 1', 90, 8, { align: 'center', color: C.white, shadow: '#5c0000' });

    const game = GAMES[S.sel];
    const bx = 12, by = 26;
    R(g, bx - 2, by - 2, 140, 194, C.yellow); R(g, bx, by, 136, 190, C.ink);
    if (LABELS[game.id]) {
      /* full-height label, like a cartridge sitting in the slot */
      const im = LABELS[game.id], lh = 190, lw = Math.round(lh * im.width / im.height);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(im, bx + Math.round((136 - lw) / 2), by, lw, lh);
      g.imageSmoothingEnabled = false;
    } else {
    cg.clearRect(0, 0, 136, 150); (COVERS[game.id] || coverEmpty)(cg, 136, 150, t);
    if (!game.ready) {
      cg.fillStyle = 'rgba(21,18,42,.55)'; cg.fillRect(0, 0, 136, 150);
      cg.save(); cg.translate(68, 75); cg.rotate(-0.22);
      R(cg, -90, -13, 180, 26, C.yellow); R(cg, -90, -13, 180, 1, C.ink); R(cg, -90, 12, 180, 1, C.ink);
      cg.restore();
      cg.save(); cg.translate(68, 75); cg.rotate(-0.22);
      const e = glyphs('COMING SOON', C.ink, 8, PIX); cg.drawImage(e.c, Math.round(-e.w / 2), -5);
      cg.restore();
    }
    g.drawImage(coverCanvas, bx, by);
    R(g, bx, by + 150, 136, 1, C.yellow);
    if (window.LANG === 'en') text(g, game.en, bx + 68, by + 162, { align: 'center', color: game.ready ? C.yellow : '#5d5870' });
    else {
      text(g, game.cn, bx + 68, by + 154, { align: 'center', size: 16, fam: CJK, color: game.ready ? C.white : '#8c8799' });
      text(g, game.en, bx + 68, by + 176, { align: 'center', color: game.ready ? C.yellow : '#5d5870' });
    }
    }

    /* exactly four slots, filling the label's height: 4 × 44 + 3 × 4 = 188 */
    const lx = 162;
    GAMES.forEach((gm, i) => {
      const y = 26 + i * 48, on = i === S.sel;
      if (on) { R(g, lx - 2, y - 2, 150, 48, C.yellow); R(g, lx, y, 146, 44, '#241f38'); }
      else R(g, lx, y, 146, 44, '#1c1834');
      text(g, String(i + 1), lx + 5, y + 4, { color: on ? C.yellow : '#5d5870' });
      drawCart(lx + 6, y + 14, gm.color, !gm.ready);
      if (window.LANG === 'en') text(g, gm.en, lx + 36, y + 17, { color: gm.ready ? C.white : '#8c8799' });
      else text(g, gm.cn, lx + 36, y + 13, { size: 18, fam: CJK, color: gm.ready ? C.white : '#8c8799' });
      if (on && Math.floor(t * 3) % 2 === 0) text(g, '▶', lx - 10, y + 16, { size: 10, fam: CJK, color: C.yellow });
    });
    if (live) text(g, window.LANG === 'en' ? '↑↓ Select · K Start · Esc Leave' : '↑↓ 选择 · K 开始 · Esc 离开', W / 2, 222, { align: 'center', size: 12, fam: CJK, color: '#b7b3c6' });
    else if (Math.floor(t * 1.6) % 2 === 0) text(g, window.LANG === 'en' ? 'Click the TV to play' : '点击电视 · 开始游戏', W / 2, 220, { align: 'center', size: 14, fam: CJK, color: C.yellow });
    if (S.toast > 0) {
      R(g, 60, 96, 200, 44, C.ink); R(g, 62, 98, 196, 40, C.yellow); R(g, 64, 100, 192, 36, C.ink);
      text(g, S.toastMsg, W / 2, 104, { align: 'center', size: 14, fam: CJK, color: C.yellow });
      text(g, 'COMING SOON', W / 2, 124, { align: 'center', color: C.white });
    }
  }
  function drawIntro() {
    R(g, 0, 0, W, H, C.black); drawHUD();
    text(g, 'WORLD 1-1', W / 2, 88, { align: 'center' });
    g.drawImage(MOLI.small.stand[0], 124, 112);
    text(g, 'x  ' + S.lives, 150, 118);
    text(g, window.LANG === 'en' ? 'SUPER MOLI' : '超级茉莉', W / 2, 150, { align: 'center', size: 14, fam: CJK, color: C.yellow });
  }
  function drawOver() { R(g, 0, 0, W, H, C.black); drawHUD(); text(g, 'GAME OVER', W / 2, 110, { align: 'center' }); }
  function drawClear() {
    if (S.modeT > 330) { disclaimer(g, S.modeT - 330); return; }
    R(g, 0, 0, W, H, C.black); drawHUD();
    text(g, 'THANK YOU MOLI!', W / 2, 80, { align: 'center', color: C.yellow });
    text(g, '1-1 通关！', W / 2, 100, { align: 'center', size: 16, fam: CJK });
    text(g, '仅提供第一关试玩', W / 2, 128, { align: 'center', size: 14, fam: CJK, color: '#b7b3c6' });
    text(g, 'SCORE ' + String(S.score).padStart(6, '0'), W / 2, 158, { align: 'center' });
  }

  /* ---------- main step / draw ---------- */
  function step(live) {
    S.frame++; S.modeT++;
    if (S.toast > 0) S.toast--;
    if (S.mode === 'intro') { if (S.modeT === 1) resetLevel(); if (S.modeT > 150) setMode('play'); }
    else if (S.mode === 'play') { if (live) stepPlay(); }
    else if (S.mode === 'over') { if (S.modeT > 200) setMode('menu'); }
    else if (S.mode === 'clear') { if (S.modeT > 330 + 900) setMode('menu'); }
    else if (S.mode === 'ext') { ext.step(live); if (ext.done) { ext.release(); ext = null; setMode('menu'); } }
  }
  function draw(live) {
    g.imageSmoothingEnabled = false;
    if (S.mode === 'menu') drawMenu(live);
    else if (S.mode === 'intro') drawIntro();
    else if (S.mode === 'play') drawPlay();
    else if (S.mode === 'over') drawOver();
    else if (S.mode === 'ext') ext.draw(live);
    else drawClear();
    if (!live && (S.mode === 'play' ? !S.paused : S.mode === 'ext' && ext.playing)) {
      R(g, 0, 96, W, 40, 'rgba(0,0,0,.55)');
      text(g, '点击电视 继续游戏', W / 2, 108, { align: 'center', size: 14, fam: CJK, color: C.yellow });
    }
  }

  function choose() {
    const gm = GAMES[S.sel];
    if (gm.ext && window[gm.ext]) { ext = window[gm.ext](g, window.MoliKit); extId = gm.id; bgmStop(); SFX.blip(); setMode('ext'); }
    else if (gm.ready && !gm.ext) startGame();
    else { S.toast = 90; S.toastMsg = window.LANG === 'en' ? gm.en : gm.cn + ' · 敬请期待'; SFX.deny(); }
  }

  return {
    frame(dt, live) {
      S.t += dt;
      acc += Math.min(dt, 0.1);
      let n = 0;
      while (acc >= 1 / 60 && n < 6) { acc -= 1 / 60; step(live); n++; }
      if (S.mode === 'ext') { bgmStop(); if (!(this.tracks && ext.track !== undefined)) ext.music(live); draw(live); return; }
      const music = !this.tracks && live && S.mode === 'play' && !S.paused && !p.dead && !flag.state && S.modeT > 20;
      if (music) { bgmStart(); bgmPump(S.time <= 100); } else bgmStop();
      draw(live);
    },
    key(code, down) {
      if (S.mode === 'ext') {
        const k = code === 'Enter' ? 'S' : code === 'Backspace' || code === 'Delete' ? 'X' : KEYMAP[code];
        if (k) ext.key(k, down);
        return;
      }
      if (code === 'Backspace' || code === 'Delete') {
        if (down && S.mode !== 'menu') { S.paused = false; for (const k in keys) keys[k] = false; bgmStop(); SFX.blip(); setMode('menu'); }
        return;
      }
      if (code === 'Enter') {
        if (!down) return;
        if (S.mode === 'menu') choose();
        else if (S.mode === 'clear' && S.modeT > 330 + 90) setMode('menu');
        else if (S.mode === 'play' && !p.dead && !flag.state) { S.paused = !S.paused; SFX.pause(); }
        return;
      }
      const k = KEYMAP[code]; if (!k) return;
      const was = keys[k]; keys[k] = down;
      if (!down && k === 'U') keys.J = false;
      if (!down || was) return;
      if (S.mode === 'menu') {
        if (k === 'U' || k === 'L') { S.sel = (S.sel + GAMES.length - 1) % GAMES.length; SFX.blip(); }
        else if (k === 'D' || k === 'R') { S.sel = (S.sel + 1) % GAMES.length; SFX.blip(); }
        else if (k === 'J') choose();
      } else if (S.mode === 'clear') {
        if (k === 'J' && S.modeT > 330 + 90) setMode('menu');
      } else if (S.mode === 'play') {
        if (k === 'J' || k === 'U') { jumpBuf = 6; if (k === 'U') keys.J = true; }
      }
    },
    tap(u, v) {
      const x = u * W, y = v * H;
      if (S.mode === 'menu') {
        const i = Math.floor((y - 24) / 38);
        if (x > 156 && i >= 0 && i < GAMES.length) { if (i === S.sel) choose(); else { S.sel = i; SFX.blip(); } }
        else if (x < 152 && y > 24 && y < 218) choose();
      } else if (S.mode === 'play' && S.paused) { S.paused = false; }
      else if (S.mode === 'ext') ext.tap(u, v);
    },
    tracks: false,          // the host plays recorded music: the built-in chiptune loops step aside
    /* which recorded track fits the screen right now: { id, loop, paused, rate } or null */
    get track() {
      if (S.mode === 'ext') return ext.track || null;
      if (S.mode === 'play') {
        if (flag.state) return { id: 'mario_clear' };
        if (p.dead) return null;
        return { id: 'mario_bgm', loop: true, paused: S.paused, rate: S.time <= 100 ? 1.2 : 1 };
      }
      if (S.mode === 'clear') return S.modeT < 600 ? { id: 'mario_clear' } : null;
      return null;
    },
    releaseAll() { for (const k in keys) keys[k] = false; bgmStop(); if (ext) ext.release(); },
    wake: wakeAudio,
    setMuted(m) { muted = m; if (m) bgmStop(); },
    get mode() { return S.mode === 'ext' ? (ext.mode === 'play' ? 'play' : 'menu') : S.mode; },
    get game() { return S.mode === 'ext' ? extId : S.mode === 'menu' ? 'menu' : 'moli'; },
    get hints() { return S.mode === 'ext' ? ext.hints : S.mode === 'menu' ? MENU_HINTS : MARIO_HINTS; },
    get paused() { return S.mode === "ext" ? ext.mode === "play" && !ext.playing : S.paused; },
    skyish() { if (S.mode === 'ext') return ext.sky(); return S.mode === 'play' ? 0x7aa6ff : S.mode === 'menu' ? 0xb49cff : 0x8a86a0; },
    debugContra(x) { S.sel = GAMES.findIndex(gm => gm.id === 'contra'); choose(); ext.debug(x); },
    debugExt(id, x) { S.sel = GAMES.findIndex(gm => gm.id === id); choose(); ext.debug(x); },
    get ext() { return ext; },
    debugStart(col) { S.startCol = col || 3; S.score = 0; S.coins = 0; S.lives = 3; setMode('play'); resetLevel(); },
  };
};
})();
