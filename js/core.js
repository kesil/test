// JIMOTHY: TRASH TALES — core: boot, input, assets, atlas, audio, utils
'use strict';

const VW = 480, VH = 270, TILE = 16;
const cv = document.getElementById('game');
const cx = cv.getContext('2d');
cx.imageSmoothingEnabled = false;

const URLQ = new URLSearchParams(location.search);

// ---------- scaling ----------
function fitCanvas() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / VW, innerHeight / VH)));
  const cssW = VW * s, cssH = VH * s;
  // if integer scale wastes >25% of screen, allow non-integer fill on small screens
  if (cssW < innerWidth * 0.72 && cssH < innerHeight * 0.72) {
    const f = Math.min(innerWidth / VW, innerHeight / VH);
    cv.style.width = (VW * f) + 'px'; cv.style.height = (VH * f) + 'px';
  } else {
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  }
}
addEventListener('resize', fitCanvas); fitCanvas();

// ---------- input ----------
const Input = {
  l: false, r: false, u: false, d: false,
  jump: false, atk: false, dash: false, start: false, taunt: false,
  jumpP: false, atkP: false, dashP: false, startP: false, anyP: false, tauntP: false,
  _prev: {},
  post() {
    for (const k of ['jump', 'atk', 'dash', 'start', 'taunt']) this[k + 'P'] = false;
    this.anyP = false;
  }
};
const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
  KeyX: 'atk', KeyJ: 'atk',
  KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
  Enter: 'start', KeyT: 'taunt',
};
addEventListener('keydown', e => {
  if (e.code === 'KeyM') { Audio2.toggleMute(); return; }
  const k = KEYMAP[e.code];
  if (k !== undefined) {
    e.preventDefault();
    if (!Input[k]) Input[k + 'P'] = true;
    Input[k] = true;
  }
  Input.anyP = true;
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k !== undefined) Input[k] = false;
});

// touch
const touchEl = document.getElementById('touch');
if ('ontouchstart' in window) touchEl.style.display = 'block';
function bindBtn(id, key) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); if (!Input[key]) Input[key + 'P'] = true; Input[key] = true; Input.anyP = true; el.classList.add('on'); };
  const off = e => { e.preventDefault(); Input[key] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('pointercancel', off);
}
bindBtn('tL', 'l'); bindBtn('tR', 'r'); bindBtn('tU', 'u'); bindBtn('tDn', 'd');
bindBtn('tJ', 'jump'); bindBtn('tA', 'atk'); bindBtn('tD', 'dash');
// tapping the canvas acts as start on touch
cv.addEventListener('pointerdown', () => { Input.startP = true; Input.anyP = true; });

// ---------- assets ----------
const Assets = { img: {}, json: {} };
function loadAll(list, done) {
  let n = list.length;
  const one = () => { if (--n === 0) done(); };
  for (const [kind, key, url] of list) {
    if (kind === 'img') {
      const im = new Image();
      im.onload = one; im.onerror = one;
      im.src = url; Assets.img[key] = im;
    } else {
      fetch(url).then(r => r.json()).then(j => { Assets.json[key] = j; one(); })
        .catch(() => one());
    }
  }
}

// ---------- atlas helpers ----------
const FW = 80, FH = 64;           // jimothy frame size
const FEET_Y = 58, CENTER_X = 39; // anchors

// Draw a frame from a row-based sheet. (x,y) = feet-center position in world px.
function drawActor(g, sheetKey, atlasKey, anim, frame, x, y, flip, scale = 1, alpha = 1) {
  const atlas = Assets.json[atlasKey];
  const a = atlas.animations[anim];
  if (!a) return;
  const f = Math.min(frame, a.frames - 1);
  const img = Assets.img[sheetKey];
  const sx = f * FW, sy = a.row * FH;
  g.save();
  if (alpha < 1) g.globalAlpha = alpha;
  g.translate(Math.round(x), Math.round(y));
  if (flip) g.scale(-1, 1);
  if (scale !== 1) g.scale(scale, scale);
  g.drawImage(img, sx, sy, FW, FH, -CENTER_X, -FEET_Y, FW, FH);
  g.restore();
}

