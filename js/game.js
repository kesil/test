// JIMOTHY: TRASH TALES — gameplay: level runtime, player, enemies, bosses, gags
// Director's Cut: stealth, crows, combos, steamrollers, CAPTCHA, wizardry
'use strict';

const GOD = URLQ.get('god') === '1';

const G = {
  state: 'boot', stageIdx: 0, level: null, cfg: null,
  cam: { x: 0, y: 0, shake: 0 },
  p: null, ents: [], fx: [], shots: [], texts: [],
  score: 0, deaths: 0, timeF: 0, totalScore: 0, totalDeaths: 0, totalCoins: 0,
  narrFired: {}, toast: null, toastQ: [], dialog: null, gag: null, chaser: null, boss: null,
  checkpoint: null, gsign: 1, hitstop: 0, fade: 0,
  springs: {}, flagsLit: {}, respawnBoxes: [], outroT: 0, discoFound: false,
  stats: { kills: 0, coins: 0, wakes: 0, taunts: 0 }, combo: { n: 0, t: 0, best: 0 },
  roller: null, captcha: null,
};
window.JIM = G;

// ---------- trophies ----------
let achSet = new Set(JSON.parse(localStorage.getItem('jim_ach') || '[]'));
function award(id) {
  if (achSet.has(id) || !ACH[id]) return;
  achSet.add(id);
  localStorage.setItem('jim_ach', JSON.stringify([...achSet]));
  toast('*** TROPHY: ' + ACH[id].n + ' — ' + ACH[id].d + ' ***', 280);
  G.score += 200;
  Audio2.sfx('fanfare');
}

// ---------- helpers ----------
function tileAt(px, py) {
  const L = G.level;
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx < 0 || tx >= L.w || ty < 0) return T.BRICK;
  if (ty >= L.h) return T.NONE;
  return L.grid[ty * L.w + tx];
}
function setTile(px, py, v) {
  const L = G.level;
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (tx >= 0 && tx < L.w && ty >= 0 && ty < L.h) L.grid[ty * L.w + tx] = v;
}
function isSolid(code) { return SOLID.has(code); }

function toast(msg, time = 210) { G.toastQ.push({ msg, t: time }); if (G.toastQ.length > 4) G.toastQ.shift(); Audio2.sfx('ui'); }
function narrOnce(key) {
  if (G.narrFired[key] || !NARR[key]) return;
  G.narrFired[key] = true; toast(NARR[key], 260);
}
function addText(x, y, s, color = '#ffd76b') { G.texts.push({ x, y, s, color, t: 60 }); }
function addFX(sheet, anim, x, y, flip = false) { G.fx.push({ sheet, anim: (() => { const a = new Anim(); a.set(anim); return a; })(), x, y, flip, t: 0 }); }
function shake(n) { G.cam.shake = Math.max(G.cam.shake, n); }
function hitstop(n) { G.hitstop = Math.max(G.hitstop, n); }
function addScore(n, x, y) {
  if (G.plusMode) n *= 2;
  G.score += n;
  if (x !== undefined) addText(x, y, '+' + n);
}
// TRASH+ enemy velocity factor
function EF() { return G.plusMode ? 1.35 : 1; }

// combo
const COMBO_LINES = { 2: 'DOUBLE TRASH', 3: 'TRIPLE TRASH', 4: 'TRASHTASTIC', 5: 'TRASHOCALYPSE' };
function registerKill(x, y) {
  G.stats.kills++;
  const c = G.combo;
  c.n++; c.t = 180;
  c.best = Math.max(c.best, c.n);
  if (c.n >= 2) {
    const line = COMBO_LINES[Math.min(c.n, 5)];
    const bonus = 50 * (c.n - 1);
    addScore(bonus);
    addText(x, y - 14, line + ' +' + bonus, '#9be89b');
    if (c.n >= 5) award('combo');
  }
}

// noise (stealth): wakes sleeping security gulls
function noise(x, y, r) {
  if (G.p && G.p.sneaking) r *= 0.35;
  for (const e of G.ents) {
    if (e.type === 'sgull' && e.mode === 'sleep' && Math.abs(e.x - x) < r && Math.abs(e.y - y) < r * 1.2) {
      e.mode = 'wake'; e.wakeT = 40;
      G.stats.wakes++;
      narrOnce('gullWake');
      Audio2.sfx('roar');
    }
  }
}

// flip gravity, re-anchoring the player's feet
function flipGravity() {
  G.gsign = -G.gsign;
  const p = G.p;
  if (G.gsign < 0) p.y -= p.h; else p.y += p.h;
  p.vy = 0; p.onGround = false;
}

// entity solids (paywall + cookie banner walls)
function paywallBox(e) { return { x: e.x - 16, y: e.y - 64, w: 32, h: 64 }; }
function bannerBox(e) { return { x: e.x - 24, y: e.y - 62, w: 48, h: 62 }; }
function extraSolids() {
  const out = [];
  for (const e of G.ents) {
    if (e.dead) continue;
    if (e.type === 'paywall') out.push(paywallBox(e));
    if (e.type === 'popupwall') out.push(bannerBox(e));
  }
  return out;
}

// ---------- physics ----------
function moveBody(b, solidsExtra) {
  const gs = b.isPlayer ? G.gsign : 1;
  b.x += b.vx;
  let box = bodyBox(b, gs);
  for (const ty of tilesInRange(box.y, box.h)) {
    for (const tx of tilesInRange(box.x, box.w)) {
      const c = tileAt(tx * TILE + 1, ty * TILE + 1);
      if (isSolid(c)) {
        const r = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
        if (aabb(box, r)) {
          if (b.vx > 0) b.x -= (box.x + box.w) - r.x;
          else if (b.vx < 0) b.x += (r.x + r.w) - box.x;
          box = bodyBox(b, gs);
          b.hitWall = Math.sign(b.vx);
          b.vx = 0;
        }
      }
    }
  }
  if (solidsExtra) for (const r of solidsExtra) {
    if (aabb(box, r)) {
      if (b.x < r.x + r.w / 2) b.x = r.x - box.w / 2;
      else b.x = r.x + r.w + box.w / 2;
      box = bodyBox(b, gs); b.vx = 0;
    }
  }
  const prevFeet = gs > 0 ? b.y : b.y - b.h;
  b.y += b.vy;
  box = bodyBox(b, gs);
  b.onGround = false;
  for (const ty of tilesInRange(box.y, box.h)) {
    for (const tx of tilesInRange(box.x, box.w)) {
      const c = tileAt(tx * TILE + 1, ty * TILE + 1);
      const r = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
      if (!aabb(box, r)) continue;
      if (isSolid(c)) {
        if (b.vy * gs > 0) {
          if (gs > 0) b.y = r.y; else b.y = r.y + TILE;
          b.onGround = true; b.vy = 0;
        } else if (b.vy !== 0) {
          if (gs > 0) b.y = r.y + TILE + b.h; else b.y = r.y - b.h;
          b.vy = 0;
          if (b.isPlayer && (c === T.CRATE || c === T.BOX)) tryBreakTile(tx, ty, c, b);
        }
        box = bodyBox(b, gs);
      } else if ((c === T.PLANK || c === T.DESK) && gs > 0 && !b.dropThrough) {
        if (b.vy > 0 && prevFeet <= r.y + 0.01 && b.y >= r.y) {
          b.y = r.y; b.onGround = true; b.vy = 0;
          box = bodyBox(b, gs);
        }
      } else if (c === T.WIRE && b.isPlayer && gs > 0 && !b.dropThrough) {
        const wy = r.y + 5;
        if (b.vy >= 0 && prevFeet <= wy + 1 && b.y >= wy - 3) {
          b.y = wy; b.onGround = true; b.onWire = true; b.vy = 0;
          narrOnce('wire');
          box = bodyBox(b, gs);
        }
      }
    }
  }
  if (solidsExtra) for (const r of solidsExtra) {
    if (aabb(box, r)) {
      if (b.vy > 0) { b.y = r.y; b.onGround = true; b.vy = 0; }
      else if (b.vy < 0) { b.y = r.y + r.h + box.h; b.vy = 0; }
    }
  }
}
function bodyBox(b, gs = 1) {
  return gs > 0
    ? { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h }
    : { x: b.x - b.w / 2, y: b.y, w: b.w, h: b.h };
}
function* tilesInRange(a, len) {
  const t0 = Math.floor(a / TILE), t1 = Math.floor((a + len - 0.01) / TILE);
  for (let t = t0; t <= t1; t++) yield t;
}

function tryBreakTile(tx, ty, c, byWho) {
  const chonky = G.p.chonk > 0;
  if (c === T.BOX || (c === T.CRATE && (chonky || byWho === 'force'))) {
    setTile(tx * TILE + 1, ty * TILE + 1, T.NONE);
    addFX('v5', 'fx_dust', tx * TILE + 8, ty * TILE + 16);
    Audio2.sfx('hit'); shake(2);
    if (c === T.BOX) {
      const roll = Math.random();
      const item = roll < 0.55 ? 'can' : roll < 0.8 ? 'cookie' : 'can';
      spawnItem(item, tx * TILE + 8, ty * TILE + 12);
      if (G.cfg.boss === 'bin') G.respawnBoxes.push({ tx, ty, t: 300 });
    }
    addScore(10, tx * TILE + 8, ty * TILE);
    return true;
  }
  return false;
}

function spawnItem(item, x, y) {
  G.ents.push({ type: 'item', item, x, y, vy: -2, bob: Math.random() * 6, spawned: true });
}

