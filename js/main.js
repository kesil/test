// JIMOTHY: TRASH TALES — main: game flow, rendering, HUD, title, loop
'use strict';

// ---------- boot ----------
loadAll([
  ['img', 'v5', 'assets/jimothy_v5_sheet_native.png'],
  ['img', 'v6', 'assets/jimothy_v6_sheet_native.png'],
  ['img', 'tiles', 'assets/jimothy_tiles.png'],
  ['img', 'title', 'assets/jimothy_title.png'],
  ['img', 'extra', 'assets/jimothy_extra.png'],
  ['json', 'v5a', 'assets/jimothy_v5_atlas.json'],
  ['json', 'v6a', 'assets/jimothy_v6_atlas.json'],
  ['json', 'tiles', 'assets/jimothy_tiles.json'],
  ['json', 'extra', 'assets/jimothy_extra_atlas.json'],
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
  G.toast = null; G.gag = null; G.chaser = null; G.boss = null; G.bossDead = false;
  G.gsign = 1; G.flagsLit = {}; G.springs = {}; G.respawnBoxes = [];
  G.discoFound = false;
  let start = { x: 60, y: 200 };
  for (const e of G.level.ents) {
    if (e.type === 'player') { start = { x: e.x, y: e.y }; continue; }
    const ent = Object.assign({}, e);
    if (ent.type === 'dig') ent.uses = 3;
    G.ents.push(ent);
  }
  G.p = makePlayer(start.x, start.y);
  G.checkpoint = { x: start.x, y: start.y };
  if (cfg.boss) spawnBoss(cfg.boss);
  G.banner = 130;
  localStorage.setItem('jim_unlock', String(Math.max(G.unlocked, idx + 1)));
  G.unlocked = Math.max(G.unlocked, idx + 1);
  if (skipIntro || !cfg.intro) {
    G.state = 'play';
    Audio2.play(cfg.song);
  } else {
    startStory(cfg.intro, () => { G.state = 'play'; Audio2.play(cfg.song); });
  }
}

function startStory(key, next) {
  G.state = 'story';
  G.story = { script: STORY[key], i: 0, chars: 0, next };
  Audio2.stop();
}

function finishStage() {
  G.totalScore += G.score; G.totalDeaths += G.deaths;
  G.state = 'results';
  G.resultsT = 0;
  Audio2.stop();
  Audio2.sfx('fanfare');
  const best = parseInt(localStorage.getItem('jim_best_' + G.cfg.id) || '0');
  G.newBest = G.score > best;
  if (G.newBest) localStorage.setItem('jim_best_' + G.cfg.id, String(G.score));
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
  G.victoryAnim = new Anim(); G.victoryAnim.set('king');
  Audio2.play('disco');
}

// ---------- update ----------
function update(dt) {
  if (doorCd > 0) doorCd--;
  Audio2.update(dt);
  switch (G.state) {
    case 'title': updateTitle(dt); break;
    case 'story': updateStory(); break;
    case 'play': updatePlay(dt); break;
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
  if (Input.dashP) { s.next(); } // skip all
}

function updatePlay(dt) {
  G.timeF++;
  if (G.banner > 0) G.banner--;
  updatePlayer(dt);
  updateEnemies(dt);
  updateShots(dt);
  updateBoss(dt);
  updateChaser();
  updateFX(dt);
  updateCamera();
  if (G.gag && !G.gag.alive && G.gag.smashT > 0) G.gag.smashT--;
}

function updateWorldLite(dt) {
  updateFX(dt);
  for (const t of G.texts) t.t--;
  G.texts = G.texts.filter(t => t.t > 0);
}

function updateFX(dt) {
  for (const f of G.fx) { f.t++; f.anim.update(f.sheet === 'v5' ? 'v5a' : 'v6a', dt); }
  G.fx = G.fx.filter(f => !f.anim.done && f.t < 90);
  for (const t of G.texts) { t.t--; t.y -= 0.5; }
  G.texts = G.texts.filter(t => t.t > 0);
  if (G.toast) { G.toast.t--; if (G.toast.t <= 0) G.toast = null; }
}

function updateCamera() {
  const p = G.p, L = G.level;
  let focusX = p.x + p.dir * 30;
  if (G.boss && !G.boss.dying) focusX = (p.x * 2 + G.boss.x) / 3; // keep the boss in frame
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
    case 'play': case 'exit': drawWorld(); drawHUD(); break;
    case 'bsod': drawWorld(); drawBSOD(); break;
    case 'results': drawWorld(); drawResults(); break;
    case 'victory': drawVictory(); break;
  }
}

function drawBoot() {
  cx.fillStyle = '#1b1626'; cx.fillRect(0, 0, VW, VH);
  txtShadow(cx, 'loading trash...', VW / 2, VH / 2, '#9c96b0', 8, 'center');
}

// night sky + parallax skyline
function drawBG() {
  const id = G.cfg ? G.cfg.id : 1;
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  if (id === 3) { grad.addColorStop(0, '#120e1c'); grad.addColorStop(1, '#241a30'); }
  else if (id === 5) { grad.addColorStop(0, '#1a0e20'); grad.addColorStop(1, '#301a28'); }
  else { grad.addColorStop(0, '#151226'); grad.addColorStop(1, '#2a2240'); }
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  // stars
  srand(99);
  for (let i = 0; i < 60; i++) {
    const x = (rnd() * VW * 3 - G.cam.x * 0.1) % VW, y = rnd() * VH * 0.6;
    const tw = (Math.floor(G.timeF / 30) + i) % 7 === 0;
    cx.fillStyle = tw ? '#fff' : 'rgba(255,255,255,.4)';
    cx.fillRect(Math.abs(Math.floor(x)), Math.floor(y), 1, 1);
  }
  drawTile(cx, 'moon', VW - 60, 18);
  // skyline (parallax)
  const horizon = VH - 90;
  const off = Math.floor(G.cam.x * 0.25) % TILE;
  srand(4242);
  for (let i = -1; i <= VW / TILE + 1; i++) {
    const wx = Math.floor((G.cam.x * 0.25) / TILE) + i;
    const r = (Math.abs(wx * 7919) % 10);
    const name = r === 3 ? 'space_needle' : (r % 2 ? 'skyline_a' : 'skyline_b');
    drawTile(cx, name, i * TILE - off, horizon);
  }
  cx.fillStyle = 'rgba(20,16,32,.85)';
  cx.fillRect(0, horizon + TILE, VW, VH - horizon - TILE);
  // clouds
  const coff = (G.cam.x * 0.15 + G.timeF * 0.1) % (VW + 80);
  drawTile(cx, 'cloud_l', VW - coff, 34); drawTile(cx, 'cloud_r', VW - coff + 16, 34);
  drawTile(cx, 'cloud_l', VW - coff - 200, 60); drawTile(cx, 'cloud_r', VW - coff - 184, 60);
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
  drawPlayer();
  drawChaser();
  for (const f of G.fx) drawActor(cx, f.sheet, f.sheet === 'v5' ? 'v5a' : 'v6a', f.anim.name, f.anim.frame, f.x, f.y, f.flip);
  for (const t of G.texts) txtShadow(cx, t.s, t.x, t.y - 40, t.color, 8, 'center');
  cx.setTransform(1, 0, 0, 1, 0, 0);
  drawGag();
}

function drawTiles() {
  const L = G.level;
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
          txtShadow(cx, G.cfg.cart ? 'HQ' : 'DIVE!', px + 8, py - 30 + bob, '#ffd76b', 8, 'center');
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
      case 'neon': drawSprite(cx2s(), Math.floor(G.timeF / 40) % 5 === 4 ? 'neon_1' : 'neon_0', px + 8, py - 8); break;
    }
  }
}
function cx2s() { return cx; }