// animation cursor
class Anim {
  constructor() { this.name = ''; this.t = 0; this.frame = 0; this.done = false; }
  set(name) {
    if (this.name !== name) { this.name = name; this.t = 0; this.frame = 0; this.done = false; }
  }
  update(atlasKey, dt) {
    const a = Assets.json[atlasKey].animations[this.name];
    if (!a || a.duration_ms === 0) return;
    this.t += dt * 1000;
    if (this.t >= a.duration_ms) {
      this.t -= a.duration_ms;
      this.frame++;
      if (this.frame >= a.frames) {
        if (a.loop) this.frame = 0;
        else { this.frame = a.frames - 1; this.done = true; }
      }
    }
  }
}

// extra sheets (named free rects) — checks extra, then extra2
function drawSprite(g, name, x, y, flip = false, scale = 1, alpha = 1) {
  let s = Assets.json.extra.sprites[name], img = Assets.img.extra;
  if (!s && Assets.json.extra2) { s = Assets.json.extra2.sprites[name]; img = Assets.img.extra2; }
  if (!s) return;
  const [sx, sy, w, h] = s;
  g.save();
  if (alpha < 1) g.globalAlpha = alpha;
  g.translate(Math.round(x), Math.round(y));
  if (flip) g.scale(-1, 1);
  if (scale !== 1) g.scale(scale, scale);
  g.drawImage(img, sx, sy, w, h, -(w >> 1), -h, w, h);
  g.restore();
}
function spriteSize(name) {
  const s = Assets.json.extra.sprites[name] || (Assets.json.extra2 && Assets.json.extra2.sprites[name]);
  return s ? { w: s[2], h: s[3] } : { w: 0, h: 0 };
}

// tiles
function drawTile(g, name, x, y) {
  const t = Assets.json.tiles.tiles[name];
  if (!t) return;
  const [c, r, w, h] = t.tile;
  g.drawImage(Assets.img.tiles, c * TILE, r * TILE, w * TILE, h * TILE, x, y, w * TILE, h * TILE);
}
// office tileset
function drawTileO(g, name, x, y) {
  const t = Assets.json.office && Assets.json.office.tiles[name];
  if (!t) return;
  g.drawImage(Assets.img.office, t[0] * TILE, t[1] * TILE, TILE, TILE, x, y, TILE, TILE);
}

// ---------- text ----------
function txt(g, s, x, y, color = '#fff', size = 8, align = 'left') {
  g.font = `${size}px monospace`;
  g.textAlign = align; g.textBaseline = 'top';
  g.fillStyle = color;
  g.fillText(s, Math.round(x), Math.round(y));
}
function txtShadow(g, s, x, y, color = '#fff', size = 8, align = 'left') {
  txt(g, s, x + 1, y + 1, 'rgba(0,0,0,.7)', size, align);
  txt(g, s, x, y, color, size, align);
}