// ---------- player ----------
function makePlayer(x, y) {
  const a = new Anim(); a.set('idle');
  const hearts = G.plusMode ? 4 : 6;
  return {
    isPlayer: true, x, y, vx: 0, vy: 0, w: 22, h: 34, dir: 1,
    onGround: false, onWire: false, hitWall: 0, dropThrough: false,
    anim: a, sheet: 'v5', atlas: 'v5a',
    hearts, maxHearts: hearts, cans: 3, squashT: 0,
    inv: 0, star: 0, chonk: 0, coffeeT: 0, wizardT: 0, castT: 0, eatT: 0, flatT: 0,
    umbrella: false, jetpack: -1, fuel: 0, mecha: false,
    coyote: 0, jbuf: 0, rollT: 0, rollCd: 0, digT: 0, swipeT: 0, throwT: 0, shootCd: 0,
    state: 'normal', stateT: 0, idleT: 0, cart: false, cartV: 0,
    dead: false, sneaking: false, pouncing: false, climbing: false, swimming: false,
    ghostT: 0, ghostFrom: null,
  };
}

function hurtPlayer(dmg, fromX) {
  const p = G.p;
  if (GOD || p.inv > 0 || p.star > 0 || p.dead || p.ghostT > 0 || G.state !== 'play') return;
  if (p.chonk > 0) dmg = Math.max(1, dmg - 1);
  p.hearts -= dmg;
  p.inv = 80;
  hitstop(5);
  Audio2.sfx('hurt'); shake(4);
  if (fromX !== undefined && !p.cart) {
    p.vx = (p.x < fromX ? -1 : 1) * 2.6;
    p.vy = -2.5 * G.gsign;
  }
  if (p.hearts <= 0) killPlayer();
}
function killPlayer() {
  const p = G.p;
  if (p.dead) return;
  p.dead = true; p.state = 'dead'; p.stateT = 0; p.vx = 0; p.vy = -3;
  G.deaths++;
  G.combo.n = 0;
  Audio2.sfx('ko');
  narrOnce('firstKO');
}
function respawn() {
  const p = G.p;
  const cp = G.checkpoint || { x: 60, y: 200 };
  // ghost float back to the checkpoint
  p.ghostFrom = { x: p.x, y: Math.min(p.y, G.level.h * TILE) };
  p.ghostT = 55;
  Object.assign(p, {
    vx: 0, vy: 0, hearts: p.maxHearts, dead: false,
    state: 'normal', stateT: 0, inv: 120, star: 0, chonk: 0, rollT: 0, flatT: 0,
  });
  p.ghostTo = { x: cp.x, y: cp.y };
  if (p.jetpack >= 0) p.fuel = 100;
  if (G.cfg.cart) { p.cart = true; p.cartV = 0; }
  if (G.gsign < 0) G.gsign = 1;
  if (G.chaser) G.chaser.x = Math.max(G.chaser.startX, cp.x - 300);
  if (G.roller && !G.roller.stopped) G.roller.x = cp.x - 380;
}

