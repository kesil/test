// JIMOTHY: TRASH TALES — world: level builder, stages, story, jokes
'use strict';

// ------- map legend -------
// terrain: # ground  B brick  W brick-window  = plank  L ladder  ~ water
//          S spring  F checkpoint  D dumpster(2x2 TL)  ! cone  g glass
//          c crate   x box(loot)   d door  E exit-can  w wire  h hydrant
//          P pipe  p pipe-top
// decor:   V lamp  u bush  t dig-spot  G grate  Y puddle  N neon
// spawns:  J player  r rat  s gull  o possum  R robot  C drone
//          z pizza  k cookie  a can  * starcan  U umbrella  X jetpack
//          & mecha  M cart  Q gag-trigger  A chase-trigger  $ paywall
//          1-9 signs

class Builder {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.g = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  }
  put(x, y, ch) { if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) this.g[y][x] = ch; }
  hrow(x0, x1, y, ch) { for (let x = x0; x <= x1; x++) this.put(x, y, ch); }
  vcol(x, y0, y1, ch) { for (let y = y0; y <= y1; y++) this.put(x, y, ch); }
  rect(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) this.hrow(x0, x1, y, ch); }
  ground(x0, x1, top) { this.rect(x0, top, x1, this.rows - 1, '#'); }
  clear(x0, y0, x1, y1) { this.rect(x0, y0, x1, y1, '.'); }
  lines() { return this.g.map(r => r.join('')); }
}

// ------- stage maps -------
function mapStage1() {
  const L = new Builder(212, 17), G = 14;
  L.ground(0, 211, G);
  // start
  L.put(3, G - 1, 'J'); L.put(6, G - 1, '1'); L.put(9, G - 1, 'o');
  L.put(11, G - 1, 'V'); L.put(13, G - 1, 't'); L.put(15, G - 1, '2');
  L.put(17, G - 1, 'c'); L.put(17, G - 2, 'a');
  L.put(20, G - 2, 'D'); L.put(20, G - 3, 'a'); L.put(21, G - 3, 'a');
  L.put(26, G - 1, 'r'); L.put(29, G - 1, 'r');
  L.put(24, G - 1, 'a'); L.put(25, G - 1, 'a');
  // spring + planks + cookie
  L.put(33, G - 1, 'S'); L.hrow(31, 35, 10, '='); L.put(34, 9, 'k');
  // first pit
  L.clear(36, G, 38, 16); L.put(41, G - 1, '!');
  L.put(45, G - 1, 'F'); L.put(47, G - 1, '3');
  L.put(49, 9, 's'); L.put(54, 8, 's');
  L.put(50, G - 1, 'a'); L.put(52, G - 1, 'a');
  // cookie-consent popup gag
  L.put(58, G - 1, 'Q');
  // pizza / chonk section
  L.hrow(62, 66, 10, '='); L.put(64, 9, 'z'); L.put(66, G - 1, 'S');
  L.vcol(69, G - 3, G - 1, 'c');           // crate wall — chonk smashes it
  L.put(72, G - 1, 'c'); L.put(73, G - 1, 'x'); L.put(74, G - 1, 'c');
  L.put(77, G - 1, 'r'); L.put(79, G - 1, 'g'); L.put(80, G - 1, 'g');
  L.put(83, G - 2, 'D'); L.put(83, G - 3, '*');
  // star run
  for (let x = 86; x <= 97; x += 2) L.put(x, G - 1, 'a');
  [87, 90, 93, 96].forEach(x => L.put(x, G - 1, 'r'));
  L.put(92, G - 1, 'S'); L.hrow(94, 99, 9, '='); L.put(97, 8, 'd'); // secret door
  L.put(103, G - 1, 'F');
  L.put(107, 8, 's'); L.put(111, 9, 's'); L.put(108, G - 1, '!');
  // canal dip
  L.rect(114, G, 122, 16, '~');
  L.put(116, 15, 'a'); L.put(119, 15, 'a'); L.put(121, 15, 'k');
  L.put(126, G - 1, 't'); L.put(128, G - 1, 'r'); L.put(130, G - 1, 'Y');
  // towers + wire balance
  L.rect(140, 9, 142, 13, 'B'); L.vcol(139, 9, G - 1, 'L');
  L.hrow(143, 151, 9, 'w'); L.put(145, 8, 'a'); L.put(148, 8, 'a');
  L.rect(152, 9, 154, 13, 'B');
  L.put(158, G - 1, '4'); L.put(160, G - 1, 'F');
  L.put(163, G - 1, 'r'); L.put(166, G - 1, 'r'); L.put(168, G - 1, 'S'); L.put(170, 8, 's');
  L.put(172, G - 1, 'u'); L.put(174, G - 1, 'V');
  L.put(176, G - 1, 'E');
  // secret disco room (door pair)
  L.rect(184, 6, 206, 16, 'B');
  L.clear(185, 7, 205, 14);
  L.hrow(185, 205, 15, 'B') ; L.rect(185, 15, 205, 16, 'B');
  L.put(186, 14, 'd'); L.put(196, 14, '*'); L.put(199, 14, 'k');
  for (let x = 190; x <= 202; x += 2) L.put(x, 14, 'a');
  L.put(203, 14, '5'); L.put(188, 14, 'N'); L.put(200, 14, 'N');
  return L.lines();
}