// ---------- utils ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
let _seed = 1234;
function srand(s) { _seed = s; }
function rnd() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }
const rndi = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- audio ----------
const Audio2 = {
  ctx: null, master: null, musicGain: null,
  muted: URLQ.get('mute') === '1' || localStorage.getItem('jim_mute') === '1',
  seq: null, seqTimer: 0, tempoMul: 1,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.42;
      this.musicGain.connect(this.master);
    } catch (e) { /* no audio */ }
  },
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('jim_mute', this.muted ? '1' : '0');
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },
  blip(freq, dur = 0.08, type = 'square', vol = 0.25, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.15, vol = 0.2, low = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    if (low) {
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      src.connect(f); f.connect(g);
    } else src.connect(g);
    g.connect(this.master); src.start(t);
  },
  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':    this.blip(300, 0.12, 'square', 0.18, 260); break;
      case 'land':    this.noise(0.06, 0.10, true); break;
      case 'pickup':  this.blip(660, 0.05, 'square', 0.2); setTimeout(() => this.blip(880, 0.07, 'square', 0.2), 50); break;
      case 'coin':    this.blip(988, 0.05, 'square', 0.15); setTimeout(() => this.blip(1319, 0.09, 'square', 0.15), 45); break;
      case 'hurt':    this.blip(200, 0.2, 'sawtooth', 0.25, -120); break;
      case 'swipe':   this.noise(0.08, 0.16); break;
      case 'throw':   this.blip(500, 0.08, 'triangle', 0.2, -200); break;
      case 'hit':     this.blip(160, 0.1, 'square', 0.25, -60); this.noise(0.05, 0.12); break;
      case 'stomp':   this.blip(140, 0.12, 'square', 0.3, -80); break;
      case 'spring':  this.blip(330, 0.18, 'square', 0.2, 500); break;
      case 'splash':  this.noise(0.25, 0.18, true); break;
      case 'dig':     this.noise(0.07, 0.12, true); break;
      case 'eat':     this.blip(180, 0.06, 'square', 0.2); setTimeout(() => this.blip(140, 0.06, 'square', 0.2), 70); break;
      case 'power':   [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.1, 'square', 0.2), i * 70)); break;
      case 'ui':      this.blip(880, 0.04, 'square', 0.12); break;
      case 'boom':    this.noise(0.5, 0.4, true); this.blip(80, 0.4, 'sawtooth', 0.3, -40); break;
      case 'roar':    this.blip(90, 0.5, 'sawtooth', 0.3, 60); this.noise(0.4, 0.2, true); break;
      case 'zap':     this.blip(1200, 0.15, 'sawtooth', 0.2, -900); break;
      case 'glitch':  for (let i = 0; i < 5; i++) setTimeout(() => this.blip(200 + Math.random() * 1500, 0.04, 'square', 0.15), i * 40); break;
      case 'ko':      this.blip(400, 0.6, 'triangle', 0.25, -350); break;
      case 'dive':    this.blip(520, 0.35, 'triangle', 0.22, -420); break;
      case 'fanfare': [523, 523, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, 'square', 0.22), i * 90)); break;
      case 'cancel':  this.blip(700, 0.06, 'square', 0.2); setTimeout(() => this.blip(500, 0.06, 'square', 0.2), 60); setTimeout(() => this.blip(300, 0.12, 'square', 0.2), 120); break;
    }
  },
  // --- music sequencer: patterns of [midiNote or 0, steps] per channel ---
  play(songName) {
    this.songName = songName;
    this.seq = SONGS[songName] || null;
    this.step = 0; this.seqTimer = 0;
    this.chPos = this.seq ? this.seq.ch.map(() => ({ i: 0, wait: 0 })) : [];
  },
  stop() { this.seq = null; },
  update(dt) {
    if (!this.ctx || !this.seq || this.muted) return;
    this.seqTimer += dt * this.tempoMul;
    const spb = 60 / this.seq.bpm / 4; // 16th note
    while (this.seqTimer >= spb) {
      this.seqTimer -= spb;
      for (let c = 0; c < this.seq.ch.length; c++) {
        const ch = this.seq.ch[c], pos = this.chPos[c];
        if (pos.wait > 0) { pos.wait--; continue; }
        const ev = ch.notes[pos.i % ch.notes.length];
        pos.i++;
        pos.wait = ev[1] - 1;
        if (ev[0] > 0) this.tone(440 * Math.pow(2, (ev[0] - 69) / 12), spb * ev[1] * 0.9, ch.type, ch.vol);
        else if (ev[0] === -1) this.hat(spb * 0.5, ch.vol);
      }
    }
  },
  tone(freq, dur, type, vol) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + dur + 0.02);
  },
  hat(dur, vol) {
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain(); g.gain.value = vol * 0.6;
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t);
  },
};

