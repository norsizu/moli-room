/* 茉莉马戏团 MOLI CIRCUS — a circus-ring runner cartridge for the MOLINK console, stage 1 only.
   Plugs into moli_arcade.js: MoliCircus(ctx, MoliKit) → { step, draw, key, tap, track, release, done, … }.
   moli stands on the tuxedo cat's back and rides 100M → 00M across the big top: jump through the flaming
   hoops that roll in from the right, hop the fire pots, grab the dried fish hanging in some hoops,
   and land on the striped drum at the end. Layout follows the NES stage-1 map (markers every 256px,
   a fire pot before each marker from 80M on, the drum at 00M); all art is redrawn, nothing is ripped. */
(function () {
'use strict';
window.MoliCircus = function (g, K, coverTo) {
const { W, H, R, cv, text, tone, CJK, sprite } = K;
const INK = '#141217', WHITE = '#fcfcfc', YEL = '#f5c518', RED = '#b53120', GREEN = '#388700', GREY = '#8c8799';
const WORLD = 2624, FLOOR = 208, HOOP_T = 104, HOOP_B = 176, HOOP_RX = 7;
const RUN = 1.25, BACK = 0.6, JUMP_V = 3.2, GRAV = 0.085, HOOP_V = 0.5;
const MARK = i => 11 + 256 * i;                                   // 100M … 00M boards
const POTS = [499, 755, 1011, 1267, 1523, 1779, 2035, 2291, 2547];
const DRUM = { x0: 2562, x1: 2598, top: 177 };
const HI_KEY = 'moli-circus.hi';

/* ---------- sprites: the tuxedo cat (from the user's photos: black, white muzzle + blaze, white bib, belly and legs, yellow-green eyes) ---------- */
const CAT_PAL = { K: INK, W: WHITE, G: '#b8f818', P: '#fca0b4', w: '#c4c4d2', e: '#0a0a0a' };
const BURNT = { K: INK, W: '#8c8c8c', G: '#b8f818', P: '#5c5c5c', w: '#6c6c6c', e: '#0a0a0a' };
const CAT_ROWS = {
  run1: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '.........WWWWWWWWWWWWWWWWWWWWWWw..........',
    '........wwWWWWWWWWWWWWWWWWWWWwwww.........',
    '.......wwwwWWWW.........WWWW.wwwww........',
    '......wwwww.WWWWW......WWWWW..wwwwww......',
    '......wwwww.WWWWW......WWWWW...wwwww......',
    '.......ww....WW.........WW......ww........',
    '..........................................',
  ],
  run2: [
    '.............................K.......KK...',
    '............................KKK.....KKK...',
    '....K.......................KPKK.K.KKPK...',
    '...KKK......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '........WWWwWWWWWWWWWWWWWWWWWWW...........',
    '........WWWww.WWWWWWWWWWWW.wWWW...........',
    '........WWWww..............wWWW...........',
    '.......WWWWWww.............wWWWWW.........',
    '.......WWWWWww.............wWWWWW.........',
    '........WWww................wWW...........',
    '..........................................',
  ],
  run3: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWW.........',
    '........WWKKWWWWWWWWWWWWWWWWWWWWW.........',
    '.......WWWWwWWWWWWWWWWWWWWWWWWWWW.........',
    '......WWWW..wwWWWWWWWWWWWWww.WWWWW........',
    '.....WWWW...wwww.......wwww...WWWWW.......',
    '....WWWWW....wwwww....wwwww....WWWWWW.....',
    '....WWWWW....wwwww....wwwww.....WWWWW.....',
    '.....WW.......ww.......ww........WW.......',
    '..........................................',
  ],
  jump: [
    '.............................K.......KK...',
    '....K.......................KKK.....KKK...',
    '...KKK......................KPKK.K.KKPK...',
    '..KKK.......................KKKKKKKKKKP...',
    '..KKK.......................KKKKKKKKKKK...',
    '..KK........................KKKKKKKKKKK...',
    '..KK.......................KKKKKKWWKKKKK..',
    '..KK.......................KKKKGKWWKKGKK..',
    '..KKK........KKKKKKKKKKKK..KKKGGKWWKGGKK..',
    '..KKKK....KKKKKKKKKKKKKKKKKKKKKKWWWWKKKK..',
    '...KKKK.KKKKKKKKKKKKKKKKKKKKKKWWWWWWWWKK..',
    '....KKKKKKKKKKKKKKKKKKKKKKKKKKWWWePWWWK...',
    '.....KKKKKKKKKKKKKKKKKKKKKKWKKWWWWWWWWK...',
    '......KKKKKKKKKKKKKKKKKKKKKWWWWWWKWWWW....',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWWWW......',
    '......KKKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '.......KKKKKKKKKKKKKKKKKKKWWWWWWWW........',
    '........KKKKKKKKWWWWWWWWKKKWWWWWWWwwww....',
    '......WWWWKKWWWWWWWWWWWWWWWWWWWWWWWWWWWw..',
    '...wWWWWWWWwWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    '..WWWWWWWw....WWWWWWWWWWWW.......WWWWWWWW.',
    '.WWWWWW..............................WW...',
    '.WWWWW....................................',
    '..WW......................................',
    '..........................................',
    '..........................................',
  ],
};
const CAT = {}, CAT_B = {};
for (const k in CAT_ROWS) { CAT[k] = sprite(CAT_ROWS[k], CAT_PAL); CAT_B[k] = sprite(CAT_ROWS[k], BURNT); }
const RUNSEQ = ['run1', 'run2', 'run3', 'run2'];
/* moli: black tombstone bean, one big ring eye, a single yellow navel pixel; arms and legs are drawn as sticks */
const MOLI_ROWS = [
  '.....KKKKKK.....',
  '...KKKKKKKKKK...',
  '..KKKKKKKKKKKK..',
  '.KKKKKKKKKKKKKK.',
  '.KKKKKKWWWWKKKK.',
  'KKKKKKWWWWWWKKKK',
  'KKKKKWWWKKKWWKKK',
  'KKKKKWWKKKKKWKKK',
  'KKKKKWWKKKKKWKKK',
  'KKKKKWWWKKKWWKKK',
  'KKKKKKWWWWWWKKKK',
  'KKKKKKKWWWWKKKKK',
  'KKKKKKKKKKKKKKKK',
  'KKKKKKKKKKKKKKKK',
  'KKKKKKKKKKKYKKKK',
  'KKKKKKKKKKKKKKKK',
  '.KKKKKKKKKKKKKK.',
  '..KKKKKKKKKKKK..',
];
const MOLI = sprite(MOLI_ROWS, { K: INK, W: WHITE, Y: YEL });
const MOLI_X = sprite(MOLI_ROWS.map((r, y) => y >= 6 && y <= 9 ? r.replace(/W/g, 'K') : r), { K: INK, W: WHITE, Y: YEL });
const ELE = sprite([
  '....wwwww...',
  '..wwwwwwwww.',
  '.wwwwwwwwwww',
  'wwwwwwwwKwww',
  'wwwwwwwwwwww',
  'wwwwwwwwwwWw',
  '.wwwwwwwwwWw',
  '..wwwwww.www',
  '...wwww..ww.',
  '.........ww.',
  '........ww..',
  '.......ww...',
], { w: '#adadad', K: INK, W: WHITE });
const FISH = sprite([
  '.....bbbb..b',
  '...bbbbbbbbb',
  '.bKbbbbbbb.b',
  '..bbbbbbbb..',
  '....bbb.....',
], { b: '#9cb8cc', K: INK });

/* ---------- the big top, pre-rendered once ---------- */
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const LV = cv(WORLD + 64, H);
(function (c) {
  R(c, 0, 0, LV.width, H, '#000');
  const FACES = ['#fcbcb0', '#f0d0b0', '#e4a878', '#fcfcfc'], HAIR = ['#b53120', '#bcbe00', '#b71e7b', '#48cdde', '#6844fc', '#fc9838', INK, '#7c4c24'];
  /* top trim */
  for (let x = 0; x < LV.width; x += 4) { R(c, x, 57, 2, 2, (x >> 2) % 2 ? RED : WHITE); R(c, x + 2, 57, 2, 2, (x >> 2) % 2 ? WHITE : RED); }
  R(c, 0, 59, LV.width, 1, '#adadad');
  /* the crowd: rows of little heads; every so often a moli or a cat in the stands */
  R(c, 0, 60, LV.width, 21, '#1c1834');
  for (let row = 0; row < 5; row++) for (let x = (row % 2) * 2; x < LV.width; x += 4) {
    const y = 61 + row * 4, r = hash(x, row);
    if (r < 0.012) { R(c, x, y, 3, 3, INK); R(c, x + 1, y + 1, 1, 1, WHITE); continue; }                       // tiny moli
    if (r < 0.022) { R(c, x, y + 1, 3, 2, INK); R(c, x, y, 1, 1, INK); R(c, x + 2, y, 1, 1, INK); R(c, x + 1, y + 2, 1, 1, WHITE); continue; }   // tiny cat
    R(c, x, y, 3, 1, HAIR[(r * 97 | 0) % HAIR.length]); R(c, x, y + 1, 3, 2, FACES[(r * 31 | 0) % FACES.length]);
    if (hash(row, x) < 0.35) R(c, x + (r < 0.5 ? 0 : 2), y + 3, 1, 1, HAIR[(r * 13 | 0) % HAIR.length]);          // a waving hand
  }
  /* white bunting board with magenta / cyan swags */
  R(c, 0, 81, LV.width, 16, WHITE);
  for (let x = 0; x < LV.width; x += 16) {
    for (let i = 0; i <= 16; i++) { const d = Math.round(Math.sin(i / 16 * Math.PI) * 6); R(c, x + i, 82 + d, 1, 2, (x >> 4) % 2 ? '#b71e7b' : '#48cdde'); }
    for (let i = 3; i < 16; i += 4) R(c, x + i, 90, 2, 6, (x >> 4) % 2 ? '#48cdde' : '#b71e7b');
    R(c, x, 81, 1, 9, '#b71e7b'); disc(c, x, 82, 1.5, YEL);
  }
  R(c, 0, 96, LV.width, 1, INK); R(c, 0, 97, LV.width, 2, WHITE); R(c, 0, 99, LV.width, 1, RED);
  /* ring entrances: striped arch, red curtains, an elephant peeking out */
  for (let x = 80; x < LV.width; x += 256) {
    for (let i = 0; i < 34; i++) { const d = Math.round(Math.sin(i / 33 * Math.PI) * 4); R(c, x - 1 + i, 60 - d, 1, 6 + d, (i >> 2) % 2 ? RED : WHITE); }
    R(c, x, 66, 32, 31, '#000');
    R(c, x, 66, 32, 3, RED); for (let i = 0; i < 32; i += 4) R(c, x + i, 69, 2, 2, RED);
    for (let y = 69; y < 97; y++) { const w = Math.max(2, 7 - Math.round((y - 69) / 5)); R(c, x, y, w, 1, (y % 3) ? RED : '#7c1810'); R(c, x + 32 - w, y, w, 1, (y % 3) ? RED : '#7c1810'); }
    c.drawImage(ELE, x + 9, 82);
  }
  /* the ring floor: green with black lanes */
  R(c, 0, 100, LV.width, 140, GREEN);
  for (const y of [100, 104, 117, 136, 168, 208, 210]) R(c, 0, y, LV.width, 1, '#000');
  /* distance boards */
  for (let i = 0; i <= 10; i++) {
    const x = MARK(i), s = String(100 - i * 10).padStart(i === 10 ? 2 : 3, '0');
    R(c, x, 211, 41, 17, RED); R(c, x + 2, 213, 37, 13, '#000');
    const lw = text(c, s, x + 33 - s.length * 8 - 1, 215, { color: WHITE }); text(c, 'M', x + 32, 215, { color: RED });
  }
  /* the finishing drum */
  const { x0, x1, top } = DRUM;
  for (let x = x0; x <= x1; x++) R(c, x, top + 3, 1, FLOOR - top - 3, ((x - x0) >> 2) % 2 ? RED : WHITE);
  for (let i = 0; i <= x1 - x0; i++) { const d = Math.round(Math.sin(i / (x1 - x0) * Math.PI) * 2); R(c, x0 + i, top - d, 1, 3 + d * 2, WHITE); }
  R(c, x0, top + 3, x1 - x0 + 1, 1, '#adadad'); R(c, x0, FLOOR - 2, x1 - x0 + 1, 2, '#7c1810');
})(LV.getContext('2d'));
function disc(c, cx, cy, r, col) { K.disc(c, Math.round(cx), Math.round(cy), r, col); }

/* ---------- sound: square-wave effects through the shared bus ---------- */
const SFX = {
  jump: () => tone(330, 0.16, 'square', 700, 0.035),
  hoop: () => { tone(784, 0.06, 'square', 0, 0.035); tone(1175, 0.14, 'square', 0, 0.035, 0.06); },
  pot: () => { tone(659, 0.06, 'square', 0, 0.03); tone(988, 0.1, 'square', 0, 0.03, 0.06); },
  fish: () => [880, 1175, 1397, 1760].forEach((f, i) => tone(f, 0.08, 'square', 0, 0.035, i * 0.06)),
  burn: () => { tone(900, 0.5, 'sawtooth', 90, 0.05); tone(200, 0.4, 'square', 60, 0.04, 0.1); },
  meow: () => { tone(700, 0.12, 'triangle', 1100, 0.12); tone(1100, 0.3, 'triangle', 500, 0.12, 0.12); },
  land: () => tone(160, 0.08, 'triangle', 90, 0.12),
  blip: () => tone(880, 0.05, 'square', 0, 0.035),
  tick: () => tone(1320, 0.03, 'square', 0, 0.02),
  pause: () => [988, 784, 988, 784].forEach((f, i) => tone(f, 0.06, 'square', 0, 0.035, i * 0.07)),
  fanfare: () => [523, 659, 784, 1046, 0, 784, 1046, 1319].forEach((f, i) => f && tone(f, 0.12, 'square', 0, 0.04, i * 0.11)),
  over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, 'triangle', 0, 0.12, i * 0.22)),
};

