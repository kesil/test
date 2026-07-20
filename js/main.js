// JIMOTHY: TRASH TALES — main: game flow, rendering, HUD, title, loop (Director's Cut)
'use strict';

// ---------- boot ----------
loadAll([
  ['img', 'v5', 'assets/jimothy_v5_sheet_native.png'],
  ['img', 'v6', 'assets/jimothy_v6_sheet_native.png'],
  ['img', 'tiles', 'assets/jimothy_tiles.png'],
  ['img', 'title', 'assets/jimothy_title.png'],
  ['img', 'extra', 'assets/jimothy_extra.png'],
  ['img', 'extra2', 'assets/jimothy_extra2.png'],
  ['img', 'office', 'assets/jimothy_office.png'],
  ['json', 'v5a', 'assets/jimothy_v5_atlas.json'],
  ['json', 'v6a', 'assets/jimothy_v6_atlas.json'],
  ['json', 'tiles', 'assets/jimothy_tiles.json'],
  ['json', 'extra', 'assets/jimothy_extra_atlas.json'],
  ['json', 'extra2', 'assets/jimothy_extra2_atlas.json'],
  ['json', 'office', 'assets/jimothy_office.json'],
], () => {
  G.state = 'title';
  G.titleAnim = new Anim(); G.titleAnim.set('idle');
  G.titleSel = 0;
  const qs = parseInt(URLQ.get('stage'));
  if (qs >= 1 && qs <= STAGES.length) {
    G.unlocked = STAGES.length;
    startStage(qs - 1, URLQ.get('skip') === '1');
  }
});

G.unlocked = parseInt(localStorage.getItem('jim_unlock') || '1');

// ---------- flow ----------
function startStage(idx, skipIntro) {
  const cfg = STAGES[idx];
  G.stageIdx = idx; G.cfg = cfg;
  G.level = parseLevel(cfg.map(), cfg);
  G.ents = []; G.fx = []; G.shots = []; G.texts = [];
  G.score = 0; G.deaths = 0; G.timeF = 0;
  G.toast = null; G.toastQ = []; G.gag = null; G.chaser = null; G.boss = null; G.bossDead = false;
  G.gsign = 1; G.flagsLit = {}; G.springs = {}; G.respawnBoxes = [];
  G.discoFound = false; G.roller = null; G.captcha = null; G.hitstop = 0;
  G.stats = { kills: 0, coins: 0, wakes: 0, taunts: 0 };
  G.combo = { n: 0, t: 0, best: 0 };
  G.irisT = 50;
  let start = { x: 60, y: 200 };
  for (const e of G.level.ents) {
    if (e.type === 'player') { start = { x: e.x, y: e.y }; continue; }
    const ent = Object.assign({}, e);
    if (ent.type === 'dig') ent.uses = 3;
    G.ents.push(ent);
  }
  G.p = makePlayer(start.x, start.y);
  G.checkpoint = { x: start.x, y: start.y };
  G.cam.x = clamp(start.x - VW / 2, 0, Math.max(0, G.level.w * TILE - VW));
  G.cam.y = clamp(start.y - 150, 0, Math.max(0, G.level.h * TILE - VH));
  if (cfg.boss) spawnBoss(cfg.boss);
  G.banner = 130;
  localStorage.setItem('jim_unlock', String(Math.max(G.unlocked, idx + 1)));
  G.unlocked = Math.max(G.unlocked, idx + 1);
  if (skipIntro || !cfg.intro) {
    G.state = 'play';
    Audio2.play(cfg.song);
  } else {
    startStory(cfg.intro, () => { G.state = 'play'; G.irisT = 50; Audio2.play(cfg.song); });
  }
}

function startStory(key, next) {
  G.state = 'story';
  G.story = { script: STORY[key], i: 0, chars: 0, next };
  Audio2.stop();
}

function finishStage() {
  G.totalScore += G.score; G.totalDeaths += G.deaths; G.totalCoins += G.stats.coins;
  const id = G.cfg.id;
  if (id === 1) award('littleguy');
  if (id === 4 && G.deaths === 0) award('nocrash');
  if (id === 5 && G.stats.wakes <= 1) award('ninja');
  G.state = 'results';
  G.resultsT = 0;
  Audio2.stop();
  Audio2.sfx('fanfare');
  const best = parseInt(localStorage.getItem('jim_best_' + id) || '0');
  G.newBest = G.score > best;
  if (G.newBest) localStorage.setItem('jim_best_' + id, String(G.score));
}

function afterResults() {
  const cfg = G.cfg;
  const go = () => {
    if (G.stageIdx + 1 < STAGES.length) startStage(G.stageIdx + 1);
    else startVictory();
  };
  if (cfg.outro) startStory(cfg.outro, go);
  else go();
}

function startVictory() {
  G.state = 'victory';
  G.outroT = 0;
  award('goty');
  G.victoryAnim = new Anim(); G.victoryAnim.set('king');
  Audio2.play('disco');
}

// ---------- update ----------
function update(dt) {
  if (doorCd > 0) doorCd--;
  Audio2.update(dt);
  if (G.hitstop > 0 && G.state === 'play') { G.hitstop--; Input.post(); return; }
  switch (G.state) {
    case 'title': updateTitle(dt); break;
    case 'story': updateStory(); break;
    case 'play': updatePlay(dt); break;
    case 'pause':
      if (Input.startP || Input.jumpP) { G.state = 'play'; Audio2.sfx('ui'); }
      break;
    case 'captcha': updateCaptcha(); break;
    case 'exit': updateWorldLite(dt); updateExit(dt); updateCamera(); break;
    case 'bsod': updateBSOD(); break;
    case 'results':
      G.resultsT++;
      if (G.resultsT > 50 && (Input.jumpP || Input.startP)) { Audio2.sfx('ui'); afterResults(); }
      break;
    case 'victory': updateVictory(dt); break;
  }
  Input.post();
}

function updateTitle(dt) {
  Audio2.init();
  G.titleAnim.update('v5a', dt);
  G.titleT = (G.titleT || 0) + 1;
  if (G.titleT % 420 === 400) G.titleAnim.set(G.titleAnim.name === 'idle' ? 'taunt' : 'idle');
  const maxSel = Math.min(G.unlocked, STAGES.length) - 1;
  if (Input.l && !G._selHeld) { G.titleSel = Math.max(0, G.titleSel - 1); G._selHeld = true; Audio2.sfx('ui'); }
  else if (Input.r && !G._selHeld) { G.titleSel = Math.min(maxSel, G.titleSel + 1); G._selHeld = true; Audio2.sfx('ui'); }
  else if (!Input.l && !Input.r) G._selHeld = false;
  if (Input.startP || Input.jumpP) {
    Audio2.init(); Audio2.sfx('coin');
    startStage(G.titleSel);
  }
}