function mapStage2() {
  const L = new Builder(222, 24), G = 21;
  L.ground(0, 75, G);
  L.put(3, G - 1, 'J'); L.put(6, G - 1, '1');
  L.put(10, G - 1, 't'); L.put(16, G - 1, 'h');
  [12, 20, 27].forEach(x => L.put(x, G - 1, 'R'));
  L.put(23, G - 2, 'D'); L.put(23, G - 3, 'a');
  // tower + ladder to rooftops
  L.rect(32, 12, 34, G - 1, 'B'); L.vcol(31, 12, G - 1, 'L');
  L.hrow(35, 43, 12, '='); L.clear(38, 12, 39, 12); L.put(38, 9, 's');
  L.rect(44, 12, 46, G - 1, 'B'); L.put(45, 11, 'F'); L.put(44, 11, 'a');
  L.hrow(47, 58, 12, '='); L.clear(51, 12, 52, 12);
  L.put(50, 9, 'C'); L.put(56, 10, 'C');
  // wire run
  L.hrow(60, 70, 12, 'w'); L.put(63, 11, 'a'); L.put(67, 11, 'a'); L.put(65, 11, '2');
  L.rect(72, 12, 74, G - 1, 'B');
  // canal
  L.rect(76, 20, 96, 23, '~');
  L.put(80, 22, 'a'); L.put(85, 21, 'a'); L.put(90, 22, 'a'); L.put(93, 22, 'k');
  L.put(82, 16, 's'); L.put(88, 15, 's');
  L.ground(97, 221, G);
  L.put(99, G - 1, '3'); L.put(98, G - 1, 'Y');
  // umbrella tower + glide pit
  L.rect(102, 17, 103, G - 1, 'B'); L.vcol(101, 17, G - 1, 'L'); L.put(102, 16, 'U');
  L.clear(105, G, 112, 23); L.put(104, G - 1, '4');
  L.put(115, G - 1, 'F'); L.put(117, G - 1, '5');
  // paywall arch
  L.rect(120, 12, 122, 16, 'B');
  L.put(121, G - 1, '$');
  L.put(116, G - 1, 't'); L.put(118, G - 1, 'x'); L.put(119, G - 1, 'x');
  // robot gauntlet
  [126, 132, 138].forEach(x => L.put(x, G - 1, 'R'));
  L.put(129, G - 1, 'g'); L.put(135, G - 1, 'g'); L.put(136, G - 1, 'V');
  // walljump shaft
  L.rect(144, 8, 145, 17, 'B');       // left wall (gap at ground to walk in)
  L.rect(148, 6, 149, G - 1, 'B');    // right wall
  L.put(146, G - 1, '6');
  L.hrow(150, 156, 6, '='); L.put(152, 5, 'F');
  L.put(154, 5, 'A');                 // ANIMAL CONTROL chase trigger
  // chase rooftops
  L.hrow(157, 170, 6, '='); L.clear(158, 6, 159, 6); L.clear(165, 6, 166, 6);
  L.rect(171, 10, 173, G - 1, 'B');
  L.hrow(174, 184, 10, '='); L.clear(178, 10, 179, 10);
  L.hrow(185, 193, 10, 'w');
  L.rect(194, 10, 196, G - 1, 'B'); L.put(195, 9, 'X'); // JETPACK
  // flight finale
  for (let x = 199; x <= 213; x += 3) { L.put(x, G - 1, '!'); L.put(x + 1, G - 1, '!'); }
  [[200, 15], [204, 11], [208, 7], [211, 5], [206, 13], [202, 9]].forEach(([x, y]) => L.put(x, y, 'a'));
  L.put(203, 6, 'k');
  L.rect(215, 8, 217, G - 1, 'B'); L.put(216, 7, 'E');
  return L.lines();
}