/* ---------- state ---------- */
const keys = { L: false, R: false, U: false, D: false, J: false, B: false };
const S = { mode: 'title', mt: 0, t: 0, done: false, idle: 0, paused: false, overSel: 0 };
let hi = 20000; try { hi = Math.max(hi, +localStorage.getItem(HI_KEY) || 0); } catch (e) {}
let p, cam, hoops, fx, score, bonus, bonusT, lives, cp, nextGap, hoopN, potDone, goalT;
function newGame() { score = 0; lives = 3; cp = 0; }
function resetRun() {
  const x0 = cp === 0 ? 44 : MARK(cp) + 24;
  p = { x: x0, y: FLOOR, vx: 0, vy: 0, air: false, jumpReady: true, anim: 0, dead: 0, cause: '', goal: false, face: 1 };
  cam = Math.max(0, Math.min(x0 - 44, WORLD - W));
  hoops = []; fx = []; hoopN = 0; nextGap = 0; bonus = 5000; bonusT = 0; goalT = 0;
  potDone = POTS.map(x => x < x0);
  /* the first hoops are already on their way, like the map shows */
  spawnHoop(cam + 150); spawnHoop(cam + 150 + 244);
}
function spawnHoop(x) {
  hoopN++;
  hoops.push({ x, fish: hoopN % 5 === 0, got: false, passed: false, id: hoopN });
  nextGap = [170, 196, 222, 250][hoopN * 7 % 4];
}
function setMode(m) { S.mode = m; S.mt = 0; }
function begin() { newGame(); resetRun(); S.paused = false; SFX.blip(); setMode('intro'); }
function pop(x, y, s, col) { fx.push({ k: 'pop', x, y, s, col, t: 0 }); }
function puff(x, y) { fx.push({ k: 'smoke', x, y, t: 0, dx: (Math.random() - 0.5) * 0.6 }); }