function updateStory() {
  Audio2.init();
  const s = G.story;
  const line = s.script[s.i];
  if (!line) { s.next(); return; }
  const full = line[1];
  if (s.chars < full.length) s.chars += 1.2;
  if (Input.jumpP || Input.startP || Input.atkP) {
    if (s.chars < full.length) s.chars = full.length;
    else { s.i++; s.chars = 0; Audio2.sfx('ui'); }
  }
  if (Input.dashP) s.next();
}

function updatePlay(dt) {
  G.timeF++;
  if (G.banner > 0) G.banner--;
  if (G.irisT > 0) G.irisT--;
  if (Input.startP && !G.p.dead) { G.state = 'pause'; Audio2.sfx('ui'); return; }
  if (G.combo.t > 0) { G.combo.t--; if (G.combo.t === 0) G.combo.n = 0; }
  updatePlayer(dt);
  updateEnemies(dt);
  updateShots(dt);
  updateBoss(dt);
  updateChaser();
  updateRoller();
  updateFX(dt);
  updateCamera();
  if (G.gag && !G.gag.alive && G.gag.smashT > 0) G.gag.smashT--;
}

function updateWorldLite(dt) {
  updateFX(dt);
}

function updateFX(dt) {
  for (const f of G.fx) { f.t++; f.anim.update(f.sheet === 'v5' ? 'v5a' : 'v6a', dt); }
  G.fx = G.fx.filter(f => !f.anim.done && f.t < 90);
  for (const t of G.texts) { t.t--; t.y -= 0.5; }
  G.texts = G.texts.filter(t => t.t > 0);
  if (!G.toast && G.toastQ.length) G.toast = G.toastQ.shift();
  if (G.toast) { G.toast.t--; if (G.toast.t <= 0) G.toast = null; }
}

function updateCamera() {
  const p = G.p, L = G.level;
  let focusX = p.x + p.dir * 30;
  if (G.boss && !G.boss.dying) focusX = (p.x * 2 + G.boss.x) / 3;
  const tx = clamp(focusX - VW / 2, 0, Math.max(0, L.w * TILE - VW));
  const ty = clamp(p.y - 150, 0, Math.max(0, L.h * TILE - VH));
  G.cam.x = lerp(G.cam.x, tx, 0.12);
  G.cam.y = lerp(G.cam.y, ty, 0.10);
  if (G.cam.shake > 0) G.cam.shake *= 0.86;
}

function updateVictory(dt) {
  G.outroT++;
  G.victoryAnim.update('v6a', dt);
  if (G.outroT % 18 === 0 && G.outroT < 2000) {
    G.fx.push({ sheet: 'v6', anim: (() => { const a = new Anim(); a.set('fx_confetti'); return a; })(), x: rndi(40, VW - 40), y: rndi(20, 120), t: 0 });
  }
  updateFX(dt);
  if (G.outroT > 240 && (Input.startP || (G.outroT > 900 && Input.jumpP))) {
    G.state = 'title'; Audio2.stop(); Audio2.sfx('ui');
  }
}

// ---------- rendering ----------
function render(dt) {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.clearRect(0, 0, VW, VH);
  switch (G.state) {
    case 'boot': drawBoot(); break;
    case 'title': drawTitle(); break;
    case 'story': drawStory(); break;
    case 'play': case 'exit': drawWorld(); drawHUD(); drawIris(); break;
    case 'pause': drawWorld(); drawHUD(); drawPause(); break;
    case 'captcha': drawWorld(); drawCaptcha(); break;
    case 'bsod': drawWorld(); drawBSOD(); break;
    case 'results': drawWorld(); drawResults(); break;
    case 'victory': drawVictory(); break;
  }
}

function drawBoot() {
  cx.fillStyle = '#1b1626'; cx.fillRect(0, 0, VW, VH);
  txtShadow(cx, 'loading trash...', VW / 2, VH / 2, '#9c96b0', 8, 'center');
}

function drawIris() {
  if (!(G.irisT > 0)) return;
  const p = G.p;
  const r = (1 - G.irisT / 50) * VW * 0.85 + 10;
  const px = clamp(p.x - G.cam.x, 0, VW), py = clamp(p.y - 30 - G.cam.y, 0, VH);
  cx.save();
  cx.beginPath();
  cx.rect(0, 0, VW, VH);
  cx.arc(px, py, r, 0, Math.PI * 2, true);
  cx.fillStyle = '#0a0812';
  cx.fill('evenodd');
  cx.restore();
}

// night sky + parallax skyline (or office interior)
function drawBG() {
  const cfg = G.cfg || {};
  if (cfg.office) { drawOfficeBG(); return; }
  const id = cfg.id || 1;
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  if (id === 3) { grad.addColorStop(0, '#120e1c'); grad.addColorStop(1, '#241a30'); }
  else if (id === 6) { grad.addColorStop(0, '#1a0e20'); grad.addColorStop(1, '#301a28'); }
  else if (id === 2) { grad.addColorStop(0, '#131322'); grad.addColorStop(1, '#232a3e'); }
  else { grad.addColorStop(0, '#151226'); grad.addColorStop(1, '#2a2240'); }
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  srand(99);
  for (let i = 0; i < 60; i++) {
    const x = (rnd() * VW * 3 - G.cam.x * 0.1) % VW, y = rnd() * VH * 0.6;
    const tw = (Math.floor(G.timeF / 30) + i) % 7 === 0;
    cx.fillStyle = tw ? '#fff' : 'rgba(255,255,255,.4)';
    cx.fillRect(Math.abs(Math.floor(x)), Math.floor(y), 1, 1);
  }
  drawTile(cx, 'moon', VW - 60, 18);
  const horizon = VH - 90;
  const off = Math.floor(G.cam.x * 0.25) % TILE;
  for (let i = -1; i <= VW / TILE + 1; i++) {
    const wx = Math.floor((G.cam.x * 0.25) / TILE) + i;
    const r = (Math.abs(wx * 7919) % 10);
    const name = r === 3 ? 'space_needle' : (r % 2 ? 'skyline_a' : 'skyline_b');
    drawTile(cx, name, i * TILE - off, horizon);
  }
  cx.fillStyle = 'rgba(20,16,32,.85)';
  cx.fillRect(0, horizon + TILE, VW, VH - horizon - TILE);
  const coff = (G.cam.x * 0.15 + G.timeF * 0.1) % (VW + 80);
  drawTile(cx, 'cloud_l', VW - coff, 34); drawTile(cx, 'cloud_r', VW - coff + 16, 34);
  drawTile(cx, 'cloud_l', VW - coff - 200, 60); drawTile(cx, 'cloud_r', VW - coff - 184, 60);
}

function drawOfficeBG() {
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, '#1c1e2a'); grad.addColorStop(1, '#262a38');
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  // ceiling strip
  const co = Math.floor(G.cam.x * 0.6) % (TILE * 6);
  for (let i = -1; i <= VW / TILE + 6; i++) {
    drawTileO(cx, i % 6 === 2 ? 'ceil_light' : 'ceil', i * TILE - co, 0);
  }
  // window band with the night city outside
  const wo = Math.floor(G.cam.x * 0.3) % (TILE * 3);
  for (let i = -1; i <= VW / TILE + 3; i++) {
    if (i % 3 !== 2) drawTileO(cx, i % 6 === 1 ? 'window_b' : 'window_a', i * TILE - wo, 60);
    if (i % 3 !== 2) drawTileO(cx, 'window_a', i * TILE - wo, 76);
  }
  cx.fillStyle = 'rgba(16,16,26,.25)';
  cx.fillRect(0, 0, VW, VH);
}