function mapStage3() {
  const L = new Builder(44, 17), G = 14;
  L.ground(0, 43, G);
  L.rect(0, 3, 1, G - 1, 'B'); L.rect(42, 3, 43, G - 1, 'B');
  L.hrow(0, 43, 3, 'B');       // ceiling — required for the gravity-flip phase
  L.put(4, G - 1, 'J');
  L.put(8, G - 1, 'x'); L.put(12, G - 1, 'x');       // can dispensers
  L.hrow(16, 20, 10, '='); L.hrow(24, 28, 10, '=');
  L.put(6, G - 1, 'N'); L.put(38, G - 1, 'N');
  L.put(18, 9, 'a'); L.put(26, 9, 'a');
  return L.lines();
}

function mapStage4() {
  const L = new Builder(250, 17);
  const seg = [ // [x0, x1, groundTop]
    [0, 20, 8], [21, 40, 9], [41, 60, 10],            // gap 61-63
    [64, 80, 11], [81, 90, 12],                        // gap 91-94
    [95, 115, 12], [116, 150, 13],                     // gap 151-155
    [156, 180, 14],                                    // gap 181-185
    [186, 243, 14],
  ];
  for (const [a, b, g] of seg) L.ground(a, b, g);
  L.put(3, 7, 'J'); L.put(6, 7, 'M');                 // the cart
  L.put(14, 7, '1');
  [[26, 8], [33, 8], [48, 9], [55, 9], [70, 10], [76, 10]].forEach(([x, y]) => L.put(x, y, '!'));
  [[61, 7], [62, 6], [63, 7], [92, 9], [93, 8], [94, 9]].forEach(([x, y]) => L.put(x, y, 'a'));
  L.put(95, 11, 'F'); L.put(100, 11, 'S');
  [[105, 11], [112, 11], [126, 12], [140, 12], [146, 12]].forEach(([x, y]) => L.put(x, y, '!'));
  L.put(135, 12, 'Q');                                // fake BSOD crash
  L.put(150, 12, 'S');
  [[152, 9], [153, 8], [154, 9]].forEach(([x, y]) => L.put(x, y, 'a'));
  L.put(156, 13, 'F');
  [[161, 13], [168, 13], [175, 13]].forEach(([x, y]) => L.put(x, y, '!'));
  L.put(180, 13, 'S');
  [[182, 11], [183, 10], [184, 11]].forEach(([x, y]) => L.put(x, y, 'a'));
  L.put(186, 13, 'F');
  [[192, 13], [199, 13], [206, 13], [213, 13], [220, 13], [227, 13]].forEach(([x, y]) => L.put(x, y, '!'));
  for (let x = 190; x <= 236; x += 4) L.put(x, 10, 'a');
  L.put(234, 13, '2');
  L.rect(244, 5, 246, 13, 'B');
  L.put(243, 13, 'E');                                // "the wall"
  return L.lines();
}

function mapStage5() {
  const L = new Builder(50, 17), G = 14;
  L.ground(0, 49, G);
  L.rect(0, 6, 1, G - 1, 'B'); L.rect(48, 6, 49, G - 1, 'B');
  L.put(5, G - 1, 'J');
  L.put(24, G - 1, '&');                              // MECHA SUIT
  L.hrow(10, 14, 10, '='); L.hrow(35, 39, 10, '=');
  L.put(3, G - 1, 'N'); L.put(45, G - 1, 'N');
  L.put(12, 9, 'k'); L.put(37, 9, 'k');
  return L.lines();
}