function updatePlayer(dt) {
  const p = G.p;

  if (p.dead) {
    p.stateT++;
    p.vy += 0.25;
    p.y += p.vy;
    p.anim.set(p.stateT < 40 ? 'hurt' : 'ko');
    p.sheet = 'v5'; p.atlas = 'v5a';
    p.anim.update('v5a', dt);
    if (p.stateT > 100) respawn();
    return;
  }
  // ghost flight back to checkpoint
  if (p.ghostT > 0) {
    p.ghostT--;
    const k = 1 - p.ghostT / 55;
    p.x = lerp(p.ghostFrom.x, p.ghostTo.x, k);
    p.y = lerp(p.ghostFrom.y, p.ghostTo.y, k) - Math.sin(k * Math.PI) * 40;
    p.anim.set('ghost'); p.sheet = 'v6'; p.atlas = 'v6a';
    p.anim.update('v6a', dt);
    if (p.ghostT === 0) { p.x = p.ghostTo.x; p.y = p.ghostTo.y; G.cam.x = clamp(p.x - VW / 2, 0, G.level.w * TILE - VW); }
    return;
  }

  // timers
  if (p.inv > 0) p.inv--;
  if (p.star > 0) { p.star--; if (p.star === 0) Audio2.tempoMul = 1; }
  if (p.chonk > 0) p.chonk--;
  if (p.coffeeT > 0) p.coffeeT--;
  if (p.wizardT > 0) p.wizardT--;
  if (p.castT > 0) p.castT--;
  if (p.eatT > 0) p.eatT--;
  if (p.flatT > 0) p.flatT--;
  if (p.rollCd > 0) p.rollCd--;
  if (p.swipeT > 0) p.swipeT--;
  if (p.shootCd > 0) p.shootCd--;

  if (p.cart) { updateCart(dt); return; }

  const inWater = tileAt(p.x, p.y - 10) === T.WATER;
  const onLadder = tileAt(p.x, p.y - 8) === T.LADDER || tileAt(p.x, p.y - 24) === T.LADDER;

  if (Input.jumpP) p.jbuf = 8;
  else if (p.jbuf > 0) p.jbuf--;
  if (p.onGround) p.coyote = 7;
  else if (p.coyote > 0) p.coyote--;

  // ---- swim ----
  if (inWater) {
    if (!p.swimming) { p.swimming = true; addFX('v6', 'fx_splash', p.x, p.y); Audio2.sfx('splash'); narrOnce('swim'); }
    p.vx = clamp(p.vx + (Input.r - Input.l) * 0.18, -1.9, 1.9);
    p.vx *= 0.96;
    p.vy += 0.05;
    if (Input.jump) p.vy -= 0.16;
    if (Input.d) p.vy += 0.1;
    p.vy = clamp(p.vy, -2, 2);
    if (Input.r) p.dir = 1; if (Input.l) p.dir = -1;
    moveBody(p, extraSolids());
    const dive = Input.d;
    p.anim.set(dive ? 'dive' : 'swim');
    p.atlas = dive ? 'v6a' : 'v5a'; p.sheet = dive ? 'v6' : 'v5';
    p.anim.update(p.atlas, dt);
    if (p.jbuf > 0 && tileAt(p.x, p.y - 26) !== T.WATER) {
      p.vy = -5.6; p.jbuf = 0; Audio2.sfx('jump');
      addFX('v6', 'fx_splash', p.x, p.y);
    }
    postMovePlayer();
    return;
  } else if (p.swimming) p.swimming = false;

  // ---- climb ----
  if (p.climbing) {
    if (!onLadder) p.climbing = false;
    else {
      p.vx = 0; p.vy = 0;
      const dy = (Input.d ? 1.4 : 0) - (Input.u ? 1.4 : 0);
      p.y += dy;
      if (Input.r) p.dir = 1; if (Input.l) p.dir = -1;
      if (dy !== 0) { p.anim.set('climb'); p.anim.update('v5a', dt); }
      p.sheet = 'v5'; p.atlas = 'v5a';
      if (p.jbuf > 0) {
        p.climbing = false; p.vy = -5.4; p.vx = (Input.r - Input.l) * 2; p.jbuf = 0;
        Audio2.sfx('jump');
      }
      postMovePlayer();
      return;
    }
  }
  if (onLadder && (Input.u || (Input.d && !p.onGround)) && p.rollT <= 0) {
    p.climbing = true; p.vx = 0; p.vy = 0;
  }

  // ---- roll ----
  if (Input.dashP && p.rollT <= 0 && p.rollCd <= 0 && p.state === 'normal') {
    p.rollT = 18; p.rollCd = 26; p.h = 24;
    p.vx = 4.3 * p.dir * (p.chonk ? 1.15 : 1);
    Audio2.sfx('swipe');
    noise(p.x, p.y, 70);
    addFX('v5', 'fx_dust', p.x - p.dir * 10, p.y);
  }
  if (p.rollT > 0) {
    p.rollT--;
    if (p.rollT === 0) p.h = 34;
    const fx = p.x + p.dir * 14;
    const c = tileAt(fx, p.y - 10);
    if (c === T.CRATE || c === T.BOX) {
      tryBreakTile(Math.floor(fx / TILE), Math.floor((p.y - 10) / TILE), c, p.chonk ? 'force' : (c === T.BOX ? p : 'force'));
    }
    // roll smashes cookie banners
    for (const e of G.ents) {
      if (e.type === 'popupwall' && !e.dead && aabb(bodyBox(p, G.gsign), { x: e.x - 30, y: e.y - 66, w: 60, h: 66 })) smashBanner(e);
    }
  }

  // ---- sneak / horizontal ----
  const wantSneak = Input.d && p.onGround && p.digT <= 0 && p.rollT <= 0 && !p.mecha;
  p.sneaking = wantSneak && (Input.l || Input.r);
  const spd = 2.2 * (p.chonk ? 0.82 : 1) * (p.star ? 1.15 : 1) * (p.coffeeT > 0 ? 1.5 : 1)
            * (p.onWire ? 0.72 : 1) * (p.sneaking ? 0.42 : 1);
  const acc = p.onGround ? 0.24 : 0.15;
  if (p.rollT <= 0 && p.digT <= 0) {
    if (Input.l) { p.vx = Math.max(p.vx - acc, -spd); p.dir = -1; }
    else if (Input.r) { p.vx = Math.min(p.vx + acc, spd); p.dir = 1; }
    else if (p.onGround) p.vx *= 0.72;
    else p.vx *= 0.98;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }
  if (p.sneaking) narrOnce('sneak');
  // running is loud
  if (Math.abs(p.vx) > 1.9 && p.onGround && G.timeF % 12 === 0) noise(p.x, p.y, 60);

  // ---- jump ----
  const gs = G.gsign;
  if (p.jbuf > 0 && (p.coyote > 0 || p.onGround)) {
    if (p.rollT > 0) narrOnce('roll2');    // roll-jump keeps momentum
    p.vy = -6.3 * gs * (p.chonk ? 0.92 : 1);
    p.jbuf = 0; p.coyote = 0; p.onGround = false;
    Audio2.sfx('jump');
    noise(p.x, p.y, 70);
    addFX('v5', 'fx_dust', p.x, p.y);
  }
  let sliding = false;
  if (!p.onGround && !p.onWire && p.rollT <= 0 && p.jetpack < 0) {
    const pressDir = Input.r ? 1 : Input.l ? -1 : 0;
    if (pressDir !== 0) {
      const wallC = tileAt(p.x + pressDir * (p.w / 2 + 2), p.y - p.h / 2 * gs);
      if (isSolid(wallC) && p.vy * gs > 0) {
        sliding = true;
        p.vy = Math.min(p.vy * gs, 1.4) * gs;
        if (p.jbuf > 0) {
          p.vy = -5.9 * gs; p.vx = -pressDir * 3.4; p.dir = -pressDir; p.jbuf = 0;
          Audio2.sfx('jump'); addFX('v5', 'fx_dust', p.x + pressDir * 10, p.y - 10);
        }
      }
    }
  }
  if (!Input.jump && p.vy * gs < -2) p.vy = -2 * gs;

  // ---- gravity ----
  let maxFall = 6.2;
  if (p.jetpack >= 0 && p.fuel > 0 && Input.jump) {
    p.vy -= 0.30 * gs; p.fuel -= 0.35;
    if (p.vy * gs < -3.2) p.vy = -3.2 * gs;
    if (Math.random() < 0.5) addFX('v5', 'fx_dust', p.x - p.dir * 6, p.y + 2);
  }
  if (p.umbrella && Input.jump && p.vy * gs > 0 && !p.pouncing) maxFall = 1.05;
  p.vy += 0.31 * gs;
  if (p.vy * gs > maxFall) p.vy = maxFall * gs;

  // ---- attacks ----
  if (Input.atkP && p.digT <= 0 && p.rollT <= 0) {
    noise(p.x, p.y, 80);
    if (p.mecha) {
      if (p.shootCd <= 0) {
        p.shootCd = 14;
        G.shots.push({ kind: 'zap', x: p.x + p.dir * 20, y: p.y - 26, vx: 6 * p.dir, vy: 0, from: 'player', t: 70 });
        Audio2.sfx('zap');
      }
    } else if (p.wizardT > 0) {
      p.castT = 20;
      G.shots.push({ kind: 'spell', x: p.x + p.dir * 16, y: p.y - 28, vx: 4.2 * p.dir, vy: 0, from: 'player', t: 90 });
      Audio2.sfx('power');
    } else if (Input.d && !p.onGround) {
      // POUNCE: downward strike
      p.pouncing = true;
      p.vy = 5.5 * gs; p.vx = 1.8 * p.dir;
      Audio2.sfx('swipe');
    } else if (Input.u && p.cans > 0) {
      p.cans--; p.throwT = 18;
      G.shots.push({ kind: 'can', x: p.x + p.dir * 10, y: p.y - 30, vx: 3.8 * p.dir, vy: -3.3, from: 'player', t: 200 });
      Audio2.sfx('throw');
    } else {
      p.swipeT = 14;
      Audio2.sfx('swipe');
      swipeHit();
    }
  }
  if (p.onGround) p.pouncing = false;

  // ---- dig ----
  if (Input.d && p.onGround && p.digT <= 0 && p.rollT <= 0 && Math.abs(p.vx) < 0.3) {
    const spot = G.ents.find(e => e.type === 'dig' && e.uses !== 0 && Math.abs(e.x - p.x) < 16 && Math.abs(e.y - p.y) < 20);
    if (spot) { p.digT = 44; p.digSpot = spot; Audio2.sfx('dig'); }
  }
  if (p.digT > 0) {
    p.digT--; p.vx = 0;
    if (p.digT === 0 && p.digSpot) {
      const s = p.digSpot;
      s.uses = (s.uses === undefined ? 3 : s.uses) - 1;
      narrOnce('firstDig');
      const roll = Math.random();
      const lowHP = p.hearts <= 2;
      if (lowHP && roll < 0.6) { spawnItem('cookie', p.x, p.y - 8); narrOnce('pity'); }
      else if (roll < 0.45) { addScore(50, p.x, p.y - 40); addFX('v5', 'fx_sparkle', p.x, p.y - 20); }
      else if (roll < 0.7) { spawnItem('can', p.x, p.y - 8); }
      else if (roll < 0.85) { spawnItem('cookie', p.x, p.y - 8); }
      else { addScore(1, p.x, p.y - 40); toast('Jimothy found an old boot. It is now his son. +1'); }
      Audio2.sfx('pickup');
    }
  }

  // taunt
  if (Input.tauntP && p.onGround) {
    p.tauntT = 50;
    G.stats.taunts++;
    narrOnce('taunt');
    if (G.stats.taunts >= 5) award('comedian');
    for (const e of G.ents) if (e.type === 'rat' && Math.abs(e.x - p.x) < 80) e.fleeT = 120;
  }
  if (p.tauntT > 0) p.tauntT--;

  // ---- move ----
  const wasGround = p.onGround;
  p.onWire = false;
  p.dropThrough = Input.d && Input.jump;
  moveBody(p, extraSolids());
  if (!wasGround && p.onGround) {
    Audio2.sfx('land');
    p.squashT = Math.min(10, 3 + p.vyPrev);
    if (p.vyPrev > 4) { addFX('v5', 'fx_dust', p.x, p.y); noise(p.x, p.y, 90); }
  }
  if (p.squashT > 0) p.squashT--;
  p.vyPrev = Math.abs(p.vy);
  // running kicks up dust
  if (p.onGround && Math.abs(p.vx) > 1.8 && G.timeF % 18 === 0) addFX('v5', 'fx_dust', p.x - p.dir * 12, p.y);

  postMovePlayer();

  // ---- anim select ----
  let sheet = 'v5', anim = 'idle';
  const movingFast = Math.abs(p.vx) > 1.4, moving = Math.abs(p.vx) > 0.2;
  if (p.flatT > 0) { sheet = 'v6'; anim = 'flat'; }
  else if (p.mecha) { sheet = 'v6'; anim = 'mecha'; }
  else if (p.castT > 0) { sheet = 'v6'; anim = 'wizard'; }
  else if (p.digT > 0) anim = 'dig';
  else if (p.eatT > 0 && p.onGround && !moving) anim = 'eat';
  else if (p.throwT-- > 0) anim = 'throw';
  else if (p.swipeT > 8) anim = 'swipe';
  else if (p.pouncing && !p.onGround) anim = 'pounce';
  else if (p.rollT > 0) anim = 'roll';
  else if (p.tauntT > 0) anim = 'taunt';
  else if (sliding) { sheet = 'v6'; anim = 'walljump'; }
  else if (p.jetpack >= 0 && p.fuel > 0 && !p.onGround) { sheet = 'v6'; anim = 'jetpack'; }
  else if (!p.onGround && p.umbrella && Input.jump && p.vy * G.gsign > 0) { sheet = 'v6'; anim = 'umbrella'; }
  else if (!p.onGround) anim = p.vy * G.gsign < 0 ? 'jump' : 'fall';
  else if (p.onWire) { sheet = 'v6'; anim = 'balance'; }
  else if (p.sneaking) anim = 'sneak';
  else if (p.star > 0 && moving) { sheet = 'v6'; anim = 'star_power'; }
  else if (p.chonk > 0) { sheet = 'v6'; anim = 'chonk'; }
  else if (Input.d) { sheet = 'v6'; anim = 'crouch'; }
  else if (movingFast) anim = 'run';
  else if (moving) anim = 'walk';
  else {
    p.idleT++;
    if (p.idleT > 480) { anim = 'bored'; if (p.idleT === 481) narrOnce('bored'); }
  }
  if (anim !== 'idle' && anim !== 'bored') p.idleT = 0;
  if (p.star > 0 && (anim === 'idle' || anim === 'walk' || anim === 'run')) { sheet = 'v6'; anim = 'star_power'; }
  p.sheet = sheet; p.atlas = sheet === 'v5' ? 'v5a' : 'v6a';
  p.anim.set(anim);
  p.anim.update(p.atlas, dt);
}

function postMovePlayer() {
  const p = G.p;
  if (G.gsign > 0 && p.y - p.h > G.level.h * TILE + 40) { killPlayer(); p.y = G.level.h * TILE; return; }
  if (G.gsign < 0 && p.y < -60) { killPlayer(); return; }

  const box = bodyBox(p, G.gsign);
  for (const ty of tilesInRange(box.y, box.h)) {
    for (const tx of tilesInRange(box.x, box.w)) {
      const c = tileAt(tx * TILE + 1, ty * TILE + 1);
      if (c === T.CONE || c === T.GLASS) {
        if (c === T.GLASS) noise(tx * TILE + 8, ty * TILE, 120);
        hurtPlayer(1, tx * TILE + 8);
      } else if (c === T.FLAG) {
        const key = tx + ',' + ty;
        if (!G.flagsLit[key]) {
          G.flagsLit[key] = true;
          G.checkpoint = { x: tx * TILE + 8, y: (ty + 1) * TILE };
          toast('CHECKPOINT. The dumpster remembers.');
          Audio2.sfx('coin');
        }
      } else if (c === T.EXIT && p.onGround && G.state === 'play') {
        startExit(tx, ty);
      } else if (c === T.DOOR && Input.u && p.onGround) {
        useDoor(tx, ty);
      }
    }
  }
  const under = tileAt(p.x, G.gsign > 0 ? p.y + 2 : p.y - p.h - 2);
  if (under === T.SPRING && p.vy * G.gsign >= 0 && p.onGround) {
    p.vy = -8.8 * G.gsign;
    p.onGround = false;
    Audio2.sfx('spring');
    G.springs[Math.floor(p.x / TILE)] = 20;
    addFX('v5', 'fx_dust', p.x, p.y);
  }
}