function camTransform() {
  const shx = G.cam.shake > 0.5 ? rndi(-G.cam.shake, G.cam.shake) : 0;
  const shy = G.cam.shake > 0.5 ? rndi(-G.cam.shake, G.cam.shake) : 0;
  cx.setTransform(1, 0, 0, 1, -Math.round(G.cam.x) + shx, -Math.round(G.cam.y) + shy);
}

function drawWorld() {
  drawBG();
  camTransform();
  drawDecor();
  drawTiles();
  drawEnts();
  drawShots();
  drawBossE();
  drawRollerE();
  drawPlayer();
  drawChaser();
  for (const f of G.fx) drawActor(cx, f.sheet, f.sheet === 'v5' ? 'v5a' : 'v6a', f.anim.name, f.anim.frame, f.x, f.y, f.flip);
  for (const t of G.texts) txtShadow(cx, t.s, t.x, t.y - 40, t.color, 8, 'center');
  cx.setTransform(1, 0, 0, 1, 0, 0);
  if (G.cfg && G.cfg.rain) drawRain();
  drawGag();
}

// rain (stage 2: it's Seattle, it was inevitable)
let rainDrops = null;
function drawRain() {
  if (!rainDrops) {
    rainDrops = [];
    for (let i = 0; i < 70; i++) rainDrops.push({ x: Math.random() * VW, y: Math.random() * VH, s: 4 + Math.random() * 4 });
  }
  cx.strokeStyle = 'rgba(150,175,225,.30)';
  cx.beginPath();
  for (const d of rainDrops) {
    d.y += d.s; d.x -= d.s * 0.25;
    if (d.y > VH) { d.y = -6; d.x = Math.random() * (VW + 40); }
    cx.moveTo(d.x, d.y); cx.lineTo(d.x - 1.5, d.y + 6);
  }
  cx.stroke();
  cx.fillStyle = 'rgba(80,100,160,.05)';
  cx.fillRect(0, 0, VW, VH);
}

function drawTiles() {
  const L = G.level;
  const office = G.cfg && G.cfg.office;
  const x0 = Math.max(0, Math.floor(G.cam.x / TILE) - 1), x1 = Math.min(L.w - 1, Math.ceil((G.cam.x + VW) / TILE) + 1);
  const y0 = Math.max(0, Math.floor(G.cam.y / TILE) - 1), y1 = Math.min(L.h - 1, Math.ceil((G.cam.y + VH) / TILE) + 1);
  const wframe = Math.floor(G.timeF / 20) % 2;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const c = L.grid[ty * L.w + tx];
      if (!c) continue;
      const px = tx * TILE, py = ty * TILE;
      const above = ty > 0 ? L.grid[(ty - 1) * L.w + tx] : 0;
      switch (c) {
        case T.GROUND: {
          const lft = tx > 0 ? L.grid[ty * L.w + tx - 1] : 0;
          const rgt = tx < L.w - 1 ? L.grid[ty * L.w + tx + 1] : 0;
          if (above === T.GROUND) drawTile(cx, 'ground_mid', px, py);
          else if (!lft) drawTile(cx, 'ground_top_l', px, py);
          else if (!rgt) drawTile(cx, 'ground_top_r', px, py);
          else drawTile(cx, 'ground_top', px, py);
          break;
        }
        case T.CARPET: drawTileO(cx, above === T.CARPET ? 'carpet_mid' : 'carpet_top', px, py); break;
        case T.CUBE: drawTileO(cx, above === T.CUBE ? 'cubicle' : 'cubicle_top', px, py); break;
        case T.DESK: drawTileO(cx, (tx * 31 % 7) === 2 ? 'desk_papers' : 'desk', px, py); break;
        case T.RACK: drawTileO(cx, above === T.RACK ? 'rack_bot' : 'rack_top', px, py); break;
        case T.VEND: drawTileO(cx, 'vend_top', px, py); break;
        case T.VEND2: drawTileO(cx, 'vend_bot', px, py); break;
        case T.BRICK: drawTile(cx, above === T.BRICK || above === T.WINDOW ? 'brick' : 'brick_top', px, py); break;
        case T.WINDOW: drawTile(cx, 'brick_window', px, py); break;
        case T.PLANK: {
          const lft = L.grid[ty * L.w + tx - 1] === T.PLANK, rgt = L.grid[ty * L.w + tx + 1] === T.PLANK;
          drawTile(cx, !lft ? 'plank_l' : !rgt ? 'plank_r' : 'plank_m', px, py);
          break;
        }
        case T.LADDER: drawTile(cx, 'ladder', px, py); break;
        case T.WATER: drawTile(cx, (tx + wframe) % 2 ? 'water_a' : 'water_b', px, py); break;
        case T.SPRING: {
          const sp = G.springs[tx] > 0;
          if (sp) G.springs[tx]--;
          drawTile(cx, sp ? 'spring_out' : 'spring_idle', px, py);
          break;
        }
        case T.FLAG: drawTile(cx, G.flagsLit[tx + ',' + ty] ? (wframe ? 'flag_b' : 'flag_a') : 'flag_a', px, py); break;
        case T.CONE: drawTile(cx, 'cone', px, py); break;
        case T.GLASS: drawTile(cx, 'glass_hazard', px, py); break;
        case T.CRATE: drawTile(cx, 'crate', px, py); break;
        case T.BOX: drawTile(cx, 'box', px, py); break;
        case T.DOOR: drawTile(cx, 'door', px, py); break;
        case T.EXIT: {
          drawActor(cx, 'v5', 'v5a', 'props', 0, px + 8, py + TILE, false, 1.4);
          const bob = Math.sin(G.timeF / 15) * 3;
          txtShadow(cx, G.cfg.cart ? 'HQ' : G.cfg.office ? 'EXEC BIN' : 'DIVE!', px + 8, py - 30 + bob, '#ffd76b', 8, 'center');
          break;
        }
        case T.WIRE: drawTile(cx, 'pole_wire', px, py); break;
        case T.PIPE: drawTile(cx, 'pipe_mid', px, py); break;
        case T.PIPETOP: drawTile(cx, 'pipe_top', px, py); break;
        case T.HYDRANT: drawTile(cx, 'hydrant', px, py); break;
        case T.DUMP: drawTile(cx, 'dumpster', px, py); break;
      }
    }
  }
}