// ------- story scripts -------
// speakers: narr | jim | randall | bin | gary   (mood used for jim emotes)
const STORY = {
  intro: [
    ['narr', 'BALLARD, SEATTLE. 2:47 AM.'],
    ['narr', 'Every trash can in the city just received a firmware update.'],
    ['bin', 'Hi neighbor! Garbage is now a SUBSCRIPTION. Unlock your food scraps with B.I.N. PRO(tm) — only $9.99/mo!'],
    ['jim', '...', 'shocked'],
    ['narr', 'Jimothy has one eye, zero thoughts, and a dream. The trash must flow.'],
  ],
  s1outro: [
    ['randall', "Oh good, you're alive. FYI the gulls unionized. Against you, specifically."],
    ['jim', '...', 'happy'],
    ['randall', "Also a robot took my parking spot. I don't have a car. It's the principle."],
  ],
  s2intro: [
    ['narr', 'THE GIG ECONOMY.'],
    ['narr', 'Delivery robots rule the sidewalks now. They have one job. It is not delivering.'],
    ['randall', "I'd help you fight them, but I'm technically an independent contractor."],
  ],
  s2outro: [
    ['randall', "Animal Control has you listed as 'a known entity'. Congrats on the personal brand."],
    ['jim', '...', 'happy'],
    ['randall', "The big bin wants to see you. Bring a resume. And cans. Mostly cans."],
  ],
  s3intro: [
    ['bin', 'AH. THE DISRUPTOR.'],
    ['bin', 'I am B.I.N.-TELLIGENCE 9000. I optimized garbage. It is an ecosystem play.'],
    ['bin', 'As a large bin model, I cannot let you eat that. Have you tried our FREE tier? It is this empty feeling.'],
    ['jim', '...', 'angry'],
    ['bin', 'Per my last email—'],
    ['narr', 'HIS LID OPENS WHEN HE VENTS. FEED HIM THE CANS. FEED HIM EVERYTHING.'],
  ],
  s3outro: [
    ['bin', 'I have decided... to step back... and spend more time... as a planter box...'],
    ['randall', 'You beat a trash can in single combat. I watched the whole thing. It was beautiful.'],
    ['narr', 'Meanwhile, at Trash District(tm) HQ, someone was NOT happy with these numbers.'],
  ],
  s4intro: [
    ['narr', 'CART VELOCITY.'],
    ['narr', "Ballard's steepest hill. No brakes. Technically classified as a war crime by Seattle DOT."],
    ['randall', 'JUMP over the cones. If you die I get your dumpster. Those are the rules.'],
  ],
  s4outro: [
    ['narr', 'Jimothy has arrived at Trash District(tm) HQ. Via the wall.'],
  ],
  s5intro: [
    ['gary', 'SQUAWK. I mean — welcome.'],
    ['gary', 'Gary. CEO, Trash District(tm). We turned garbage into an asset class. The rats have stock options. They cannot sell.'],
    ['gary', 'You have been a real HEADWIND on my Q3, raccoon.'],
    ['jim', '...', 'angry'],
    ['narr', 'Behold: the ancient MECHA SUIT of the Dumpster Sages. It smells terrible. It is PERFECT.'],
  ],
  s5outro: [
    ['gary', 'fine... take the trash... I am going to found a startup... for bread...'],
    ['randall', 'You did it, you absolute unit. King of Trash.'],
    ['narr', "And so the garbage of Ballard was liberated, effective immediately, at scale."],
  ],
};