let doorCd = 0;
function useDoor(tx, ty) {
  if (doorCd > 0) return;
  const L = G.level;
  const others = L.doors.filter(d => d.x !== tx || d.y !== ty);
  if (!others.length) return;
  const d = others[0];
  const p = G.p;
  doorCd = 40;
  p.x = d.x * TILE + 8; p.y = (d.y + 1) * TILE;
  p.vx = 0; p.vy = 0;
  Audio2.sfx('power');
  if (G.cfg.id === 1 && d.x > 180 && !G.discoFound) {
    G.discoFound = true;
    narrOnce('disco');
    award('fever');
    addScore(500, p.x, p.y - 50);
    Audio2.play('disco');
  } else if (G.cfg.id === 1 && d.x < 180) {
    Audio2.play(G.cfg.song);
  }
}

function swipeHit() {
  const p = G.p;
  const hb = { x: p.x + (p.dir > 0 ? 0 : -30), y: p.y - 40, w: 30, h: 40 };
  let hitAny = false;
  for (const e of G.ents) {
    if (e.dead) continue;
    if (['rat', 'gull', 'drone', 'robot', 'crow', 'roomba', 'scooter', 'printer', 'sgull'].includes(e.type) && aabb(hb, entBox(e))) {
      damageEnemy(e, p.chonk ? 3 : 1, p.x); hitAny = true;
    }
    if (e.type === 'popupwall' && aabb(hb, bannerBox(e))) { smashBanner(e); hitAny = true; }
  }
  for (const s of G.shots) {
    if (s.from === 'boss' && aabb(hb, { x: s.x - 8, y: s.y - 8, w: 16, h: 16 })) { s.t = 0; hitAny = true; addFX('v6', 'fx_hitspark', s.x, s.y + 8); }
  }
  const fx = p.x + p.dir * 18;
  for (const fy of [p.y - 8, p.y - 24]) {
    const c = tileAt(fx, fy);
    if (c === T.BOX || (c === T.CRATE && p.chonk)) {
      tryBreakTile(Math.floor(fx / TILE), Math.floor(fy / TILE), c, p.chonk ? 'force' : p);
      hitAny = true;
    }
  }
  if (G.gag && G.gag.type === 'popup' && G.gag.alive) { popupSmash(); hitAny = true; }
  if (hitAny) { addFX('v6', 'fx_hitspark', p.x + p.dir * 20, p.y - 14); hitstop(2); }
}

function smashBanner(e) {
  e.dead = true;
  addFX('v6', 'fx_hitspark', e.x, e.y - 30);
  addFX('v5', 'fx_dust', e.x, e.y);
  addScore(50, e.x, e.y - 40);
  Audio2.sfx('boom'); shake(3);
  toast('BANNER DISMISSED. It will be back. They are always back.');
}

// ---------- exit / trashdive ----------
function startExit(tx, ty) {
  if (G.state !== 'play') return;
  G.state = 'exit';
  G.exitT = 0;
  G.exitX = tx * TILE + 8;
  const p = G.p;
  p.vx = 0; p.cartV = 0;
  if (G.cfg.cart) {
    Audio2.sfx('boom'); shake(10);
    p.cart = false; p.flatT = 120;
    addFX('v6', 'fx_hitspark', p.x + 10, p.y - 20);
  } else {
    Audio2.sfx('dive');
  }
  Audio2.stop();
}
function updateExit(dt) {
  const p = G.p;
  G.exitT++;
  if (G.cfg.boss) {
    p.vx = 0;
    p.anim.set('celebrate'); p.sheet = 'v5'; p.atlas = 'v5a';
    p.anim.update('v5a', dt);
    if (G.exitT % 15 === 0 && G.exitT < 180) addFX('v6', 'fx_confetti', p.x + rndi(-30, 30), p.y - rndi(20, 60));
    if (G.exitT === 70) Audio2.sfx('fanfare');
    if (G.exitT > 200) finishStage();
    return;
  }
  if (G.cfg.cart) {
    p.anim.set('flat'); p.sheet = 'v6'; p.atlas = 'v6a';
    p.anim.update('v6a', dt);
    if (G.exitT === 100) Audio2.sfx('fanfare');
    if (G.exitT > 130) finishStage();
    return;
  }
  if (G.exitT < 60 && Math.abs(p.x - G.exitX) > 3) {
    p.vx = Math.sign(G.exitX - p.x) * 1.4;
    p.dir = Math.sign(G.exitX - p.x) || 1;
    moveBody(p, null);
    p.anim.set('walk'); p.anim.update('v5a', dt);
  } else {
    p.vx = 0;
    p.anim.set('trashdive'); p.sheet = 'v5'; p.atlas = 'v5a';
    p.anim.update('v5a', dt);
    if (G.exitT % 20 === 0 && G.exitT < 120) addFX('v6', 'fx_confetti', p.x + rndi(-20, 20), p.y - rndi(20, 50));
    if (G.exitT === 40) Audio2.sfx('fanfare');
    if (G.exitT > 140) finishStage();
  }
}

// ---------- enemies ----------
function entBox(e) {
  switch (e.type) {
    case 'rat': return { x: e.x - 12, y: e.y - 12, w: 24, h: 12 };
    case 'gull': case 'sgull': return { x: e.x - 12, y: e.y - 14, w: 24, h: 14 };
    case 'drone': return { x: e.x - 12, y: e.y - 14, w: 24, h: 14 };
    case 'robot': return { x: e.x - 13, y: e.y - 30, w: 26, h: 30 };
    case 'crow': return { x: e.x - 11, y: e.y - 16, w: 22, h: 16 };
    case 'roomba': return { x: e.x - 12, y: e.y - 10, w: 24, h: 10 };
    case 'scooter': return { x: e.x - 12, y: e.y - 36, w: 24, h: 36 };
    case 'printer': return { x: e.x - 13, y: e.y - 20, w: 26, h: 20 };
    case 'possum': return { x: e.x - 14, y: e.y - 14, w: 28, h: 14 };
    case 'item': return { x: e.x - 10, y: e.y - 18, w: 20, h: 18 };
    case 'coin': return { x: e.x - 7, y: e.y - 13, w: 14, h: 14 };
    case 'boss_bin': return { x: e.x - 26, y: e.y - 66, w: 52, h: 66 };
    case 'boss_gary': return { x: e.x - 40, y: e.y - 60, w: 80, h: 55 };
    case 'crown': return { x: e.x - 10, y: e.y - 12, w: 20, h: 12 };
    default: return { x: e.x - 8, y: e.y - 16, w: 16, h: 16 };
  }
}

const KILLABLE = ['rat', 'gull', 'sgull', 'drone', 'robot', 'crow', 'roomba', 'scooter', 'printer'];

function damageEnemy(e, dmg, fromX) {
  if (e.dead || e.inv > 0) return;
  e.hp = (e.hp === undefined ? 1 : e.hp) - dmg;
  e.inv = 12;
  addFX('v6', 'fx_hitspark', e.x, e.y - 10);
  Audio2.sfx('hit');
  hitstop(2);
  if (e.hp <= 0) {
    e.dead = true;
    addScore(e.type === 'robot' || e.type === 'scooter' ? 150 : 100, e.x, e.y - 20);
    addFX('v5', 'fx_dust', e.x, e.y);
    registerKill(e.x, e.y - 20);
    // wizard mode: enemies become cookies. it's called alchemy.
    if (G.p.wizardT > 0) { spawnItem('cookie', e.x, e.y - 6); addFX('v5', 'fx_sparkle', e.x, e.y - 14); }
    if (e.type === 'robot') { spawnItem('can', e.x - 8, e.y - 8); spawnItem('can', e.x + 8, e.y - 8); narrOnce('robotDown'); }
    if (e.type === 'gull' || e.type === 'sgull') narrOnce('gullDown');
    if (e.type === 'scooter') narrOnce('scooterDown');
    if (e.type === 'printer') narrOnce('printerDown');
    if (e.type === 'crow' && e.hasCan) { spawnItem('can', e.x - 6, e.y - 8); spawnItem('can', e.x + 6, e.y - 8); narrOnce('crowBack'); }
  } else if (fromX !== undefined) {
    e.vx = (e.x < fromX ? -1 : 1) * 1.5;
  }
}