function drawDecor() {
  for (const d of G.level.decor) {
    const px = d.x * TILE, py = d.y * TILE;
    switch (d.t) {
      case 'lamp':
        drawTile(cx, 'lamp_head', px, py - 32);
        drawTile(cx, 'lamp_pole', px, py - 16);
        drawTile(cx, 'lamp_base', px, py);
        cx.fillStyle = 'rgba(255,224,130,.07)';
        cx.beginPath(); cx.moveTo(px + 8, py - 24); cx.lineTo(px - 14, py + 16); cx.lineTo(px + 30, py + 16); cx.fill();
        break;
      case 'bush': drawTile(cx, 'bush', px, py); break;
      case 'grate': drawTile(cx, 'grate', px, py); break;
      case 'puddle': drawTile(cx, 'puddle', px, py); break;
      case 'trash': drawTile(cx, 'trash_scatter', px, py); break;
      case 'neon': drawSprite(cx, Math.floor(G.timeF / 40) % 5 === 4 ? 'neon_1' : 'neon_0', px + 8, py - 8); break;
      case 'plant': drawTileO(cx, 'plant', px, py); break;
      case 'cables': drawTileO(cx, 'cables', px, py); break;
      case 'papers': drawTileO(cx, 'papers_floor', px, py); break;
      case 'monitor': drawTileO(cx, 'monitor', px, py); break;
      case 'cooler': drawTileO(cx, 'cooler', px, py); break;
      case 'whiteboard': drawTileO(cx, 'whiteboard', px, py); break;
      case 'poster': drawTileO(cx, 'poster', px, py); break;
      case 'window': drawTileO(cx, (d.x % 2) ? 'window_b' : 'window_a', px, py); break;
    }
  }
}

function drawEnts() {
  for (const e of G.ents) {
    if (e.dead) continue;
    switch (e.type) {
      case 'rat': drawActor(cx, 'v6', 'v6a', 'rat', Math.floor(G.timeF / 9) % 2, e.x, e.y, e.vx < 0); break;
      case 'gull': {
        drawActor(cx, 'v6', 'v6a', 'gull', Math.floor(G.timeF / 9) % 2, e.x, e.y, e.dirF);
        if (e.mode === 'aim') txtShadow(cx, '!', e.x, e.y - 40, '#ff6b6b', 8, 'center');
        break;
      }
      case 'sgull': {
        drawActor(cx, 'v6', 'v6a', 'gull', 0, e.x, e.y, false);
        if (e.mode === 'sleep') drawActor(cx, 'v6', 'v6a', 'bubbles', 3, e.x + 14, e.y - 16);
        else txtShadow(cx, '!', e.x, e.y - 36, '#ff6b6b', 8, 'center');
        break;
      }
      case 'crow': {
        if (e.mode === 'perch') drawSprite(cx, 'crow_perch', e.x, e.y, G.p.x < e.x);
        else drawSprite(cx, 'crow_' + (Math.floor(G.timeF / 7) % 2), e.x, e.y, e.dirF);
        if (e.hasCan) drawActor(cx, 'v5', 'v5a', 'items', 2, e.x, e.y + 26);
        break;
      }
      case 'roomba': drawSprite(cx, 'roomba_' + (Math.floor(G.timeF / 6) % 2), e.x, e.y, e.vx < 0); break;
      case 'scooter': drawSprite(cx, 'scooter_' + (Math.floor(G.timeF / 8) % 2), e.x, e.y, e.vx < 0); break;
      case 'printer': drawSprite(cx, 'printer_' + (e.shootF > 0 ? 1 : 0), e.x, e.y, G.p.x < e.x); break;
      case 'possum': {
        drawActor(cx, 'v6', 'v6a', 'possum', Math.floor(G.timeF / 12) % 2, e.x, e.y, G.p.x < e.x);
        if (e.bubbleT > 0) drawActor(cx, 'v6', 'v6a', 'bubbles', 0, e.x, e.y - 20);
        break;
      }
      case 'robot': drawSprite(cx, 'robot_' + (Math.floor(G.timeF / 8) % 2), e.x, e.y, e.vx < 0); break;
      case 'drone': drawSprite(cx, 'drone_' + (Math.floor(G.timeF / 5) % 2), e.x, e.y, e.dirF); break;
      case 'item': drawItem(e); break;
      case 'coin': drawSprite(cx, 'coin_' + (Math.floor(G.timeF / 7 + e.x / 16) % 4), e.x, e.y + Math.sin(e.bob) * 2); break;
      case 'crown': drawSprite(cx, 'crown', e.x, e.y + Math.sin(e.bob) * 3); break;
      case 'paywall': drawSprite(cx, 'paywall_' + (Math.floor(G.timeF / 25) % 2), e.x, e.y); break;
      case 'popupwall': {
        const wob = Math.sin(G.timeF / 10 + e.x) * 2;
        drawSprite(cx, 'popup', e.x, e.y + wob, false, 1.2);
        break;
      }
      case 'sign': {
        cx.fillStyle = '#6b4a32'; cx.fillRect(e.x - 1, e.y - 12, 2, 12);
        cx.fillStyle = '#8a6142'; cx.fillRect(e.x - 8, e.y - 20, 16, 10);
        txtShadow(cx, '?', e.x, e.y - 19, '#ffe9b0', 8, 'center');
        break;
      }
      case 'dig':
        if (e.uses > 0 && Math.floor(G.timeF / 40) % 3 === 0)
          drawActor(cx, 'v5', 'v5a', 'fx_sparkle', Math.floor(G.timeF / 8) % 2, e.x, e.y - 4);
        break;
    }
  }
}

function drawItem(e) {
  const bobY = e.y + Math.sin(e.bob || 0) * 2;
  const frameByItem = { pizza: 0, can: 2, cookie: 3 };
  if (e.item in frameByItem) {
    drawActor(cx, 'v5', 'v5a', 'items', frameByItem[e.item], e.x, bobY + 20);
  } else if (e.item === 'star') {
    const gold = Math.floor(G.timeF / 6) % 2;
    drawActor(cx, 'v5', 'v5a', 'items', 2, e.x, bobY + 20);
    if (gold) drawActor(cx, 'v5', 'v5a', 'fx_sparkle', 0, e.x, bobY - 2);
    cx.fillStyle = 'rgba(255,215,80,.14)';
    cx.beginPath(); cx.arc(e.x, bobY - 8, 12 + gold * 2, 0, 7); cx.fill();
  } else if (e.item === 'coffee') {
    drawSprite(cx, 'latte', e.x, bobY);
    txtShadow(cx, 'ESPRESSO', e.x, bobY - 26, '#d8b48a', 8, 'center');
  } else if (e.item === 'wizhat') {
    drawSprite(cx, 'wizhat', e.x, bobY);
    if (Math.floor(G.timeF / 8) % 2) drawSprite(cx, 'spell_1', e.x + 10, bobY - 10);
  } else if (e.item === 'umbrella') {
    cx.fillStyle = '#b8434e';
    cx.beginPath(); cx.arc(e.x, bobY - 8, 8, Math.PI, 0); cx.fill();
    cx.fillStyle = '#8a8a96'; cx.fillRect(e.x, bobY - 8, 1, 10);
  } else if (e.item === 'jetpack') {
    cx.fillStyle = '#5a9c58'; cx.fillRect(e.x - 4, bobY - 18, 8, 14);
    cx.fillStyle = '#daf0da'; cx.fillRect(e.x - 4, bobY - 18, 8, 4);
    cx.fillStyle = '#ffb14d'; cx.fillRect(e.x - 2, bobY - 3, 4, 3);
    txtShadow(cx, 'JET', e.x, bobY - 30, '#9be89b', 8, 'center');
  } else if (e.item === 'mecha') {
    const pulse = 0.65 + Math.sin(G.timeF / 15) * 0.3;
    drawActor(cx, 'v6', 'v6a', 'mecha', 0, e.x, bobY, false, 1, pulse);
    txtShadow(cx, 'MECHA', e.x, bobY - 60, '#9be8e8', 8, 'center');
  }
  if (Math.floor((G.timeF + (e.x | 0)) / 30) % 4 === 0)
    drawActor(cx, 'v5', 'v5a', 'fx_sparkle', Math.floor(G.timeF / 10) % 2, e.x, bobY - 6);
}