/* ---------- play ---------- */
function die(cause) {
  if (p.dead || S.god) return;
  p.dead = 1; p.cause = cause; p.vx = 0; SFX.burn();
  setTimeout(() => SFX.meow(), 250);
  pop(p.x, p.y - 50, '喵!!', YEL);
}
function stepPlay() {
  if (p.goal) { stepGoal(); return; }
  if (p.dead) {
    p.dead++;
    if (p.dead % 6 === 0) puff(p.x + (Math.random() - 0.5) * 24, p.y - 20);
    if (p.air) { p.vy += GRAV; p.y = Math.min(FLOOR, p.y + p.vy); if (p.y >= FLOOR) p.air = false; }
    if (p.dead > 150) {
      if (--lives <= 0) { saveHi(); SFX.over(); S.overSel = 0; setMode('over'); }
      else { resetRun(); setMode('intro'); }
    }
    stepFx(); return;
  }
  /* bonus counts down, as in the arcade circus */
  if (++bonusT >= 30) { bonusT = 0; bonus = Math.max(0, bonus - 10); }
  const want = keys.R ? 1 : keys.L ? -1 : 0;
  if (!p.air) {
    p.vx = want > 0 ? RUN : want < 0 ? -BACK : 0;
    if ((keys.J || keys.B || keys.U) && p.jumpReady) {
      p.air = true; p.vy = -JUMP_V; p.jumpReady = false; p.jh = 0; p.jp = 0; SFX.jump();
    }
  } else {
    p.vy += GRAV;
  }
  if (!(keys.J || keys.B || keys.U)) p.jumpReady = true;
  const py0 = p.y;
  p.x += p.vx; p.y += p.air ? p.vy : 0;
  p.x = Math.max(cam + 18, Math.min(WORLD - 24, p.x));
  /* the drum: a wall from the side, a stage from above */
  if (p.x + 15 > DRUM.x0 && p.x - 15 < DRUM.x1) {
    if (p.air && p.vy > 0 && py0 <= DRUM.top + 1 && p.y >= DRUM.top) { p.y = DRUM.top; p.air = false; reachGoal(); return; }
    if (p.y > DRUM.top + 2) p.x = p.x < (DRUM.x0 + DRUM.x1) / 2 ? DRUM.x0 - 15 : DRUM.x1 + 15;
  }
  if (p.air && p.y >= FLOOR) {
    p.y = FLOOR; p.air = false; p.vy = 0; SFX.land();
    /* one jump through a hoop AND over a fire pot earns the combo bonus, like the arcade circus */
    if (p.jh > 0 && p.jp > 0) { const b = 500 * p.jh * p.jp; score += b; setTimeout(() => SFX.fish(), 80); pop(p.x, p.y - 62, '一石二鸟!', '#48cdde'); pop(p.x, p.y - 48, '+' + b, YEL); }
  }
  if (p.vx !== 0 || p.air) p.anim++;
  /* camera only rolls forward */
  cam = Math.max(cam, Math.min(p.x - 96, WORLD - W));
  /* checkpoints: the last distance board passed */
  for (let i = 10; i > cp; i--) if (p.x > MARK(i) + 20) { cp = i; break; }
  /* hoops roll in from the right */
  for (const h of hoops) h.x -= HOOP_V;
  const last = hoops[hoops.length - 1], edge = cam + W + 30;
  if (edge < 2440 && (!last || last.x < edge - nextGap)) spawnHoop(edge);
  hoops = hoops.filter(h => h.x > cam - 40);
  /* collisions, kept forgiving (kuso, not a trial): cat body 20 wide above the feet, moli 10 wide on its back */
  const cx0 = p.x - 10, cx1 = p.x + 10, cy0 = p.y - 16, cy1 = p.y;
  const mx0 = p.x - 5, mx1 = p.x + 5, my0 = p.y - 37, my1 = p.y - 16;
  for (const h of hoops) {
    const hx0 = h.x - 4, hx1 = h.x + 4;
    if (cx1 > hx0 && cx0 < hx1 && cy1 > HOOP_B - 2) { die('hoop'); return; }
    if (mx1 > hx0 && mx0 < hx1 && my0 < HOOP_T + 4) { die('hoop'); return; }
    if (h.fish && !h.got && mx1 > h.x - 6 && mx0 < h.x + 6 && my0 < HOOP_T + 22) { h.got = true; score += 500; SFX.fish(); pop(h.x, HOOP_T + 8, '500', YEL); }
    if (!h.passed && h.x < p.x) { h.passed = true; if (p.air) p.jh = (p.jh || 0) + 1; score += 100; SFX.hoop(); pop(h.x, HOOP_T - 6, '100', WHITE); }
  }
  POTS.forEach((x, i) => {
    if (cx1 > x - 5 && cx0 < x + 5 && cy1 > 191) { die('pot'); return; }
    if (!potDone[i] && p.x > x + 8) { potDone[i] = true; if (p.air) p.jp = (p.jp || 0) + 1; score += 200; SFX.pot(); pop(x, 170, '200', WHITE); }
  });
  stepFx();
}
function stepFx() {
  for (const e of fx) { e.t++; if (e.k === 'smoke') { e.y -= 0.5; e.x += e.dx; } else e.y -= 0.3; }
  fx = fx.filter(e => e.t < (e.k === 'smoke' ? 50 : 60));
}
function reachGoal() { p.goal = true; p.vx = 0; goalT = 0; SFX.fanfare(); setTimeout(() => SFX.meow(), 900); }
function stepGoal() {
  goalT++;
  if (goalT > 90 && bonus > 0 && goalT % 2 === 0) { const d = Math.min(100, bonus); bonus -= d; score += d; if (goalT % 6 === 0) SFX.tick(); }
  if (goalT > 90 && bonus <= 0 && goalT > 300) { saveHi(); setMode('clear'); }
  stepFx();
}
function saveHi() { if (score > hi) { hi = score; try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {} } }
function step(live) {
  S.mt++; S.t++;
  if (S.mode === 'title') { if (live && ++S.idle > 60 * 45) S.done = true; }
  else if (S.mode === 'intro') { if (S.mt > 150) setMode('play'); }
  else if (S.mode === 'play') { if (!live || S.paused) return; stepPlay(); }
  else if (S.mode === 'clear') { if (S.mt > 900) S.done = true; }
}