function updateEnemies(dt) {
  const p = G.p;
  for (const e of G.ents) {
    if (e.dead) continue;
    if (e.inv > 0) e.inv--;
    switch (e.type) {
      case 'rat': {
        e.vx = e.vx || 0.6 * EF();
        if (e.fleeT > 0) { e.fleeT--; e.vx = (Math.sign(e.x - p.x) || 1) * 0.9 * EF(); }
        const ahead = e.x + Math.sign(e.vx) * 14;
        if (isSolid(tileAt(ahead, e.y - 6)) || !isSolid(tileAt(ahead, e.y + 4))) e.vx = -e.vx;
        e.x += e.vx;
        break;
      }
      case 'gull': {
        e.t = (e.t || 0) + 1;
        e.ax = e.ax === undefined ? e.x : e.ax; e.ay = e.ay === undefined ? e.y : e.ay;
        if (!e.mode) e.mode = 'hover';
        if (e.mode === 'hover') {
          e.x = e.ax + Math.sin(e.t / 40) * 18;
          e.y = e.ay + Math.sin(e.t / 25) * 5;
          e.dirF = Math.cos(e.t / 40) < 0;
          if (Math.abs(p.x - e.x) < 90 && p.y > e.y && e.t % 150 === 100) { e.mode = 'aim'; e.aimT = 30; }
        } else if (e.mode === 'aim') {
          if (--e.aimT <= 0) {
            const dx = p.x - e.x, dy = (p.y - 14) - e.y;
            const d = Math.hypot(dx, dy) || 1;
            e.vx = dx / d * 3.4 * EF(); e.vy = dy / d * 3.4 * EF();
            e.mode = 'dive'; e.diveT = 40;
            Audio2.sfx('swipe');
          }
        } else if (e.mode === 'dive') {
          e.x += e.vx; e.y += e.vy;
          e.dirF = e.vx < 0;
          if (--e.diveT <= 0 || isSolid(tileAt(e.x, e.y))) e.mode = 'return';
        } else {
          e.x = lerp(e.x, e.ax, 0.03); e.y = lerp(e.y, e.ay, 0.03);
          if (Math.abs(e.x - e.ax) < 3 && Math.abs(e.y - e.ay) < 3) { e.mode = 'hover'; e.t = 0; }
        }
        break;
      }
      case 'sgull': {
        // security gull: harmless until woken
        if (!e.mode) e.mode = 'sleep';
        if (e.mode === 'wake') {
          if (--e.wakeT <= 0) {
            e.type = 'gull';
            e.ax = e.x; e.ay = e.y - 44; e.y -= 4;
            e.mode = 'hover'; e.t = 0;
          }
        }
        break;
      }
      case 'crow': {
        e.hp = e.hp === undefined ? 1 : e.hp;
        if (!e.mode) { e.mode = 'perch'; e.px = e.x; e.py = e.y; }
        if (e.mode === 'perch') {
          if (Math.abs(p.x - e.x) < 80 && !e.dead) {
            if (p.cans > 0) { e.mode = 'swoop'; Audio2.sfx('swipe'); }
            else if (!e.judged) { e.judged = true; toast('The crow eyes your empty pockets. Judgmentally.'); }
          }
        } else if (e.mode === 'swoop') {
          const dx = p.x - e.x, dy = (p.y - 20) - e.y;
          const d = Math.hypot(dx, dy) || 1;
          e.x += dx / d * 3.2; e.y += dy / d * 3.2;
          e.dirF = dx < 0;
          if (aabb(entBox(e), bodyBox(p, G.gsign))) {
            if (p.cans > 0) { p.cans--; e.hasCan = true; narrOnce('crow'); Audio2.sfx('cancel'); }
            e.mode = 'flee';
          }
        } else if (e.mode === 'flee') {
          e.y -= 1.6; e.x += Math.sin((e.ft = (e.ft || 0) + 1) / 9) * 1.2;
          if (e.y < e.py - 90) e.mode = 'hoverT';
        } else { // hover taunting you with your own can
          e.ht = (e.ht || 0) + 1;
          e.x += Math.sin(e.ht / 30) * 0.8;
          e.y = e.py - 90 + Math.sin(e.ht / 20) * 4;
        }
        break;
      }
      case 'roomba': {
        e.hp = e.hp === undefined ? 1 : e.hp;
        e.vx = e.vx || 1.5 * EF();
        const ahead = e.x + Math.sign(e.vx) * 14;
        if (isSolid(tileAt(ahead, e.y - 4)) || !isSolid(tileAt(ahead, e.y + 4))) e.vx = -e.vx;
        e.x += e.vx;
        if (!e.seen && Math.abs(p.x - e.x) < 110) { e.seen = true; narrOnce('roomba'); }
        break;
      }
      case 'scootzone': {
        e.t = (e.t || rndi(60, 200)) - 1;
        if (e.t <= 0) {
          e.t = rndi(300, 420);
          const dir = p.x > e.x ? -1 : 1; // ride across the player's path
          G.ents.push({ type: 'scooter', x: e.x + dir * -180, y: e.y, vx: dir * 3.0 * EF(), hp: 1, zone: e.x });
          narrOnce('scooter');
        }
        break;
      }
      case 'scooter': {
        e.x += e.vx;
        e.dirF = e.vx < 0;
        // circling the block: bounce off obstacles, leave when out of the zone
        if (isSolid(tileAt(e.x + Math.sign(e.vx) * 14, e.y - 10))) { e.vx = -e.vx; e.x += e.vx * 2; }
        if (Math.abs(e.x - e.zone) > 260) e.dead = true;
        break;
      }
      case 'printer': {
        e.hp = e.hp === undefined ? 2 : e.hp;
        e.t = (e.t || 0) + 1;
        if (Math.abs(p.x - e.x) < 150 && Math.abs(p.y - e.y) < 40 && e.t % 160 === 100) {
          const dir = Math.sign(p.x - e.x) || 1;
          G.shots.push({ kind: 'paper', x: e.x + dir * 14, y: e.y - 12, vx: dir * 2.6, vy: 0, from: 'boss', t: 180 });
          e.shootF = 12;
          Audio2.sfx('throw');
        }
        if (e.shootF > 0) e.shootF--;
        break;
      }
      case 'drone': {
        e.t = (e.t || 0) + 1;
        const dx = p.x - e.x, dy = (p.y - 30) - e.y;
        e.x += clamp(dx * 0.008, -1.1, 1.1) * EF();
        e.y += clamp(dy * 0.008, -0.9, 0.9) * EF() + Math.sin(e.t / 12) * 0.3;
        e.dirF = dx < 0;
        break;
      }
      case 'robot': {
        e.hp = e.hp === undefined ? 3 : e.hp;
        e.vx = e.vx || 0.85 * EF();
        const ahead = e.x + Math.sign(e.vx) * 16;
        if (isSolid(tileAt(ahead, e.y - 8)) || !isSolid(tileAt(ahead, e.y + 4))) e.vx = -e.vx;
        e.x += e.vx;
        break;
      }
      case 'possum': {
        e.t = (e.t || 0) + 1;
        if (Math.abs(p.x - e.x) < 60 && !e.talked) {
          e.talked = true; e.bubbleT = 200;
          const lines = [
            "Randall. Possum. I live in the wall. It's rent-controlled. Don't tell the wall.",
            "I'm not playing dead. This is a lifestyle. It's called quiet quitting.",
            "You want the trash? The BIG bin has it. He's got a WHOLE thing. A keynote, even.",
          ];
          toast('RANDALL: ' + lines[(e.lineI = ((e.lineI || 0) + 1) % lines.length)]);
        }
        if (e.bubbleT > 0) e.bubbleT--;
        if (Math.abs(p.x - e.x) > 90) e.talked = false;
        break;
      }
      case 'item': {
        if (e.spawned) { e.vy = (e.vy || 0) + 0.2; e.y += e.vy; if (isSolid(tileAt(e.x, e.y + 1))) { e.y = Math.floor(e.y / TILE) * TILE + TILE; while (isSolid(tileAt(e.x, e.y - 1))) e.y -= TILE; e.spawned = false; e.vy = 0; } }
        e.bob = (e.bob || 0) + 0.08;
        if (aabb(bodyBox(p, G.gsign), entBox(e))) pickupItem(e);
        break;
      }
      case 'coin': {
        e.bob = (e.bob || 0) + 0.1;
        if (aabb(bodyBox(p, G.gsign), entBox(e))) {
          e.dead = true;
          G.stats.coins++;
          addScore(10);
          narrOnce('coin');
          Audio2.sfx('coin');
          addFX('v5', 'fx_sparkle', e.x, e.y - 6);
          if (G.stats.coins >= 25) award('bagholder');
        }
        break;
      }
      case 'crown': {
        e.bob = (e.bob || 0) + 0.08;
        if (aabb(bodyBox(p, G.gsign), entBox(e))) {
          e.dead = true;
          Audio2.sfx('fanfare');
          addScore(1000, e.x, e.y - 20);
          for (let i = 0; i < 8; i++) addFX('v6', 'fx_confetti', p.x + rndi(-30, 30), p.y - rndi(10, 60));
          finishStage();
        }
        break;
      }
      case 'sign': {
        if (Math.abs(p.x - e.x) < 20 && Math.abs(p.y - e.y) < 30 && !e.shown) {
          e.shown = true;
          const s = (G.cfg.signs || {})[e.n];
          if (s) toast(s, 240);
          if (G.cfg.office && e.n === 2) narrOnce('standup');
        }
        if (Math.abs(p.x - e.x) > 60) e.shown = false;
        break;
      }
      case 'gag': {
        if (!e.used && Math.abs(p.x - e.x) < 14) {
          e.used = true;
          if (G.cfg.gag === 'popup') startPopup();
          else if (G.cfg.gag === 'bsod') startBSOD();
        }
        break;
      }
      case 'captcha': {
        if (!e.used && Math.abs(p.x - e.x) < 16) { e.used = true; startCaptcha(); }
        break;
      }
      case 'checkout': {
        if (!e.used && Math.abs(p.x - e.x) < 16) {
          e.used = true;
          narrOnce('selfcheckout');
          Audio2.sfx('ui'); setTimeout(() => Audio2.sfx('ui'), 150); setTimeout(() => Audio2.sfx('ui'), 300);
        }
        break;
      }
      case 'rollertrig': {
        if (!e.used && Math.abs(p.x - e.x) < 20) {
          e.used = true;
          G.roller = { x: p.x - 380, v: 0, stopX: 230 * TILE };
          narrOnce('steamroller');
          Audio2.sfx('roar'); shake(6);
        }
        break;
      }
      case 'chase': {
        if (!e.used && Math.abs(p.x - e.x) < 20) { e.used = true; startChase(); }
        break;
      }
      case 'paywall': {
        e.hp = e.hp === undefined ? 3 : e.hp;
        if (!e.seen && Math.abs(p.x - e.x) < 120) { e.seen = true; narrOnce('paywall'); }
        break;
      }
      case 'cart': {
        if (!e.taken && Math.abs(p.x - e.x) < 16) {
          e.taken = true; e.dead = true;
          p.cart = true; p.cartV = 0;
          narrOnce('cart');
        }
        break;
      }
    }
    // contact damage & stomps
    if (KILLABLE.includes(e.type) && !e.dead && e.type !== 'crow' && !(e.type === 'sgull' && e.mode === 'sleep')) {
      const eb = entBox(e), pb = bodyBox(p, G.gsign);
      if (aabb(pb, eb)) {
        if (p.star > 0 || p.rollT > 0) damageEnemy(e, p.star ? 9 : 1, p.x);
        else if (p.pouncing && p.vy * G.gsign > 0) {
          damageEnemy(e, 2, p.x);
          p.vy = -5.5 * G.gsign; p.pouncing = false;
          Audio2.sfx('stomp');
        } else if (G.gsign > 0 && p.vy > 1 && p.y - p.h / 2 < eb.y) {
          damageEnemy(e, 1, p.x);
          p.vy = Input.jump ? -5.8 : -4.5;
          Audio2.sfx('stomp');
        } else if (e.type !== 'printer') hurtPlayer(e.type === 'robot' || e.type === 'scooter' ? 2 : 1, e.x);
      }
    }
  }
  for (const rb of G.respawnBoxes) {
    if (rb.t > 0) {
      rb.t--;
      if (rb.t === 0 && tileAt(rb.tx * TILE + 1, rb.ty * TILE + 1) === T.NONE) {
        G.level.grid[rb.ty * G.level.w + rb.tx] = T.BOX;
        addFX('v5', 'fx_sparkle', rb.tx * TILE + 8, rb.ty * TILE + 8);
      }
    }
  }
  G.ents = G.ents.filter(e => !e.dead || e.type === 'paywall');
}