function drawShots() {
  for (const s of G.shots) {
    switch (s.kind) {
      case 'can':
        cx.save(); cx.translate(s.x, s.y); cx.rotate(s.t / 4);
        drawActor(cx, 'v5', 'v5a', 'items', 2, 0, 20);
        cx.restore();
        break;
      case 'zap':
        cx.fillStyle = '#96e8e8'; cx.fillRect(s.x - 6, s.y - 2, 12, 3);
        cx.fillStyle = '#fff'; cx.fillRect(s.x - 2, s.y - 1, 4, 1);
        break;
      case 'spell': drawSprite(cx, 'spell_' + (Math.floor(s.t / 5) % 2), s.x, s.y + 7); break;
      case 'paper': drawSprite(cx, 'paper_' + (Math.floor(s.t / 6) % 2), s.x, s.y + 7); break;
      case 'bread': drawSprite(cx, 'bread', s.x, s.y + 6); break;
      case 'latte': drawSprite(cx, 'latte', s.x, s.y + 8); break;
    }
  }
}

function drawBossE() {
  const b = G.boss;
  if (!b) return;
  if (b.kind === 'bin') {
    let spr;
    const f = b.frame || 0;
    if (b.mode === 'dying') spr = 'binboss_glitch_' + f;
    else if (b.mode === 'vent') spr = 'binboss_open_' + f;
    else if (b.mode === 'hop' || b.phase >= 2 && b.mode === 'shoot') spr = 'binboss_mad_' + f;
    else if (b.mode === 'glitchstart') spr = 'binboss_glitch_' + f;
    else spr = 'binboss_idle_' + f;
    drawSprite(cx, spr, b.x, b.y);
    if (b.flash > 0 && b.flash % 2) drawSprite(cx, 'binboss_glitch_0', b.x, b.y, false, 1, 0.5);
    if (b.mode === 'vent') {
      const bob = Math.sin(G.timeF / 8) * 3;
      txtShadow(cx, 'FEED ME', b.x, b.y - 96 + bob, '#96e8e8', 8, 'center');
    }
  } else {
    let spr;
    const f = b.frame || 0;
    if (b.mode === 'dying') spr = b.y >= 13.7 * TILE ? 'gary_dead' : 'gary_mad_' + f;
    else if (b.mode === 'swoop' || b.mode === 'swoopTele') spr = 'gary_swoop';
    else if (b.phase >= 2 || b.mode === 'phone' || b.rebooted) spr = 'gary_mad_' + f;
    else spr = 'gary_fly_' + f;
    drawSprite(cx, spr, b.x, b.y, b.dirF === false);
    // GARY 2.0: AI-powered glitch aura
    if (b.rebooted && b.mode !== 'dying') {
      for (let i = 0; i < 3; i++) {
        const gy = b.y - rndi(10, 70), gw = rndi(20, 70);
        cx.fillStyle = i % 2 ? 'rgba(96,232,232,.25)' : 'rgba(240,96,96,.25)';
        cx.fillRect(b.x - gw / 2 + rndi(-8, 8), gy, gw, 2);
      }
    }
    if (b.mode === 'reboot') txtShadow(cx, 'PIVOTING...', b.x, b.y - 76, '#96e8e8', 8, 'center');
    if (b.mode === 'phone') txtShadow(cx, b.rebooted ? 'prompting...' : 'checking phone...', b.x, b.y - 70, '#ffd76b', 8, 'center');
  }
}

function drawRollerE() {
  const r = G.roller;
  if (!r) return;
  const f = Math.floor(G.timeF / 8) % 2;
  drawSprite(cx, 'steamroller_' + f, r.x, G.p.y + 4, true, 1.2);
  if (!r.stopped) txtShadow(cx, 'GRADY (STEAMROLLER)', r.x, G.p.y - 70, '#ffb14d', 8, 'center');
}

function drawPlayer() {
  const p = G.p;
  if (p.inv > 0 && p.ghostT <= 0 && G.timeF % 6 < 2 && !p.dead) return;
  const scale = p.chonk > 0 ? 1.16 : 1;
  // coffee speed lines
  if (p.coffeeT > 0 && Math.abs(p.vx) > 2) {
    cx.strokeStyle = 'rgba(255,255,255,.25)';
    cx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ly = p.y - 10 - i * 10;
      cx.moveTo(p.x - p.dir * 20, ly); cx.lineTo(p.x - p.dir * (34 + i * 6), ly);
    }
    cx.stroke();
  }
  cx.save();
  if (p.ghostT > 0) cx.globalAlpha = 0.7;
  if (G.gsign < 0) {
    cx.translate(Math.round(p.x), Math.round(p.y));
    cx.scale(1, -1);
    cx.translate(-Math.round(p.x), -Math.round(p.y));
  }
  drawActor(cx, p.sheet, p.atlas, p.anim.name, p.anim.frame, p.x, p.y, p.dir < 0, scale);
  cx.restore();
  // wizard hat on his lil head
  if (p.wizardT > 0 && p.castT <= 0 && !p.dead && p.ghostT <= 0) {
    drawSprite(cx, 'wizhat', p.x + p.dir * 2, p.y - 36 * G.gsign);
    if (G.timeF % 20 < 4) drawSprite(cx, 'spell_1', p.x - p.dir * 12, p.y - 30);
  }
  if (p.jetpack >= 0 && p.fuel > 0 && Input.jump && !p.onGround && G.state === 'play') {
    cx.fillStyle = '#ffb14d'; cx.fillRect(p.x - p.dir * 8 - 2, p.y - 8, 4, 6 + (G.timeF % 3));
  }
}

function drawChaser() {
  const c = G.chaser;
  if (!c || c.stopped) return;
  const f = Math.floor(G.timeF / 12) % 2;
  drawActor(cx, 'v6', 'v6a', 'control', f, c.x, G.cam.y + VH + 10, false, 1.6);
  txtShadow(cx, 'ANIMAL CONTROL', c.x, G.cam.y + 30, '#ff6b6b', 8, 'center');
}