/* ---------- drawing ---------- */
const FIRE = ['#d82800', '#fc7460', '#fca044', '#f8d878'];
function drawHoop(h, half) {
  const x = Math.round(h.x - cam), cy = (HOOP_T + HOOP_B) / 2, ry = (HOOP_B - HOOP_T) / 2, ph = S.t >> 2;
  if (half < 0) { R(g, x - 1, 97, 2, 7, '#6844fc'); R(g, x - 2, 97, 4, 1, '#9c84fc'); }
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, s = Math.sin(a);
    if ((half < 0) !== (s < 0)) continue;                    // back half first (left), front half after moli
    const px = x + Math.round(s * HOOP_RX), py = Math.round(cy - Math.cos(a) * ry);
    const k = hash(i, ph) * 4 | 0;
    R(g, px - 1, py - 1, 3, 3, FIRE[k]);
    if (hash(ph, i) < 0.3) R(g, px + (s < 0 ? -2 : 2), py - 2, 1, 1, FIRE[3 - k % 2]);   // licks of flame
  }
  if (half < 0 && h.fish && !h.got) g.drawImage(FISH, x - 6, HOOP_T + 8 + ((S.t >> 4) % 2));
}
function drawPot(x) {
  x = Math.round(x - cam); if (x < -20 || x > W + 20) return;
  const ph = S.t >> 3;
  /* flame: stacked tongues that change every few frames */
  for (let i = 0; i < 9; i++) {
    const hh = 6 + hash(i, ph) * 12, fx0 = x - 5 + i + Math.round((hash(ph, i) - 0.5) * 2);
    R(g, fx0, 196 - hh, 1, hh, FIRE[hash(i + 9, ph) * 3 | 0]);
    R(g, fx0, 196 - hh * 0.5, 1, hh * 0.5, FIRE[2 + (hash(i, ph + 3) < 0.5 ? 1 : 0)]);
  }
  disc(g, x, 201, 6.5, WHITE); R(g, x - 7, 195, 15, 2, RED); R(g, x - 6, 197, 13, 1, '#adadad');
  R(g, x - 9, 198, 2, 3, '#00a800'); R(g, x + 8, 198, 2, 3, '#00a800');
  for (let i = 0; i < 5; i++) R(g, x - 4 + i * 2, 202 + (i % 2), 1, 1, '#fca044');
  R(g, x - 5, 207, 11, 1, '#000');
}
/* moli on the cat: the cat's back is at feet-16; moli's feet stand on it, arms out for balance */
function drawRider(x, y, o) {
  x = Math.round(x); y = Math.round(y);
  const burnt = o.dead, frame = o.air ? 'jump' : o.moving ? RUNSEQ[(o.anim >> 3) % 4] : 'run2';
  const bob = !o.air && o.moving && frame !== 'run2' ? 1 : 0;
  g.drawImage((burnt ? CAT_B : CAT)[frame], x - 21, y - 24);
  if (burnt) {                                    // fur standing on end
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI - Math.PI, rr = 15 + hash(i, S.t >> 3) * 4; R(g, x - 2 + Math.round(Math.cos(a) * rr), y - 12 + Math.round(Math.sin(a) * rr * 0.7), 1, 2, INK); }
  }
  const fy = y - 16 + bob, top = fy - 21 - (o.hop || 0);
  /* legs */
  R(g, x - 4, top + 18, 2, fy - top - 18, INK); R(g, x + 3, top + 18, 2, fy - top - 18, INK);
  R(g, x - 6, fy - 1, 4, 1, INK); R(g, x + 3, fy - 1, 4, 1, INK);
  /* arms: balancing out to the sides, straight up in a jump or a cheer, flailing when burnt */
  const sway = Math.sin(S.t * 0.15) * 2;
  let al, ar;
  if (o.dead) { const f = (S.t >> 2) % 2 ? 4 : -4; al = [-11, -6 + f]; ar = [11, -6 - f]; }
  else if (o.air || o.cheer) { al = [-14, -11]; ar = [14, -11]; }   // raised arms spread in a V, never straight up (they'd read as ears)
  else { al = [-12, -3 + sway]; ar = [12, -3 - sway]; }
  const sy = top + 10;
  for (const [ax, ay] of [al, ar]) {
    const sx = x + (ax < 0 ? -7 : 7);
    const n = 8;
    for (let i = 0; i <= n; i++) R(g, Math.round(sx + (ax - (ax < 0 ? -7 : 7)) * i / n * 1.0 + (ax < 0 ? 0 : 0)), Math.round(sy + ay * i / n), 1, 1, INK);
    disc(g, sx + (ax - (ax < 0 ? -7 : 7)), sy + ay, 1.6, INK);
  }
  g.drawImage(o.dead ? MOLI_X : MOLI, x - 8, top);
  if (o.dead) {                                   // × eye
    for (let d = -2; d <= 2; d++) { R(g, x + 1 + d, top + 8 + d, 1, 1, WHITE); R(g, x + 1 + d, top + 8 - d, 1, 1, WHITE); }
  }
}
function drawHUD() {
  text(g, 'MOLI-' + String(score).padStart(6, '0'), 16, 12, { color: WHITE });
  text(g, 'HI-' + String(Math.max(hi, score)).padStart(6, '0'), 128, 12, { color: WHITE });
  text(g, 'STAGE-01', 232, 12, { color: WHITE });
  R(g, 14, 26, 108, 14, RED); R(g, 16, 28, 104, 10, '#000');
  text(g, 'BONUS-' + String(bonus).padStart(4, '0'), 20, 29, { color: YEL });
  for (let i = 0; i < Math.max(0, lives - 1); i++) { const lx = 140 + i * 12; R(g, lx, 29, 8, 9, INK); R(g, lx + 1, 28, 6, 1, INK); R(g, lx + 3, 31, 3, 3, WHITE); R(g, lx + 4, 32, 1, 1, INK); R(g, lx - 1, 29, 1, 9, '#8c8799'); R(g, lx + 8, 29, 1, 9, '#8c8799'); R(g, lx + 1, 27, 6, 1, '#8c8799'); }
}
function drawField() {
  g.drawImage(LV, -Math.round(cam), 0);
  R(g, 0, 0, W, 56, '#000');
  drawHUD();
  for (const x of POTS) drawPot(x);
  for (const h of hoops) drawHoop(h, -1);
}
function drawPlay() {
  drawField();
  const cheer = p.goal && goalT > 20;
  drawRider(p.x - cam, p.y, { air: p.air, moving: p.vx !== 0, anim: p.anim, dead: !!p.dead, cheer, hop: cheer ? Math.abs(Math.sin(goalT * 0.15)) * 8 : 0 });
  for (const h of hoops) drawHoop(h, 1);
  for (const e of fx) {
    if (e.k === 'smoke') { const r = 2 + e.t / 12; disc(g, e.x - cam, e.y, r, e.t < 20 ? '#7c7c7c' : '#4c4c58'); }
    else text(g, e.s, Math.round(e.x - cam), Math.round(e.y), { align: 'center', ...(/[^\x00-\x7f]/.test(e.s) ? { size: 12, fam: CJK } : {}), color: e.col, shadow: '#000' });
  }
  if (p.goal) {
    if (goalT > 20) for (let i = 0; i < 24; i++) {
      const cx = ((i * 53 + goalT * (0.5 + (i % 3) * 0.3)) % 360) - 20, cy = 60 + ((i * 37 + goalT * (1 + (i % 4) * 0.4)) % 150);
      R(g, cx, cy, 2, 2, FIRE[i % 4 === 0 ? 3 : 0] === '#d82800' ? '#fc7460' : ['#48cdde', '#b71e7b', YEL, WHITE][i % 4]);
    }
    text(g, 'STAGE CLEAR!', W / 2, 120, { align: 'center', color: YEL, shadow: RED });
    text(g, '喵～ 好耶！', W / 2, 136, { align: 'center', size: 14, fam: CJK, color: WHITE, shadow: '#000' });
  }
  if (S.paused) {
    R(g, W / 2 - 60, 118, 120, 36, 'rgba(0,0,0,.7)');
    text(g, 'PAUSE', W / 2, 124, { align: 'center', color: WHITE });
    text(g, '按 回车 继续', W / 2, 136, { align: 'center', size: 12, fam: CJK, color: YEL });
  }
}
/* spotlight on a patch of ring floor centred at (cx, fy): otherwise black moli and the black cat vanish into the black screen */
function spotlight(cx, fy) {
  const glow = g.createRadialGradient(cx, fy - 20, 4, cx, fy - 20, 46);
  glow.addColorStop(0, 'rgba(255,244,200,.55)'); glow.addColorStop(1, 'rgba(255,244,200,0)');
  g.fillStyle = 'rgba(255,248,208,.16)'; g.beginPath(); g.moveTo(cx - 10, fy - 56); g.lineTo(cx + 10, fy - 56); g.lineTo(cx + 54, fy + 6); g.lineTo(cx - 54, fy + 6); g.fill();
  g.fillStyle = glow; g.fillRect(cx - 50, fy - 70, 100, 80);
  g.save(); g.beginPath(); g.ellipse(cx, fy, 58, 12, 0, 0, Math.PI * 2); g.clip();
  R(g, cx - 60, fy - 14, 120, 30, GREEN); R(g, cx - 60, fy - 4, 120, 1, '#000');
  g.fillStyle = 'rgba(255,248,208,.22)'; g.fillRect(cx - 60, fy - 14, 120, 30); g.restore();
  g.strokeStyle = WHITE; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, fy, 58, 12, 0, 0, Math.PI * 2); g.stroke();
}
function drawIntro() {
  R(g, 0, 0, W, H, '#000');
  drawHUD();
  text(g, 'STAGE 01', W / 2, 96, { align: 'center', color: WHITE });
  text(g, '第一场 · 火圈', W / 2, 112, { align: 'center', size: 14, fam: CJK, color: YEL });
  spotlight(W / 2 - 20, 180);
  drawRider(W / 2 - 20, 182, { moving: true, anim: S.mt });
  text(g, 'x ' + lives, W / 2 + 14, 160, { color: WHITE });
}
let cover = null;
if (window.MOLI_COVERS && window.MOLI_COVERS.circus) { const im = new Image(); im.onload = () => { cover = im; }; im.src = window.MOLI_COVERS.circus; }
function drawTitle(live) {
  R(g, 0, 0, W, H, '#000');
  const ch = 216, cw = Math.round(ch * 2 / 3), cx = W - cw - 10, cy = 12;
  if (cover) {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(cover, cx, cy, cw, ch); g.imageSmoothingEnabled = false;
  } else {
    g.drawImage(LV, 60, 40, cw, ch, cx, cy, cw, ch);
    R(g, cx, cy, cw, 17, '#000');
    drawRider(cx + cw / 2, cy + 190, { moving: true, anim: S.t });
    const h = { x: cx + cw / 2 + 36 + 0, fish: true, got: false }; const c0 = cam; cam = 0; drawHoop(h, -1); drawHoop(h, 1); cam = c0;
  }
  const L = 16;
  /* the name follows the room's 中 / EN switch; in English the big line already says it, so the small one steps aside */
  const nm = window.LANG === 'en' ? ['MOLI CIRCUS', 22] : ['茉莉马戏团', 26];
  text(g, nm[0], L - 1, 24, { size: nm[1], fam: CJK, color: '#fce38a' });
  text(g, nm[0], L, 24, { size: nm[1], fam: CJK, color: YEL, shadow: RED });
  if (!(window.LANG === 'en')) text(g, 'MOLI CIRCUS', L + 2, 62, { color: WHITE, shadow: INK });
  text(g, 'STAGE 1 · 骑猫钻火圈', L + 2, 78, { size: 12, fam: CJK, color: '#b7b3c6' });
  text(g, 'HI-' + String(hi).padStart(6, '0'), L + 2, 100, { color: '#6e6a80' });
  if ((S.t >> 5) % 2 === 0) text(g, 'PUSH START', L + 2, 150, { color: WHITE });
  if (live) {
    text(g, '→ 前进 · ← 后退', L, 176, { size: 11, fam: CJK, color: '#b7b3c6' });
    text(g, 'K 跳 · 回车 开始', L, 192, { size: 11, fam: CJK, color: '#b7b3c6' });
  } else if ((S.t >> 5) % 2 === 0) text(g, '点击电视 开始游戏', L, 184, { size: 13, fam: CJK, color: YEL });
  text(g, '© MOLINK 1990', L, 224, { size: 8, color: '#4c4c58' });
}
function drawOver() {
  R(g, 0, 0, W, H, '#000');
  drawHUD();
  text(g, 'GAME OVER', W / 2, 92, { align: 'center', color: RED });
  ['CONTINUE', 'END'].forEach((o, i) => { text(g, o, W / 2 - 30, 120 + i * 18, { color: WHITE }); if (i === S.overSel) text(g, '▶', W / 2 - 44, 118 + i * 18, { size: 10, fam: CJK, color: YEL }); });
  spotlight(W / 2, 204);
  drawRider(W / 2, 206, { dead: true, anim: 0 });
}
function drawClear() {
  if (S.mt > 0) { K.disclaimer(g, S.mt); return; }
}