function pickupItem(e) {
  const p = G.p;
  e.dead = true;
  Audio2.sfx('pickup');
  switch (e.item) {
    case 'can':
      p.cans++; addScore(25, e.x, e.y - 20); break;
    case 'cookie':
      p.hearts = Math.min(p.maxHearts, p.hearts + 2);
      p.eatT = 40;
      addScore(50, e.x, e.y - 20);
      Audio2.sfx('eat');
      break;
    case 'pizza':
      p.chonk = 2700; addScore(100, e.x, e.y - 20);
      narrOnce('firstChonk'); Audio2.sfx('power'); shake(3);
      break;
    case 'star':
      p.star = 600; addScore(200, e.x, e.y - 20);
      narrOnce('firstStar'); Audio2.sfx('power');
      Audio2.tempoMul = 1.18;
      break;
    case 'coffee':
      p.coffeeT = 480; addScore(50, e.x, e.y - 20);
      narrOnce('coffee'); Audio2.sfx('power');
      break;
    case 'wizhat':
      p.wizardT = 900; addScore(150, e.x, e.y - 20);
      narrOnce('wizardOn'); award('wizard'); Audio2.sfx('power'); shake(3);
      break;
    case 'umbrella':
      p.umbrella = true; addScore(50, e.x, e.y - 20);
      narrOnce('umbrella');
      break;
    case 'jetpack':
      p.jetpack = 1; p.fuel = 100; addScore(100, e.x, e.y - 20);
      narrOnce('jetpack'); Audio2.sfx('power');
      break;
    case 'mecha':
      p.mecha = true; p.maxHearts = 10; p.hearts = 10;
      narrOnce('mecha'); Audio2.sfx('power'); shake(5);
      if (G.boss && G.boss.kind === 'gary') G.boss.mode = 'patrol';
      break;
  }
  addFX('v5', 'fx_sparkle', e.x, e.y - 10);
}

// ---------- projectiles ----------
function updateShots(dt) {
  const p = G.p;
  for (const s of G.shots) {
    s.t--;
    switch (s.kind) {
      case 'can':
        s.vy += 0.22; s.x += s.vx; s.y += s.vy;
        if (isSolid(tileAt(s.x, s.y))) { s.t = 0; addFX('v5', 'fx_dust', s.x, s.y); }
        for (const e of G.ents) {
          if (!e.dead && KILLABLE.includes(e.type) && aabb({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }, entBox(e))) {
            damageEnemy(e, 1, s.x); s.t = 0;
          }
          if (e.type === 'popupwall' && !e.dead && aabb({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }, bannerBox(e))) { smashBanner(e); s.t = 0; }
          if (e.type === 'paywall' && !e.dead && aabb({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }, paywallBox(e))) {
            s.t = 0; e.hp--;
            Audio2.sfx('cancel'); shake(3);
            addFX('v6', 'fx_hitspark', s.x, s.y);
            if (e.hp <= 0) {
              e.dead = true;
              toast('SUBSCRIPTION CANCELED. Jimothy is a free-tier animal.');
              award('cancel');
              addScore(300, e.x, e.y - 40);
              for (let i = 0; i < 5; i++) addFX('v6', 'fx_confetti', e.x + rndi(-16, 16), e.y - rndi(10, 50));
              Audio2.sfx('fanfare');
            } else toast('CANCELING... ' + e.hp + ' can' + (e.hp > 1 ? 's' : '') + ' to go. (Have you considered our annual plan?)');
          }
        }
        if (G.boss) bossHitByCan(s);
        break;
      case 'zap':
        s.x += s.vx;
        for (const e of G.ents) {
          if (!e.dead && KILLABLE.includes(e.type) && aabb({ x: s.x - 6, y: s.y - 3, w: 12, h: 6 }, entBox(e))) {
            damageEnemy(e, 1, s.x); s.t = 0;
          }
        }
        if (G.boss) bossHitByZap(s);
        if (isSolid(tileAt(s.x, s.y))) s.t = 0;
        break;
      case 'spell':
        s.x += s.vx; s.y += Math.sin(s.t / 4) * 0.8;
        for (const e of G.ents) {
          if (!e.dead && KILLABLE.includes(e.type) && aabb({ x: s.x - 7, y: s.y - 7, w: 14, h: 14 }, entBox(e))) {
            damageEnemy(e, 9, s.x); s.t = 0;
          }
        }
        if (isSolid(tileAt(s.x, s.y))) s.t = 0;
        break;
      case 'paper':
        s.x += s.vx; s.y += s.vy + Math.sin(s.t / 6) * 0.5;
        if (!GOD && s.t % 2 === 0 && aabb({ x: s.x - 6, y: s.y - 6, w: 12, h: 12 }, bodyBox(p, G.gsign))) { hurtPlayer(1, s.x); s.t = 0; }
        if (isSolid(tileAt(s.x, s.y))) s.t = 0;
        break;
      case 'bread':
        s.vy += 0.18; s.x += s.vx; s.y += s.vy;
        if (aabb({ x: s.x - 8, y: s.y - 6, w: 16, h: 12 }, bodyBox(p, G.gsign))) { hurtPlayer(2, s.x); s.t = 0; }
        if (isSolid(tileAt(s.x, s.y))) { s.t = 0; addFX('v5', 'fx_dust', s.x, s.y); }
        break;
      case 'latte':
        s.vy += 0.12; s.x += s.vx; s.y += s.vy;
        if (aabb({ x: s.x - 5, y: s.y - 8, w: 10, h: 16 }, bodyBox(p, G.gsign))) { hurtPlayer(1, s.x); s.t = 0; }
        if (isSolid(tileAt(s.x, s.y))) s.t = 0;
        break;
    }
  }
  G.shots = G.shots.filter(s => s.t > 0);
}

// ---------- cart mode ----------
function updateCart(dt) {
  const p = G.p;
  p.cartV = Math.min((p.cartV || 0) + 0.05, 3.3);
  p.vx = p.cartV;
  if (Input.jumpP || p.jbuf > 0) {
    if (p.onGround) { p.vy = -6.6; Audio2.sfx('jump'); p.jbuf = 0; }
    else p.jbuf = 7;
  }
  if (p.jbuf > 0) p.jbuf--;
  p.vy += 0.31;
  if (p.vy > 6.5) p.vy = 6.5;
  moveBody(p, null);
  p.dir = 1;
  const under = tileAt(p.x, p.y + 2);
  if (under === T.SPRING && p.onGround) { p.vy = -9.4; p.onGround = false; Audio2.sfx('spring'); }
  const box = bodyBox(p, 1);
  for (const ty of tilesInRange(box.y, box.h)) for (const tx of tilesInRange(box.x, box.w)) {
    const c = tileAt(tx * TILE + 1, ty * TILE + 1);
    if (c === T.CONE) {
      setTile(tx * TILE + 1, ty * TILE + 1, T.NONE);
      hurtPlayer(1, tx * TILE);
      p.cartV = 1.2;
      addFX('v5', 'fx_dust', tx * TILE + 8, ty * TILE + 16);
    } else if (c === T.FLAG) {
      const key = tx + ',' + ty;
      if (!G.flagsLit[key]) { G.flagsLit[key] = true; G.checkpoint = { x: tx * TILE + 8, y: (ty + 1) * TILE }; Audio2.sfx('coin'); }
    } else if (c === T.EXIT) startExit(tx, ty);
  }
  if (p.y - p.h > G.level.h * TILE + 30) { killPlayer(); p.y = G.level.h * TILE; }
  p.anim.set(p.flatT > 0 ? 'flat' : 'cart_ride'); p.sheet = 'v6'; p.atlas = 'v6a';
  p.anim.update('v6a', dt);
}