function drawEnts() {
  for (const e of G.ents) {
    if (e.dead) continue;
    switch (e.type) {
      case 'rat': {
        const f = Math.floor(G.timeF / 9) % 2;
        drawActor(cx, 'v6', 'v6a', 'rat', f, e.x, e.y, e.vx < 0);
        break;
      }
      case 'gull': {
        const f = Math.floor(G.timeF / 9) % 2;
        drawActor(cx, 'v6', 'v6a', 'gull', f, e.x, e.y, e.dirF);
        if (e.mode === 'aim') txtShadow(cx, '!', e.x, e.y - 40, '#ff6b6b', 8, 'center');
        break;
      }
      case 'possum': {
        const f = Math.floor(G.timeF / 12) % 2;
        drawActor(cx, 'v6', 'v6a', 'possum', f, e.x, e.y, G.p.x < e.x);
        if (e.bubbleT > 0) drawActor(cx, 'v6', 'v6a', 'bubbles', 0, e.x, e.y - 20);
        break;
      }
      case 'robot': drawSprite(cx, 'robot_' + (Math.floor(G.timeF / 8) % 2), e.x, e.y, e.vx < 0); break;
      case 'drone': drawSprite(cx, 'drone_' + (Math.floor(G.timeF / 5) % 2), e.x, e.y, e.dirF); break;
      case 'item': drawItem(e); break;
      case 'crown': drawSprite(cx, 'crown', e.x, e.y + Math.sin(e.bob) * 3); break;
      case 'paywall': drawSprite(cx, 'paywall_' + (Math.floor(G.timeF / 25) % 2), e.x, e.y); break;
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
    else if (b.phase >= 2 || b.mode === 'phone') spr = 'gary_mad_' + f;
    else spr = 'gary_fly_' + f;
    drawSprite(cx, spr, b.x, b.y, b.dirF === false);
    if (b.mode === 'phone') txtShadow(cx, 'checking phone...', b.x, b.y - 70, '#ffd76b', 8, 'center');
  }
}

function drawPlayer() {
  const p = G.p;
  if (p.inv > 0 && G.timeF % 6 < 2 && !p.dead) return;
  const scale = p.chonk > 0 ? 1.16 : 1;
  cx.save();
  if (G.gsign < 0) {
    cx.translate(Math.round(p.x), Math.round(p.y));
    cx.scale(1, -1);
    cx.translate(-Math.round(p.x), -Math.round(p.y));
  }
  drawActor(cx, p.sheet, p.atlas, p.anim.name, p.anim.frame, p.x, p.y, p.dir < 0, scale);
  cx.restore();
  // fuel flame under jetpack
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
      'RESUMING CART AT FULL SPEED. SORRY.',
    ];
    const n = Math.min(boots.length, 1 + Math.floor(G.bsodT / 28));
    for (let i = 0; i < n; i++) txt(cx, boots[i], 30, 40 + i * 14, '#7be87b', 8);
  }
}