// songs: minimal chip loops. note -1 = hat, 0 = rest.
const SONGS = {
  alley: {
    bpm: 112,
    ch: [
      { type: 'triangle', vol: 0.30, notes: [[38,4],[38,2],[41,2],[38,4],[36,2],[34,2], [38,4],[38,2],[41,2],[43,2],[41,2],[36,4]] },
      { type: 'square', vol: 0.10, notes: [[62,2],[0,2],[65,2],[62,2],[0,2],[69,2],[67,2],[65,2], [62,2],[0,2],[65,2],[67,2],[69,4],[0,2],[65,2],[0,2]] },
      { type: 'square', vol: 0.05, notes: [[-1,2],[-1,2],[0,2],[-1,2]] },
    ]
  },
  rooftops: {
    bpm: 124,
    ch: [
      { type: 'triangle', vol: 0.30, notes: [[36,2],[36,2],[43,2],[36,2],[39,2],[36,2],[41,2],[39,2]] },
      { type: 'square', vol: 0.09, notes: [[60,2],[63,2],[67,2],[70,2],[67,2],[63,2],[65,2],[63,2], [60,2],[63,2],[67,2],[72,2],[70,2],[67,2],[63,4]] },
      { type: 'square', vol: 0.05, notes: [[-1,1],[0,1],[-1,2],[-1,2],[0,2]] },
    ]
  },
  boss: {
    bpm: 140,
    ch: [
      { type: 'sawtooth', vol: 0.20, notes: [[33,2],[33,2],[33,2],[36,2],[33,2],[33,2],[39,2],[38,2]] },
      { type: 'square', vol: 0.09, notes: [[57,1],[0,1],[57,1],[0,1],[60,2],[57,2],[63,2],[62,2],[60,2],[57,2]] },
      { type: 'square', vol: 0.06, notes: [[-1,1],[-1,1],[-1,1],[-1,1]] },
    ]
  },
  cart: {
    bpm: 150,
    ch: [
      { type: 'triangle', vol: 0.30, notes: [[40,2],[40,2],[47,2],[40,2],[45,2],[40,2],[43,2],[45,2]] },
      { type: 'square', vol: 0.10, notes: [[64,1],[67,1],[71,2],[67,2],[64,2],[69,2],[67,2],[64,2],[62,2], [64,1],[67,1],[71,2],[74,2],[71,2],[69,2],[67,2],[69,4]] },
      { type: 'square', vol: 0.06, notes: [[-1,1],[0,1],[-1,1],[-1,1]] },
    ]
  },
  disco: {
    bpm: 118,
    ch: [
      { type: 'triangle', vol: 0.32, notes: [[36,2],[48,2],[36,2],[48,2],[41,2],[53,2],[43,2],[55,2]] },
      { type: 'square', vol: 0.10, notes: [[60,2],[64,2],[67,2],[64,2],[69,2],[67,2],[64,2],[60,2], [65,2],[69,2],[72,2],[69,2],[67,2],[64,2],[62,2],[64,2]] },
      { type: 'square', vol: 0.07, notes: [[-1,1],[-1,1],[-1,2],[-1,1],[-1,1],[-1,2]] },
    ]
  },
  stealth: {
    bpm: 96,
    ch: [
      { type: 'triangle', vol: 0.28, notes: [[33,4],[0,2],[36,2],[33,4],[0,2],[40,2],[33,4],[0,2],[36,2],[38,2],[36,2],[33,4]] },
      { type: 'square', vol: 0.05, notes: [[57,2],[0,6],[60,2],[0,6],[57,2],[0,4],[64,1],[63,1],[0,8]] },
      { type: 'square', vol: 0.04, notes: [[-1,2],[0,4],[-1,1],[-1,1]] },
    ]
  },
  sad: {
    bpm: 70,
    ch: [
      { type: 'triangle', vol: 0.25, notes: [[45,8],[43,8],[41,8],[40,16]] },
      { type: 'square', vol: 0.07, notes: [[57,8],[55,8],[53,8],[52,16]] },
    ]
  },
};