// ---------- gag overlays ----------
function drawGag() {
  const g = G.gag;
  if (!g) return;
  if (g.type === 'popup' && g.alive) {
    g.t++;
    const wob = Math.sin(g.t / 10) * 2;
    drawSprite(cx, 'popup', VW / 2, VH / 2 + 40 + wob, false, 1.6);
    txtShadow(cx, 'press ATTACK to decline forcefully', VW / 2, VH / 2 + 56, '#ffd76b', 8, 'center');
  }
}

function drawBSOD() {
  if (G.bsodPhase === 0) {
    cx.fillStyle = '#0b27a8'; cx.fillRect(0, 0, VW, VH);
    txt(cx, ':(', 40, 30, '#fff', 32);
    const lines = [
      'JIMOTHY.EXE has stopped responding.',
      '',
      'Error: RACCOON_TOO_ROUND (0x000F00D5)',
      'A raccoon has eaten the garbage collector.',
      '',
      'Collecting some error info (' + Math.min(99, Math.floor(G.bsodT / 3)) + '% complete)',
      '',
      '> Press JUMP to un-crash <',
    ];
    lines.forEach((l, i) => txt(cx, l, 40, 84 + i * 12, '#dfe6ff', 8));
  } else {
    cx.fillStyle = '#06060a'; cx.fillRect(0, 0, VW, VH);
    const boots = [
      'JIM-BIOS v4.04 ... OK',
      'MOUNTING /dev/dumpster ... OK',
      'LOADING raccoon.sys ... ROUND',
      'THOUGHTS ... 0 FOUND (OPTIMAL)',
      'WARNING: STEAMROLLER DETECTED IN REARVIEW',
      'RESUMING CART AT FULL SPEED. SORRY.',
    ];
    const n = Math.min(boots.length, 1 + Math.floor(G.bsodT / 24));
    for (let i = 0; i < n; i++) txt(cx, boots[i], 30, 40 + i * 14, '#7be87b', 8);
  }
}

// CAPTCHA overlay
function drawCaptcha() {
  const c = G.captcha;
  if (!c) return;
  cx.fillStyle = 'rgba(8,6,14,.8)'; cx.fillRect(0, 0, VW, VH);
  const PW = 240, PH = 226;
  const px = VW / 2 - PW / 2, py = 14;
  cx.fillStyle = '#f2f0ea'; cx.fillRect(px, py, PW, PH);
  cx.fillStyle = '#4a6ab0'; cx.fillRect(px, py, PW, 34);
  txt(cx, 'SECURITY CHECK', px + 8, py + 5, '#fff', 8);
  txt(cx, 'Select all squares containing TRASH', px + 8, py + 18, '#dfe6ff', 8);
  const cell = 62, gap = 6, gx = px + 12, gy = py + 44;
  c.cells.forEach((cellDef, i) => {
    const cxx = gx + (i % 3) * (cell + gap), cyy = gy + Math.floor(i / 3) * (cell + gap);
    cx.fillStyle = c.picked.has(i) ? '#bfe3bf' : '#dddad2';
    cx.fillRect(cxx, cyy, cell, cell);
    // draw the subject, chunky
    cx.save();
    cx.translate(cxx + cell / 2, cyy + cell / 2);
    cx.scale(2, 2);
    switch (cellDef.name) {
      case 'trash': drawTile(cx, 'trash_scatter', -8, -8); break;
      case 'cone': drawTile(cx, 'cone', -8, -8); break;
      case 'crate': drawTile(cx, 'crate', -8, -8); break;
      case 'hydrant': drawTile(cx, 'hydrant', -8, -8); break;
      case 'moon': drawTile(cx, 'moon', -8, -8); break;
      case 'can': drawActor(cx, 'v5', 'v5a', 'items', 2, 0, 12); break;
      case 'fishbone': drawActor(cx, 'v5', 'v5a', 'items', 1, 0, 12); break;
      case 'pizza': drawActor(cx, 'v5', 'v5a', 'items', 0, 0, 12); break;
      case 'gull': drawActor(cx, 'v6', 'v6a', 'gull', 0, 0, 10, false, 0.55); break;
    }
    cx.restore();
    if (c.picked.has(i)) {
      cx.strokeStyle = '#3a8a3a'; cx.lineWidth = 2;
      cx.strokeRect(cxx + 1, cyy + 1, cell - 2, cell - 2);
      cx.lineWidth = 1;
    }
    if (c.sel === i) {
      cx.strokeStyle = '#ff8f3a'; cx.lineWidth = 3;
      cx.strokeRect(cxx - 2, cyy - 2, cell + 4, cell + 4);
      cx.lineWidth = 1;
    }
  });
  txtShadow(cx, 'ARROWS: move · ATTACK: select · JUMP: verify', VW / 2, py + PH + 6, '#ffe9b0', 8, 'center');
  if (c.tries > 0) txtShadow(cx, 'attempt ' + (c.tries + 1) + ' — the printer is watching', VW / 2, py + PH + 18, '#ff8f8f', 8, 'center');
}

const PAUSE_TIPS = [
  'The trash waits. The trash is patient. The trash has nowhere to be.',
  'Tip: hold DOWN while walking to SNEAK. Gulls respect nothing else.',
  'Tip: UP + ATTACK throws cans. Cans are ammo, currency, and a personality.',
  'Tip: DOWN + ATTACK in the air is a POUNCE. Gravity, but on purpose.',
  'Tip: taunt (T) near rats to assert dominance you have not earned.',
  'Tip: jump out of a roll to keep the speed. The physics engine allows this. Reluctantly.',
  'Reminder: you are a raccoon. This is load-bearing lore.',
];
function drawPause() {
  cx.fillStyle = 'rgba(8,6,14,.7)'; cx.fillRect(0, 0, VW, VH);
  txtShadow(cx, 'PAUSED', VW / 2, 90, '#ffd76b', 32, 'center');
  const tip = PAUSE_TIPS[Math.floor((G.pauseSeed = G.pauseSeed || Math.random() * 100)) % PAUSE_TIPS.length];
  wrap(tip, 52).forEach((l, i) => txtShadow(cx, l, VW / 2, 140 + i * 11, '#c8c2da', 8, 'center'));
  txtShadow(cx, 'JUMP / START: resume · M: mute', VW / 2, 190, '#8f88a8', 8, 'center');
  drawActor(cx, 'v5', 'v5a', 'sleep', Math.floor((G.titleT = (G.titleT || 0) + 1) / 30) % 2, VW / 2, 250);
}