// ---------- HUD ----------
function drawHUD() {
  const p = G.p;
  // hearts (each icon = 2 units)
  const heartsN = Math.ceil(p.maxHearts / 2);
  for (let i = 0; i < heartsN; i++) {
    const v = p.hearts - i * 2;
    const f = v >= 2 ? 0 : v === 1 ? 1 : 2;
    drawActor(cx, 'v5', 'v5a', 'hearts', f, 18 + i * 14, 46);
  }
  // cans
  drawActor(cx, 'v5', 'v5a', 'items', 2, 24, 76);
  txtShadow(cx, 'x' + p.cans, 34, 50, '#fff', 8);
  // score
  txtShadow(cx, String(G.score).padStart(6, '0'), VW - 8, 6, '#ffd76b', 8, 'right');
  // powerup timers
  let py = 66;
  if (p.chonk > 0) { txtShadow(cx, 'CHONK ' + Math.ceil(p.chonk / 60), VW - 8, py, '#ffb14d', 8, 'right'); py += 10; }
  if (p.star > 0) { txtShadow(cx, 'STAR ' + Math.ceil(p.star / 60), VW - 8, py, '#ffe96b', 8, 'right'); py += 10; }
  if (p.jetpack >= 0) {
    cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(VW - 68, py, 60, 6);
    cx.fillStyle = '#9be89b'; cx.fillRect(VW - 67, py + 1, Math.max(0, p.fuel) * 0.58, 4);
    txtShadow(cx, 'FUEL', VW - 74, py - 1, '#9be89b', 8, 'right');
  }
  // boss bar
  const b = G.boss;
  if (b && b.mode !== 'wait' && !b.dying) {
    const w = 160;
    cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(VW / 2 - w / 2 - 2, 14, w + 4, 10);
    cx.fillStyle = b.kind === 'bin' ? '#96e8e8' : '#ff8f6b';
    cx.fillRect(VW / 2 - w / 2, 16, w * Math.max(0, b.hp) / b.maxHp, 6);
    txtShadow(cx, b.kind === 'bin' ? 'B.I.N.-TELLIGENCE 9000' : 'GARY (CEO)', VW / 2, 3, '#fff', 8, 'center');
  }
  // toast
  if (G.toast) {
    const lines = wrap(G.toast.msg, 54);
    const h = lines.length * 11 + 8;
    cx.fillStyle = 'rgba(10,8,18,.82)';
    cx.fillRect(30, VH - h - 26, VW - 60, h);
    cx.strokeStyle = 'rgba(255,215,107,.4)'; cx.strokeRect(30.5, VH - h - 25.5, VW - 61, h - 1);
    lines.forEach((l, i) => txtShadow(cx, l, VW / 2, VH - h - 20 + i * 11, '#ffe9b0', 8, 'center'));
  }
  // stage banner
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
  drawActor(cx, 'v5', 'v5a', G.titleAnim.name, G.titleAnim.frame, VW / 2 + 150, 226, true);
  const blink = Math.floor(G.uiT / 30) % 2 === 0;
  if (blink) txtShadow(cx, 'PRESS JUMP / TAP TO START', VW / 2, 208, '#ffe9b0', 8, 'center');
  // stage select
  let sx = VW / 2 - (Math.min(G.unlocked, 5) * 26) / 2;
  for (let i = 0; i < Math.min(G.unlocked, 5); i++) {
    const sel = i === G.titleSel;
    cx.fillStyle = sel ? '#ffd76b' : 'rgba(255,255,255,.18)';
    cx.fillRect(sx + i * 26, 226, 20, 14);
    txt(cx, String(i + 1), sx + i * 26 + 10, 229, sel ? '#241a30' : '#cfc8e0', 8, 'center');
  }
  txtShadow(cx, 'ARROWS move · Z jump · X attack (▲+X throw) · C roll · T taunt · M mute', VW / 2, 248, '#8f88a8', 8, 'center');
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
  // letterbox panel
  cx.fillStyle = '#100c1c'; cx.fillRect(20, VH - 96, VW - 40, 76);
  cx.strokeStyle = 'rgba(255,215,107,.35)'; cx.strokeRect(20.5, VH - 95.5, VW - 41, 75);
  // portrait
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
  cx.fillStyle = '#100c1c'; cx.fillRect(90, 40, VW - 180, 190);
  cx.strokeStyle = 'rgba(255,215,107,.4)'; cx.strokeRect(90.5, 40.5, VW - 181, 189);
  txtShadow(cx, 'STAGE ' + G.cfg.id + ' CLEAR!', VW / 2, 52, '#ffd76b', 16, 'center');
  const rows = [
    ['TRASH POINTS', String(G.score)],
    ['TIME', Math.floor(G.timeF / 3600) + ':' + String(Math.floor(G.timeF / 60) % 60).padStart(2, '0')],
    ['RELOCATIONS', String(G.deaths)],
    ['GRADE', gradeFor(G.score, G.deaths)],
  ];
  rows.forEach(([k, v], i) => {
    txtShadow(cx, k, 120, 92 + i * 20, '#c8c2da', 8);
    txtShadow(cx, v, VW - 120, 92 + i * 20, '#fff', 8, 'right');
  });
  if (G.newBest) txtShadow(cx, '* NEW PERSONAL TRASH RECORD *', VW / 2, 178, '#9be89b', 8, 'center');
  if (G.resultsT > 50 && Math.floor(G.resultsT / 20) % 2 === 0)
    txtShadow(cx, 'PRESS JUMP', VW / 2, 206, '#ffe9b0', 8, 'center');
  drawActor(cx, 'v5', 'v5a', 'celebrate', Math.floor(G.resultsT / 9) % 4, VW / 2, 258);
}