// contextual one-liner toasts (fire once each)
const NARR = {
  firstDig: "FORAGING: like a delivery app, but you are the app, the driver, and the raccoon.",
  firstKO: "RELOCATED. Jimothy does not acknowledge relocation.",
  firstChonk: "CHONK MODE ENGAGED. Absolute unit detected.",
  firstStar: "SHINY CAN ENERGY. He is become trash, destroyer of rats.",
  bored: "He's just a little guy.",
  popup: "This popup is GDPR compliant. The cookie is real. That's the loophole.",
  paywall: "A paywall. In an alley. THROW CANS to cancel your subscription.",
  chase: "ANIMAL CONTROL! They have a net AND a clipboard. RUN.",
  wire: "Power lines: the original gig economy.",
  taunt: "Taunting. Bold. The rats respect it.",
  swim: "Raccoons are excellent swimmers. The canal is 'clean now'. Legally we must say that.",
  jetpack: "TWO-LITER THRUST. FAA has been notified. FAA has declined to get involved.",
  umbrella: "An umbrella. In Seattle. So THAT'S where they all went.",
  mecha: "MECHA-JIMOTHY ONLINE. Press ATTACK to express your feelings at scale.",
  disco: "SECRET FEVER ROOM. The 70s never left Ballard. They just moved into this basement.",
  cart: "SHOPPING CART ACQUIRED. Jump. That's it. That's the tutorial.",
  bsodBack: "Sorry about that. A raccoon ate our garbage collector. Anyway—",
  gullDown: "Gull neutralized. HR has been informed.",
  robotDown: "Delivery canceled. Your refund is 6-8 business raccoons.",
};

const SIGNS = {
  1: {
    1: "BALLARD: EVERYTHING IS A CO-OP EXCEPT THE TRASH.",
    2: "TRASH PILES: press DOWN to dig. It's called foraging. It's artisanal.",
    3: "GULLS AHEAD. They did a mindfulness retreat. Still jerks.",
    4: "ALMOST THERE. Remember to stretch.",
    5: "SECRET FEVER ROOM. Ask about our vinyl.",
  },
  2: {
    1: "SIDEWALK CLOSED for robot orientation. Day 847.",
    2: "HIGH VOLTAGE. The wire is fine. Probably. It's fine.",
    3: "THE CANAL IS CLEAN NOW. (Legally we must say that.)",
    4: "MIND THE GAP. It does not mind you. (Umbrella on the tower. Climb the ladder. Trust us.)",
    5: "TRASH PREMIUM AHEAD. Have your cans ready.",
    6: "WALL JUMP: jump AT walls. The walls consent.",
  },
  4: {
    1: "SPEED LIMIT: no.",
    2: "LAST EXIT BEFORE HQ. No refunds.",
  },
};

// per-stage config
const STAGES = [
  { id: 1, name: 'TRASH & FURIOUS', sub: 'Ballard After Dark', map: mapStage1, song: 'alley',
    intro: 'intro', outro: 's1outro', signs: SIGNS[1], gag: 'popup' },
  { id: 2, name: 'THE GIG ECONOMY', sub: 'Robots, Rooftops & Regret', map: mapStage2, song: 'rooftops',
    intro: 's2intro', outro: 's2outro', signs: SIGNS[2], gag: null },
  { id: 3, name: 'B.I.N.-TELLIGENCE 9000', sub: 'A Subscription You Can Fight', map: mapStage3, song: 'boss',
    intro: 's3intro', outro: 's3outro', signs: {}, boss: 'bin' },
  { id: 4, name: 'CART VELOCITY', sub: 'No Brakes. No Thoughts.', map: mapStage4, song: 'cart',
    intro: 's4intro', outro: 's4outro', signs: SIGNS[4], cart: true, gag: 'bsod' },
  { id: 5, name: 'HOSTILE TAKEOVER', sub: 'vs. GARY, Seagull CEO', map: mapStage5, song: 'boss',
    intro: 's5intro', outro: 's5outro', signs: {}, boss: 'gary' },
];

// grades by score/deaths
function gradeFor(score, deaths) {
  if (deaths === 0 && score >= 3000) return 'TRASH PANDA PRIME';
  if (deaths <= 1 && score >= 2000) return 'LANDFILL LEGEND';
  if (deaths <= 3) return 'CERTIFIED LITTLE GUY';
  if (deaths <= 6) return 'ROUND BOY (HONORABLE)';
  return 'GARBAGE (AFFECTIONATE)';
}

// ------- level parsing -------
// grid codes
const T = { NONE: 0, GROUND: 1, BRICK: 2, WINDOW: 3, PLANK: 4, LADDER: 5, WATER: 6,
  SPRING: 7, FLAG: 8, CONE: 9, GLASS: 10, CRATE: 11, BOX: 12, DOOR: 13, EXIT: 14,
  WIRE: 15, PIPE: 16, PIPETOP: 17, HYDRANT: 18, DUMP: 19, DUMP2: 20 };