// steamroller pursuit (stage 4)
function updateRoller() {
  const r = G.roller;
  if (!r || r.stopped) return;
  const p = G.p;
  r.v = Math.min(r.v + 0.06, (p.cartV || 3) + 0.4);
  if (p.x - r.x > 400) r.x = p.x - 400;
  r.x += r.v;
  if (r.x >= r.stopX) {
    r.stopped = true;
    toast('The steamroller reached its exit. It used the blinker. Respect.');
    return;
  }
  if (r.x > p.x - 50 && !p.dead && p.flatT <= 0 && p.inv <= 0) {
    // FLATTENED
    hurtPlayer(1, r.x);
    p.flatT = 80;
    p.cartV = 1.0;
    r.x = p.x - 300;
    narrOnce('flatten');
    shake(8);
    Audio2.sfx('boom');
  }
}

// ---------- gags ----------
function startPopup() {
  G.gag = { type: 'popup', alive: true, t: 0 };
  narrOnce('popup');
  Audio2.sfx('ui');
}
function popupSmash() {
  const g = G.gag;
  if (!g || !g.alive) return;
  g.alive = false; g.smashT = 30;
  spawnItem('cookie', G.p.x + 20 * G.p.dir, G.p.y - 20);
  toast('COOKIE ACCEPTED. Legally, that was consent.');
  Audio2.sfx('boom'); shake(4);
}
function startBSOD() {
  G.state = 'bsod'; G.bsodT = 0; G.bsodPhase = 0;
  Audio2.stop(); Audio2.sfx('glitch');
}
function updateBSOD() {
  G.bsodT++;
  if (G.bsodPhase === 0 && G.bsodT > 40 && Input.jumpP) {
    G.bsodPhase = 1; G.bsodT = 0;
    Audio2.sfx('ui');
  } else if (G.bsodPhase === 1 && G.bsodT > 150) {
    G.state = 'play';
    narrOnce('bsodBack');
    Audio2.play(G.cfg.song);
  }
}

// CAPTCHA: prove you are not a robot (the robots could not)
const CAPTCHA_POOL = [
  { name: 'trash', trash: true }, { name: 'can', trash: true }, { name: 'fishbone', trash: true },
  { name: 'cone', trash: false }, { name: 'gull', trash: false }, { name: 'crate', trash: false },
  { name: 'hydrant', trash: false }, { name: 'moon', trash: false }, { name: 'pizza', trash: true },
];
function startCaptcha() {
  const cells = [...CAPTCHA_POOL];
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  G.captcha = { cells, sel: 0, picked: new Set(), tries: 0, cd: 0 };
  G.state = 'captcha';
  Audio2.sfx('ui');
}
function updateCaptcha() {
  const c = G.captcha;
  if (c.cd > 0) { c.cd--; }
  else {
    if (Input.l) { c.sel = (c.sel + 8) % 9; c.cd = 10; Audio2.sfx('ui'); }
    else if (Input.r) { c.sel = (c.sel + 1) % 9; c.cd = 10; Audio2.sfx('ui'); }
    else if (Input.u) { c.sel = (c.sel + 6) % 9; c.cd = 10; Audio2.sfx('ui'); }
    else if (Input.d) { c.sel = (c.sel + 3) % 9; c.cd = 10; Audio2.sfx('ui'); }
  }
  if (Input.atkP) {
    if (c.picked.has(c.sel)) c.picked.delete(c.sel); else c.picked.add(c.sel);
    Audio2.sfx('coin');
  }
  if (Input.jumpP) {
    let ok = true;
    c.cells.forEach((cell, i) => { if (cell.trash !== c.picked.has(i)) ok = false; });
    if (ok) {
      if (c.tries === 0) award('notrobot');
      toast('IDENTITY CONFIRMED: TRASH MAMMAL. Welcome. The Wi-Fi password is "password".');
      G.p.cans += 3; addScore(100);
      G.captcha = null; G.state = 'play';
      Audio2.sfx('fanfare');
    } else {
      c.tries++;
      c.picked.clear();
      Audio2.sfx('zap'); shake(3);
      if (c.tries >= 2) {
        toast("FINE. You're PROBABLY a raccoon. Go. (Pizza counts as trash. Philosophically.)");
        G.captcha = null; G.state = 'play';
      } else {
        toast('Hmm. Suspiciously robotic. Try again. (Hint: pizza on the ground IS trash. Emotionally complex trash.)');
      }
    }
  }
}

function startChase() {
  G.chaser = { x: G.p.x - 300, startX: G.p.x - 300, v: 1.55 * EF(), stopX: (G.cfg.id === 2 ? 194 * TILE : 1e9) };
  narrOnce('chase');
  Audio2.sfx('roar');
  Audio2.tempoMul = 1.15;
}
function updateChaser() {
  const c = G.chaser;
  if (!c) return;
  const p = G.p;
  if (c.x >= c.stopX) {
    if (!c.stopped) {
      c.stopped = true;
      toast('ANIMAL CONTROL: "Out of jurisdiction. Ballard bylaws." They salute you. One is crying.');
      Audio2.tempoMul = 1;
    }
    return;
  }
  c.v = Math.min(c.v + 0.0006, 2.35);
  if (p.x - c.x > 320) c.x = p.x - 320;
  c.x += c.v;
  if (p.x < c.x + 24 && !p.dead && p.ghostT <= 0) {
    toast('NETTED. "Sir, this is a relocation." It is not a relocation.');
    killPlayer();
  }
}

// ---------- bosses ----------
function spawnBoss(kind) {
  if (kind === 'bin') {
    G.boss = { kind: 'bin', type: 'boss_bin', x: 34 * TILE, y: 14 * TILE, hp: 9, maxHp: 9, mode: 'intro', t: 0, phase: 1, frame: 0, animT: 0, vx: 0, vy: 0, homeY: 14 * TILE };
  } else {
    G.boss = { kind: 'gary', type: 'boss_gary', x: 38 * TILE, y: 6 * TILE, hp: 12, maxHp: 12, mode: 'wait', t: 0, phase: 1, frame: 0, animT: 0, ax: 34 * TILE, ay: 6 * TILE };
  }
}
const BIN_LINES = ["I'm pivoting!", 'This is an A/B test and you are B!', 'SYNERGY MODE ENGAGED.', "I'm rewriting my own code. Vibe coding. It's fine.", 'Your feedback matters to me!'];
const GARY_LINES = ["I'M CIRCLING BACK.", "LET'S TAKE THIS OFFLINE.", 'MY LAWYERS ARE ALSO GULLS.', 'THIS IS COMING OUT OF YOUR EQUITY.', 'DO YOU EVEN HAVE A DECK?'];

function bossHitByCan(s) {
  const b = G.boss;
  if (b.kind === 'bin' && b.mode === 'vent' && aabb({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }, { x: b.x - 28, y: b.y - 82, w: 56, h: 44 })) {
    s.t = 0;
    bossDamage(1);
    toast('OM NOM. "THAT WAS NOT ITEMIZED."');
  } else if (b.kind === 'gary' && !b.dead && b.mode !== 'reboot' && aabb({ x: s.x - 5, y: s.y - 5, w: 10, h: 10 }, entBox(b))) {
    s.t = 0; bossDamage(1);
  }
}
function bossHitByZap(s) {
  const b = G.boss;
  if (b.kind === 'gary' && !b.dead && b.mode !== 'wait' && b.mode !== 'reboot' && aabb({ x: s.x - 6, y: s.y - 3, w: 12, h: 6 }, entBox(b))) {
    s.t = 0;
    bossDamage(b.mode === 'phone' ? 2 : 1);
  }
}
function bossDamage(n) {
  const b = G.boss;
  b.hp -= n; b.flash = 8;
  hitstop(4);
  Audio2.sfx('hit'); shake(4);
  addFX('v6', 'fx_hitspark', b.x, b.y - 30);
  // GARY 2.0: the pivot
  if (b.kind === 'gary' && b.hp <= 0 && !b.rebooted) {
    b.rebooted = true;
    b.hp = 6; b.maxHp = 6;
    b.phase = 3;
    b.mode = 'reboot'; b.t = 0;
    Audio2.sfx('glitch');
    toast('GARY has run out of hit points. GARY has chosen to PIVOT instead.');
    return;
  }
  const ph = b.hp > b.maxHp * 2 / 3 ? 1 : b.hp > b.maxHp / 3 ? 2 : 3;
  if (ph !== b.phase && b.hp > 0 && !b.rebooted) {
    b.phase = ph;
    toast((b.kind === 'bin' ? 'B.I.N.: ' : 'GARY: ') + (b.kind === 'bin' ? BIN_LINES : GARY_LINES)[rndi(0, 4)]);
    Audio2.sfx('roar');
    if (b.kind === 'bin') {
      // COOKIE BANNERS: the ultimate defense
      G.ents.push({ type: 'popupwall', x: b.x - 130, y: 14 * TILE, hp: 1 });
      if (ph === 3) G.ents.push({ type: 'popupwall', x: b.x - 220, y: 14 * TILE, hp: 1 });
      toast('B.I.N. DEPLOYED COOKIE BANNERS. Truly, the ultimate defense.');
      if (ph === 3) { b.mode = 'glitchstart'; b.t = 0; }
    }
  }
  if (b.hp <= 0 && !b.dying) {
    b.dying = true; b.mode = 'dying'; b.t = 0;
    if (b.kind === 'gary' && b.rebooted) award('seriesb');
    if (G.gsign < 0) flipGravity();
    Audio2.stop(); Audio2.sfx('boom'); shake(8);
  }
}