// ---------- HUD ----------
function drawHUD() {
  const p = G.p;
  const heartsN = Math.ceil(p.maxHearts / 2);
  for (let i = 0; i < heartsN; i++) {
    const v = p.hearts - i * 2;
    const f = v >= 2 ? 0 : v === 1 ? 1 : 2;
    drawActor(cx, 'v5', 'v5a', 'hearts', f, 18 + i * 14, 46);
  }
  drawActor(cx, 'v5', 'v5a', 'items', 2, 24, 76);
  txtShadow(cx, 'x' + p.cans, 34, 50, '#fff', 8);
  drawSprite(cx, 'coin_0', 24, 74);
  txtShadow(cx, 'x' + G.stats.coins, 34, 66, '#ffd76b', 8);
  txtShadow(cx, String(G.score).padStart(6, '0'), VW - 8, 6, '#ffd76b', 8, 'right');
  if (G.combo.n >= 2 && G.combo.t > 0) {
    txtShadow(cx, 'COMBO x' + G.combo.n, VW - 8, 18, '#9be89b', 8, 'right');
  }
  let py = 66;
  if (p.chonk > 0) { txtShadow(cx, 'CHONK ' + Math.ceil(p.chonk / 60), VW - 8, py, '#ffb14d', 8, 'right'); py += 10; }
  if (p.star > 0) { txtShadow(cx, 'STAR ' + Math.ceil(p.star / 60), VW - 8, py, '#ffe96b', 8, 'right'); py += 10; }
  if (p.coffeeT > 0) { txtShadow(cx, 'ESPRESSO ' + Math.ceil(p.coffeeT / 60), VW - 8, py, '#d8b48a', 8, 'right'); py += 10; }
  if (p.wizardT > 0) { txtShadow(cx, 'WIZARD ' + Math.ceil(p.wizardT / 60), VW - 8, py, '#c89be8', 8, 'right'); py += 10; }
  if (p.jetpack >= 0) {
    cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(VW - 68, py, 60, 6);
    cx.fillStyle = '#9be89b'; cx.fillRect(VW - 67, py + 1, Math.max(0, p.fuel) * 0.58, 4);
    txtShadow(cx, 'FUEL', VW - 74, py - 1, '#9be89b', 8, 'right');
  }
  const b = G.boss;
  if (b && b.mode !== 'wait' && !b.dying) {
    const w = 160;
    cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(VW / 2 - w / 2 - 2, 14, w + 4, 10);
    cx.fillStyle = b.kind === 'bin' ? '#96e8e8' : '#ff8f6b';
    cx.fillRect(VW / 2 - w / 2, 16, w * Math.max(0, b.hp) / b.maxHp, 6);
    const nm = b.kind === 'bin' ? 'B.I.N.-TELLIGENCE 9000' : b.rebooted ? 'GARY 2.0 (NOW WITH AI)' : 'GARY (CEO)';
    txtShadow(cx, nm, VW / 2, 3, '#fff', 8, 'center');
  }
  if (G.toast) {
    const lines = wrap(G.toast.msg, 54);
    const h = lines.length * 11 + 8;
    cx.fillStyle = 'rgba(10,8,18,.82)';
    cx.fillRect(30, VH - h - 26, VW - 60, h);
    cx.strokeStyle = 'rgba(255,215,107,.4)'; cx.strokeRect(30.5, VH - h - 25.5, VW - 61, h - 1);
    lines.forEach((l, i) => txtShadow(cx, l, VW / 2, VH - h - 20 + i * 11, '#ffe9b0', 8, 'center'));
  }
  if (G.banner > 0 && !G.boss) {
    const a = Math.min(1, G.banner / 30);
    cx.globalAlpha = a;
    txtShadow(cx, 'STAGE ' + G.cfg.id + ': ' + G.cfg.name, VW / 2, 90, '#ffd76b', 16, 'center');
    txtShadow(cx, G.cfg.sub, VW / 2, 110, '#c8c2da', 8, 'center');
    cx.globalAlpha = 1;
  }
}