/* ---------- cartridge label: the game's own pixel art, blown up ×1.5, with a painted-style title on top ---------- */
function drawCover(c) {
  const out = c.getContext('2d'), sc = cv(106, 106), sg = sc.getContext('2d');
  R(out, 0, 0, 160, 240, '#000');
  const g0 = g, c0 = cam; g = sg; cam = 1200; sg.translate(0, -100);
  g.drawImage(LV, -1200, 0);
  drawPot(1262);
  const h = { x: 1256, fish: true, got: false };
  drawHoop(h, -1);
  drawRider(1250 - cam, 166, { air: true, anim: 0 });
  drawHoop(h, 1);
  for (let i = 0; i < 26; i++) R(g, hash(i, 1) * 106, 100 + hash(i, 2) * 70, 1, 2, ['#48cdde', '#b71e7b', YEL, WHITE][i % 4]);
  g = g0; cam = c0;
  out.imageSmoothingEnabled = false; out.drawImage(sc, 0, 80, 159, 159);
  /* spotlights */
  out.globalAlpha = 0.12; out.fillStyle = '#fff8d0';
  for (const [x0, x1] of [[20, 70], [110, 150]]) { out.beginPath(); out.moveTo((x0 + x1) / 2 - 4, 0); out.lineTo((x0 + x1) / 2 + 4, 0); out.lineTo(x1, 240); out.lineTo(x0, 240); out.fill(); }
  out.globalAlpha = 1;
  for (let x = 0; x < 160; x += 8) { R(out, x, 72, 4, 4, RED); R(out, x + 4, 72, 4, 4, WHITE); R(out, x, 76, 4, 4, WHITE); R(out, x + 4, 76, 4, 4, RED); }
  text(out, '茉莉', 80, 4, { align: 'center', size: 30, fam: CJK, color: YEL, shadow: RED });
  text(out, '马戏团', 80, 34, { align: 'center', size: 24, fam: CJK, color: YEL, shadow: RED });
  R(out, 0, 226, 160, 14, '#000');
  text(out, 'MOLI CIRCUS · STAGE 1', 80, 228, { align: 'center', size: 9, fam: CJK, color: WHITE });
}
if (coverTo) { drawCover(coverTo); return null; }