const CREDITS = [
  'JIMOTHY: TRASH TALES', '',
  'STARRING',
  'Jimothy ......... as himself',
  'Randall ......... emotional support marsupial',
  'B.I.N. 9000 ..... now a planter box',
  'Gary ............ pursuing bread opportunities',
  'The Rats ........ still vesting', '',
  'STUNTS', 'Jimothy did his own stunts.', 'All of them were accidents.', '',
  'CATERING', 'The dumpster behind the fish place', '',
  'NO GULLS WERE PAID', 'They demanded exposure. They got it.', '',
  'FILMED ON LOCATION IN', 'BALLARD, SEATTLE', '',
  'THANKS FOR PLAYING', 'Jimothy has already forgotten you.', 'He loves you anyway.',
];

function drawVictory() {
  const grad = cx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, '#1a0e2a'); grad.addColorStop(1, '#33204a');
  cx.fillStyle = grad; cx.fillRect(0, 0, VW, VH);
  // disco floor
  for (let i = 0; i < VW / 16; i++) {
    const hue = (i * 40 + Math.floor(G.outroT / 12) * 40) % 360;
    cx.fillStyle = `hsla(${hue},60%,45%,.55)`;
    cx.fillRect(i * 16, VH - 32, 16, 32);
  }
  // throne of refuse
  drawTile(cx, 'dumpster', VW / 2 - 16, VH - 64);
  drawActor(cx, 'v6', 'v6a', 'king', G.victoryAnim.frame, VW / 2, VH - 62, false, 1.6);
  const t = Math.floor(G.outroT / 12) % 2;
  drawActor(cx, 'v6', 'v6a', 'possum', t, VW / 2 - 95, VH - 36, false); // Randall, vibing
  for (const f of G.fx) drawActor(cx, f.sheet, 'v6a', f.anim.name, f.anim.frame, f.x, f.y);
  txtShadow(cx, 'KING OF TRASH', VW / 2, 16, '#ffd76b', 16, 'center');
  const total = G.totalScore, grade = gradeFor(total / 5, G.totalDeaths);
  txtShadow(cx, 'TOTAL TRASH: ' + total + '   RELOCATIONS: ' + G.totalDeaths, VW / 2, 40, '#fff', 8, 'center');
  txtShadow(cx, 'FINAL GRADE: ' + grade, VW / 2, 52, '#9be89b', 8, 'center');
  // credits crawl
  const cy = VH - ((G.outroT * 0.4) % (CREDITS.length * 14 + VH));
  cx.save();
  cx.beginPath(); cx.rect(0, 66, VW, VH - 110); cx.clip();
  CREDITS.forEach((l, i) => {
    const y = cy + i * 14;
    if (y > 60 && y < VH - 40) txtShadow(cx, l, VW / 2, y, i === 0 ? '#ffd76b' : '#d8d2ea', 8, 'center');
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