function wrap(s, n) {
  const words = s.split(' '), out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).length > n) { out.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- screens ----------
function drawTitle() {
  drawTitleBG();
  const img = Assets.img.title;
  cx.drawImage(img, 0, 0, 160, 96, VW / 2 - 160, 12, 320, 192);
  txtShadow(cx, "DIRECTOR'S CUT", VW / 2 + 96, 176, '#9be89b', 8, 'center');
  drawActor(cx, 'v5', 'v5a', G.titleAnim.name, G.titleAnim.frame, VW / 2 + 150, 226, true);
  const blink = Math.floor(G.uiT / 30) % 2 === 0;
  if (blink) txtShadow(cx, 'PRESS JUMP / TAP TO START', VW / 2, 206, '#ffe9b0', 8, 'center');
  let sx = VW / 2 - (Math.min(G.unlocked, STAGES.length) * 26) / 2;
  for (let i = 0; i < Math.min(G.unlocked, STAGES.length); i++) {
    const sel = i === G.titleSel;
    cx.fillStyle = sel ? '#ffd76b' : 'rgba(255,255,255,.18)';
    cx.fillRect(sx + i * 26, 226, 20, 14);
    txt(cx, String(i + 1), sx + i * 26 + 10, 229, sel ? '#241a30' : '#cfc8e0', 8, 'center');
  }
  txtShadow(cx, 'TROPHIES: ' + achSet.size + '/' + Object.keys(ACH).length, 8, 6, '#9be89b', 8);
  txtShadow(cx, 'ARROWS move · Z jump · X attack (▲+X throw, ▼+X pounce) · C roll · T taunt · M mute', VW / 2, 248, '#8f88a8', 8, 'center');
  txtShadow(cx, 'a game about a round boy', VW / 2, 260, '#6b6484', 8, 'center');
}
function drawTitleBG() {
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, '#151226'); grad.addColorStop(1, '#2a2240');
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  G.uiT = (G.uiT || 0) + 1;
  srand(7);
  for (let i = 0; i < 50; i++) {
    const x = rnd() * VW, y = rnd() * VH * 0.7;
    cx.fillStyle = (Math.floor(G.uiT / 40) + i) % 9 === 0 ? '#fff' : 'rgba(255,255,255,.35)';
    cx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  for (let i = 0; i <= VW / TILE; i++) {
    const r = Math.abs((i * 7919) % 10);
    drawTile(cx, r === 4 ? 'space_needle' : (r % 2 ? 'skyline_a' : 'skyline_b'), i * TILE, VH - 46);
    drawTile(cx, 'ground_top', i * TILE, VH - 30);
    drawTile(cx, 'ground_mid', i * TILE, VH - 14);
  }
}

function drawStory() {
  drawTitleBG();
  cx.fillStyle = 'rgba(8,6,14,.88)'; cx.fillRect(0, 0, VW, VH);
  const s = G.story;
  const line = s.script[s.i];
  if (!line) return;
  const [who, text0, mood] = line;
  cx.fillStyle = '#100c1c'; cx.fillRect(20, VH - 96, VW - 40, 76);
  cx.strokeStyle = 'rgba(255,215,107,.35)'; cx.strokeRect(20.5, VH - 95.5, VW - 41, 75);
  const px = 52, py = VH - 34;
  if (who === 'jim') {
    const moodF = { happy: 0, sad: 1, angry: 2, shocked: 3 }[mood];
    if (moodF !== undefined) drawActor(cx, 'v6', 'v6a', 'emotes', moodF, px, py);
    else drawActor(cx, 'v5', 'v5a', 'portrait', 0, px, py);
  } else if (who === 'randall') drawActor(cx, 'v6', 'v6a', 'possum', 0, px, py - 8, false, 1.4);
  else if (who === 'bin') drawSprite(cx, 'binboss_idle_0', px, py + 4, false, 0.72);
  else if (who === 'gary') drawSprite(cx, 'gary_mad_0', px, py + 8, true, 0.6);
  const names = { jim: 'JIMOTHY', randall: 'RANDALL (possum)', bin: 'B.I.N.-TELLIGENCE', gary: 'GARY (CEO)', narr: '' };
  if (names[who]) txtShadow(cx, names[who], 86, VH - 90, '#ffd76b', 8);
  const shown = text0.slice(0, Math.floor(s.chars));
  const lines = wrap(shown, who === 'narr' ? 52 : 44);
  lines.forEach((l, i) => txtShadow(cx, l, who === 'narr' ? 40 : 86, VH - 76 + i * 11, who === 'narr' ? '#c8c2da' : '#fff', 8));
  if (s.chars >= text0.length && Math.floor(G.uiT / 20) % 2 === 0)
    txtShadow(cx, '▼', VW - 36, VH - 34, '#ffd76b', 8);
  txtShadow(cx, 'JUMP: next · C: skip', VW - 24, VH - 14, '#6b6484', 8, 'right');
}

function drawResults() {
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.fillStyle = 'rgba(8,6,14,.85)'; cx.fillRect(0, 0, VW, VH);
  cx.fillStyle = '#100c1c'; cx.fillRect(80, 26, VW - 160, 216);
  cx.strokeStyle = 'rgba(255,215,107,.4)'; cx.strokeRect(80.5, 26.5, VW - 161, 215);
  txtShadow(cx, 'STAGE ' + G.cfg.id + ' CLEAR!', VW / 2, 38, '#ffd76b', 16, 'center');
  const rows = [
    ['TRASH POINTS', String(G.score)],
    ['TIME', Math.floor(G.timeF / 3600) + ':' + String(Math.floor(G.timeF / 60) % 60).padStart(2, '0')],
    ['RELOCATIONS', String(G.deaths)],
    ['ENEMIES HANDLED', String(G.stats.kills)],
    ['BEST COMBO', G.combo.best >= 2 ? 'x' + G.combo.best : '—'],
    ['TRASHCOIN', G.stats.coins + '  (value: $0.00)'],
    ['GRADE', gradeFor(G.score, G.deaths)],
  ];
  rows.forEach(([k, v], i) => {
    txtShadow(cx, k, 104, 66 + i * 17, '#c8c2da', 8);
    txtShadow(cx, v, VW - 104, 66 + i * 17, '#fff', 8, 'right');
  });
  if (G.newBest) txtShadow(cx, '* NEW PERSONAL TRASH RECORD *', VW / 2, 192, '#9be89b', 8, 'center');
  if (G.resultsT > 50 && Math.floor(G.resultsT / 20) % 2 === 0)
    txtShadow(cx, 'PRESS JUMP', VW / 2, 214, '#ffe9b0', 8, 'center');
  drawActor(cx, 'v5', 'v5a', 'celebrate', Math.floor(G.resultsT / 9) % 4, VW / 2, 262);
}

const CREDITS = [
  "JIMOTHY: TRASH TALES — DIRECTOR'S CUT", '',
  'STARRING',
  'Jimothy ......... as himself',
  'Randall ......... emotional support marsupial',
  'B.I.N. 9000 ..... now a planter box',
  'Gary ............ pursuing bread opportunities',
  'Gary 2.0 ........ deprecated',
  'The Rats ........ still vesting',
  'The Crow ........ still invoicing',
  'Grady ........... steamroller, gentleman', '',
  'STUNTS', 'Jimothy did his own stunts.', 'All of them were accidents.', '',
  'OFFICE SAFETY', 'No printers were harmed.', 'One printer was EXTREMELY harmed.', '',
  'CATERING', 'The dumpster behind the fish place', '',
  'NO GULLS WERE PAID', 'They demanded exposure. They got it.', '',
  'TRASHCOIN DISCLOSURE', 'Value at press time: $0.00', 'Randall is not a licensed advisor.', '',
  'FILMED ON LOCATION IN', 'BALLARD, SEATTLE', '',
  'THANKS FOR PLAYING', 'Jimothy has already forgotten you.', 'He loves you anyway.',
];

function drawVictory() {
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, '#1a0e2a'); grad.addColorStop(1, '#33204a');
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < VW / 16; i++) {
    const hue = (i * 40 + Math.floor(G.outroT / 12) * 40) % 360;
    cx.fillStyle = `hsla(${hue},60%,45%,.55)`;
    cx.fillRect(i * 16, VH - 32, 16, 32);
  }
  drawTile(cx, 'dumpster', VW / 2 - 16, VH - 64);
  drawActor(cx, 'v6', 'v6a', 'king', G.victoryAnim.frame, VW / 2, VH - 62, false, 1.6);
  const t = Math.floor(G.outroT / 12) % 2;
  drawActor(cx, 'v6', 'v6a', 'possum', t, VW / 2 - 95, VH - 36, false);
  for (const f of G.fx) drawActor(cx, f.sheet, 'v6a', f.anim.name, f.anim.frame, f.x, f.y);
  txtShadow(cx, 'KING OF TRASH', VW / 2, 12, '#ffd76b', 16, 'center');
  txtShadow(cx, 'TOTAL TRASH: ' + G.totalScore + '   RELOCATIONS: ' + G.totalDeaths + '   COIN: $0.00', VW / 2, 34, '#fff', 8, 'center');
  txtShadow(cx, 'TROPHIES: ' + achSet.size + '/' + Object.keys(ACH).length + '   FINAL GRADE: ' + gradeFor(G.totalScore / 6, G.totalDeaths), VW / 2, 46, '#9be89b', 8, 'center');
  const cy = VH - ((G.outroT * 0.4) % (CREDITS.length * 14 + VH));
  cx.save();
  cx.beginPath(); cx.rect(0, 60, VW, VH - 104) ; cx.clip();
  CREDITS.forEach((l, i) => {
    const y = cy + i * 14;
    if (y > 54 && y < VH - 40) txtShadow(cx, l, VW / 2, y, i === 0 ? '#ffd76b' : '#d8d2ea', 8, 'center');
  });
  cx.restore();
  if (G.outroT > 240 && Math.floor(G.outroT / 25) % 2 === 0)
    txtShadow(cx, 'START: back to title', VW / 2, VH - 10, '#8f88a8', 8, 'center');
}

// ---------- main loop ----------
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts;
  acc += dt;
  const step = 1 / 60;
  let n = 0;
  while (acc >= step && n < 4) { update(step); acc -= step; n++; }
  render(dt);
}
requestAnimationFrame(frame);