/* ---------- top level ---------- */
return {
  get done() { return S.done; },
  get mode() { return S.mode; },
  get playing() { return S.mode === 'play' && !S.paused; },
  hints: [['→ / ←', '前进 / 后退'], ['K', 'A 跳'], ['Enter', '开始 / 暂停'], ['⌫', '返回卡带']],
  step,
  draw(live) {
    g.imageSmoothingEnabled = false;
    if (S.mode === 'title') drawTitle(live);
    else if (S.mode === 'intro') drawIntro();
    else if (S.mode === 'play') drawPlay();
    else if (S.mode === 'over') drawOver();
    else drawClear();
  },
  /* recorded music: the circus march loops on the title and while riding; it stops for a fall and the finish */
  get track() {
    if (S.mode === 'title') return { id: 'circus_bgm', loop: true };
    if (S.mode === 'play' && !p.dead && !p.goal) return { id: 'circus_bgm', loop: true, paused: S.paused };
    return null;
  },
  music() {},
  key(k, down) {
    const was = keys[k]; if (k in keys) keys[k] = down;
    if (!down || was) return;
    S.idle = 0;
    if (S.mode === 'title') {
      if (k === 'S' || k === 'J') begin();
    } else if (S.mode === 'play') {
      if (k === 'S') { if (!p.dead && !p.goal) { S.paused = !S.paused; SFX.pause(); } return; }
      if (k === 'X') { S.done = true; return; }
    } else if (S.mode === 'over') {
      if (k === 'U' || k === 'D') { S.overSel ^= 1; SFX.blip(); }
      else if (k === 'S' || k === 'J') { if (S.overSel === 0) { lives = 3; score = 0; resetRun(); setMode('intro'); } else S.done = true; }
    } else if (S.mode === 'clear' && (k === 'S' || k === 'J') && S.mt > 90) S.done = true;
    if (k === 'X' && S.mode !== 'play') S.done = true;
  },
  tap() {
    S.idle = 0;
    if (S.mode === 'title') begin();
    else if (S.mode === 'play' && S.paused) S.paused = false;
    else if (S.mode === 'over') { if (S.overSel === 0) { lives = 3; score = 0; resetRun(); setMode('intro'); } else S.done = true; }
  },
  release() { for (const k in keys) keys[k] = false; },
  stop() {},
  sky() { return S.mode === 'play' ? 0x388700 : S.mode === 'title' ? 0xd1447e : 0x505060; },
  debug(arg) {
    newGame(); resetRun(); setMode('play');
    if (arg === 'title') setMode('title');
    else if (arg === 'intro') setMode('intro');
    else if (arg === 'over') { S.overSel = 0; setMode('over'); }
    else if (arg === 'clear') setMode('clear');
    else if (arg === 'goal') { p.x = DRUM.x0 + 18; p.y = DRUM.top; cam = WORLD - W; reachGoal(); }
    else if (arg && isFinite(+arg)) { cp = Math.max(0, Math.min(10, Math.floor((+arg - 11) / 256))); p.x = +arg; cam = Math.max(0, Math.min(p.x - 96, WORLD - W)); hoops = []; spawnHoop(cam + 200); potDone = POTS.map(x => x < p.x); }
  },
  /* test hooks */
  dbg: { set god(v) { S.god = v; }, get p() { return p; }, get hoops() { return hoops; }, get score() { return score; }, get cam() { return cam; }, get lives() { return lives; }, get bonus() { return bonus; } },
};
};
/* register the drawn label so the cartridge menu and the title screen can show it */
try {
  if (window.MoliKit) {
    const c = window.MoliKit.cv(160, 240);
    window.MoliCircus(c.getContext('2d'), window.MoliKit, c);
    window.MOLI_COVERS = window.MOLI_COVERS || {};
    if (!window.MOLI_COVERS.circus) window.MOLI_COVERS.circus = c.toDataURL('image/png');
  }
} catch (e) { console.warn('circus cover', e); }
})();