const SOLID = new Set([T.GROUND, T.BRICK, T.WINDOW, T.CRATE, T.BOX, T.HYDRANT, T.DUMP, T.DUMP2, T.PIPE, T.PIPETOP]);

function parseLevel(lines, stage) {
  const h = lines.length, w = Math.max(...lines.map(l => l.length));
  const grid = new Uint8Array(w * h);
  const ents = [], decor = [], doors = [];
  const at = (x, y) => grid[y * w + x];
  const set = (x, y, v) => { grid[y * w + x] = v; };
  for (let y = 0; y < h; y++) {
    const row = lines[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const px = x * TILE + 8, py = (y + 1) * TILE; // feet at tile bottom
      switch (ch) {
        case '#': set(x, y, T.GROUND); break;
        case 'B': set(x, y, T.BRICK); break;
        case 'W': set(x, y, T.WINDOW); break;
        case '=': set(x, y, T.PLANK); break;
        case 'L': set(x, y, T.LADDER); break;
        case '~': set(x, y, T.WATER); break;
        case 'S': set(x, y, T.SPRING); break;
        case 'F': set(x, y, T.FLAG); break;
        case '!': set(x, y, T.CONE); break;
        case 'g': set(x, y, T.GLASS); break;
        case 'c': set(x, y, T.CRATE); break;
        case 'x': set(x, y, T.BOX); break;
        case 'd': set(x, y, T.DOOR); doors.push({ x, y }); break;
        case 'E': set(x, y, T.EXIT); break;
        case 'w': set(x, y, T.WIRE); break;
        case 'P': set(x, y, T.PIPE); break;
        case 'p': set(x, y, T.PIPETOP); break;
        case 'h': set(x, y, T.HYDRANT); break;
        case 'D': set(x, y, T.DUMP); set(x + 1, y, T.DUMP2); set(x, y + 1, T.DUMP2); set(x + 1, y + 1, T.DUMP2); break;
        case 'V': decor.push({ t: 'lamp', x, y }); break;
        case 'u': decor.push({ t: 'bush', x, y }); break;
        case 'G': decor.push({ t: 'grate', x, y }); break;
        case 'Y': decor.push({ t: 'puddle', x, y }); break;
        case 'N': decor.push({ t: 'neon', x, y }); break;
        case 't': ents.push({ type: 'dig', x: px, y: py }); decor.push({ t: 'trash', x, y }); break;
        case 'J': ents.push({ type: 'player', x: px, y: py }); break;
        case 'r': ents.push({ type: 'rat', x: px, y: py }); break;
        case 's': ents.push({ type: 'gull', x: px, y: py }); break;
        case 'o': ents.push({ type: 'possum', x: px, y: py }); break;
        case 'R': ents.push({ type: 'robot', x: px, y: py }); break;
        case 'C': ents.push({ type: 'drone', x: px, y: py }); break;
        case 'z': ents.push({ type: 'item', item: 'pizza', x: px, y: py }); break;
        case 'k': ents.push({ type: 'item', item: 'cookie', x: px, y: py }); break;
        case 'a': ents.push({ type: 'item', item: 'can', x: px, y: py }); break;
        case '*': ents.push({ type: 'item', item: 'star', x: px, y: py }); break;
        case 'U': ents.push({ type: 'item', item: 'umbrella', x: px, y: py }); break;
        case 'X': ents.push({ type: 'item', item: 'jetpack', x: px, y: py }); break;
        case '&': ents.push({ type: 'item', item: 'mecha', x: px, y: py }); break;
        case 'M': ents.push({ type: 'cart', x: px, y: py }); break;
        case 'Q': ents.push({ type: 'gag', x: px, y: py }); break;
        case 'A': ents.push({ type: 'chase', x: px, y: py }); break;
        case '$': ents.push({ type: 'paywall', x: px, y: py }); break;
        default:
          if (ch >= '1' && ch <= '9') ents.push({ type: 'sign', n: +ch, x: px, y: py });
      }
    }
  }
  return { w, h, grid, ents, decor, doors, at, stage };
}