function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  const p = G.p;
  b.t++;
  if (b.flash > 0) b.flash--;
  b.animT = (b.animT || 0) + dt * 1000;
  if (b.animT > 200) { b.animT = 0; b.frame = 1 - (b.frame || 0); }
  if (b.kind === 'bin') updateBin(b, p);
  else updateGary(b, p);
}

function updateBin(b, p) {
  switch (b.mode) {
    case 'intro':
      if (b.t > 30) { b.mode = 'shoot'; b.t = 0; }
      break;
    case 'shoot': {
      const rate = b.phase === 3 ? 30 : 45;
      if (b.t % rate === 20 && b.t < rate * 3) {
        const dx = p.x - b.x, dy = (p.y - 20) - (b.y - 40);
        const d = Math.hypot(dx, dy) || 1;
        const sp = b.phase === 3 ? 3.2 : 2.4;
        G.shots.push({ kind: 'paper', x: b.x, y: b.y - 50, vx: dx / d * sp, vy: dy / d * sp, from: 'boss', t: 240 });
        Audio2.sfx('throw');
      }
      if (b.t > rate * 3 + 30) {
        b.mode = b.phase >= 2 ? 'hop' : 'vent'; b.t = 0;
        if (b.mode === 'vent') { Audio2.sfx('glitch'); toast('B.I.N. IS VENTING. THE LID IS OPEN. FEED HIM.'); }
      }
      break;
    }
    case 'hop': {
      if (b.t === 1) { b.vy = -5; b.vx = p.x > b.x ? 1.6 : -1.6; Audio2.sfx('jump'); }
      b.vy += 0.25; b.x += b.vx; b.y += b.vy;
      if (b.y >= b.homeY) {
        b.y = b.homeY; b.vy = 0; b.vx = 0; shake(5); Audio2.sfx('stomp');
        if (!GOD && Math.abs(p.x - b.x) < 40 && p.onGround) hurtPlayer(1, b.x);
        if (b.hops === undefined) b.hops = 0;
        if (++b.hops % 2 === 0) { b.mode = 'vent'; b.t = 0; toast('B.I.N. IS VENTING. NOW. CANS. GO.'); }
        else { b.mode = 'shoot'; b.t = 0; }
        b.x = clamp(b.x, 8 * TILE, 40 * TILE);
      }
      break;
    }
    case 'vent':
      if (b.t > (b.phase === 1 ? 160 : 110)) { b.mode = b.phase >= 2 ? 'hop' : 'shoot'; b.t = 0; }
      break;
    case 'glitchstart':
      if (b.t === 1) { Audio2.sfx('glitch'); toast('B.I.N.: "DEPLOYING TO PROD. ON A FRIDAY. AT 5PM."'); }
      if (b.t > 60) { flipGravity(); b.mode = 'shoot'; b.t = 0; b.glitchT = 240; toast(G.gsign < 0 ? 'GRAVITY: DEPRECATED.' : 'GRAVITY: ROLLED BACK.'); Audio2.sfx('zap'); }
      break;
    case 'dying':
      if (b.t < 90 && b.t % 12 === 0) { addFX('v6', 'fx_hitspark', b.x + rndi(-24, 24), b.y - rndi(0, 60)); Audio2.sfx('hit'); }
      if (b.t === 100) {
        for (let i = 0; i < 8; i++) addFX('v6', 'fx_confetti', b.x + rndi(-30, 30), b.y - rndi(10, 60));
        Audio2.sfx('fanfare');
      }
      if (b.t > 150) { G.bossDead = true; G.boss = null; startExitCutscene(); }
      break;
  }
  if (b.glitchT > 0) {
    b.glitchT--;
    if (b.glitchT === 0 && b.mode !== 'dying') {
      flipGravity();
      toast(G.gsign < 0 ? 'GRAVITY: DEPRECATED.' : 'GRAVITY: ROLLED BACK.');
      Audio2.sfx('zap');
      b.glitchT = G.gsign < 0 ? 240 : 300;
    }
  }
  if (!GOD && !b.dying && aabb(bodyBox(p, G.gsign), entBox(b))) hurtPlayer(1, b.x);
}

function updateGary(b, p) {
  switch (b.mode) {
    case 'wait':
      b.x = b.ax + Math.sin(b.t / 50) * 30;
      b.y = b.ay + Math.sin(b.t / 33) * 8;
      if (p.mecha || b.t > 900 || p.x > 30 * TILE) {
        b.mode = 'patrol'; b.t = 0;
        if (!p.mecha) toast('GARY: "No suit? Bold. HR loves a scrappy hire."');
      }
      break;
    case 'reboot': {
      // GARY 2.0 loading...
      b.y = lerp(b.y, b.ay, 0.05);
      b.x = lerp(b.x, b.ax, 0.05);
      if (b.t === 40) toast('GARY 2.0: NOW WITH AI. Same gull. More buzzwords.');
      if (b.t === 90) toast('GARY 2.0: "I am agentic now. My agenda: YOU."');
      if (b.t % 10 === 0) addFX('v6', 'fx_hitspark', b.x + rndi(-40, 40), b.y - rndi(0, 50));
      if (b.t > 120) { b.mode = 'patrol'; b.t = 0; Audio2.sfx('roar'); }
      break;
    }
    case 'patrol': {
      const speed = b.rebooted ? 1.6 : b.phase === 3 ? 1.4 : 1;
      b.x = b.ax + Math.sin(b.t / 60 * speed) * 220;
      b.y = b.ay + Math.sin(b.t / 30 * speed) * 24;
      b.dirF = Math.cos(b.t / 60 * speed) < 0;
      const dropRate = b.rebooted ? 55 : b.phase >= 2 ? 70 : 100;
      if (b.t % dropRate === 0) {
        G.shots.push({ kind: 'bread', x: b.x, y: b.y - 10, vx: (Math.random() - 0.5), vy: 0.5, from: 'boss', t: 300 });
        Audio2.sfx('throw');
      }
      if ((b.phase === 3 || b.rebooted) && b.t % 90 === 45) {
        const dx = p.x - b.x; const dy = p.y - 30 - b.y;
        const d = Math.hypot(dx, dy) || 1;
        G.shots.push({ kind: 'latte', x: b.x, y: b.y - 20, vx: dx / d * 3, vy: dy / d * 3 - 1, from: 'boss', t: 300 });
      }
      if (b.t > (b.rebooted ? 320 : 420)) { b.mode = Math.random() < 0.5 ? 'swoopTele' : 'phone'; b.t = 0; }
      if (b.phase >= 2 && !b.summoned) {
        b.summoned = true;
        toast('GARY: "INTERNS. HANDLE THIS." The interns are unpaid. The interns are ARMED.');
        G.ents.push({ type: 'gull', x: b.x - 60, y: 80 }, { type: 'gull', x: b.x + 60, y: 70 });
      }
      break;
    }
    case 'swoopTele':
      if (b.t === 1) { toast('GARY: "TAKING THIS OFFLINE."'); Audio2.sfx('roar'); }
      if (b.t > 40) {
        b.mode = 'swoop'; b.t = 0;
        const dx = p.x - b.x, dy = (p.y - 20) - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = b.rebooted ? 5.4 : 4.6;
        b.vx = dx / d * sp; b.vy = dy / d * sp;
      }
      break;
    case 'swoop':
      b.x += b.vx; b.y += b.vy;
      b.dirF = b.vx < 0;
      if (!GOD && aabb(bodyBox(p, G.gsign), entBox(b))) hurtPlayer(2, b.x);
      if (b.y > 13 * TILE || b.x < 4 * TILE || b.x > 46 * TILE) { b.mode = 'rise'; b.t = 0; }
      break;
    case 'rise':
      b.x = lerp(b.x, b.ax, 0.04); b.y = lerp(b.y, b.ay, 0.04);
      if (b.t > 60) { b.mode = 'patrol'; b.t = 0; }
      break;
    case 'phone':
      if (b.t === 1) toast(b.rebooted ? 'GARY 2.0 landed. He is PROMPTING. This is your window.' : 'GARY landed. He is CHECKING HIS PHONE. This is your moment.');
      b.y = lerp(b.y, 13 * TILE, 0.1);
      b.x = lerp(b.x, 25 * TILE, 0.05);
      if (b.t > (b.rebooted ? 130 : 170)) { b.mode = 'rise'; b.t = 0; }
      break;
    case 'dying':
      b.y += 1.2; b.x = clamp(b.x + Math.sin(b.t / 5) * 2, 7 * TILE, 43 * TILE);
      if (b.y >= 13.8 * TILE) {
        b.y = 13.8 * TILE;
        if (!b.crowned) {
          b.crowned = true;
          for (let i = 0; i < 10; i++) addFX('v6', 'fx_confetti', b.x + rndi(-40, 40), b.y - rndi(10, 70));
          G.ents.push({ type: 'crown', x: clamp(b.x, 7 * TILE, 43 * TILE), y: 13 * TILE });
          toast('GARY DROPPED THE CROWN. TAKE IT. IT WAS NEVER HIS.');
          Audio2.sfx('fanfare');
        }
      }
      break;
  }
  if (b.mode !== 'dying' && b.mode !== 'wait' && b.mode !== 'swoop' && b.mode !== 'reboot' && !GOD) {
    if (aabb(bodyBox(p, G.gsign), entBox(b))) hurtPlayer(1, b.x);
  }
}

function startExitCutscene() {
  G.state = 'exit'; G.exitT = 60; G.exitX = G.p.x;
}
