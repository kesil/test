// JIMOTHY: TRASH TALES — world: level builder, stages, story, jokes (Director's Cut)
'use strict';

// ------- map legend -------
// terrain: # ground  B brick  W brick-window  = plank  L ladder  ~ water
//          S spring  F checkpoint  D dumpster(2x2 TL)  ! cone  g glass
//          c crate   x box(loot)   d door  E exit-can  w wire  h hydrant
//          P pipe  p pipe-top
// office:  f carpet(solid)  K cubicle(solid)  e desk(platform)  q server rack(solid)
//          v vending machine(1x2 solid TL)
// decor:   V lamp  u bush/plant  t dig-spot  G grate/cables  Y puddle/papers  N neon
//          m monitor  y watercooler  H whiteboard  O poster  j window
// spawns:  J player  r rat  s gull  0 sleeping-gull  o possum  R robot  C drone
//          n crow  b roomba  I scooter-spawner  Z printer
//          z pizza  k cookie  a can  * starcan  U umbrella  X jetpack  & mecha
//          ^ coffee  @ wizard-hat  : trashcoin
//          M cart  Q gag-trigger  ? captcha  ; self-checkout  % steamroller
//          A chase-trigger  $ paywall  1-9 signs

class Builder {
  constructor(cols, rows) {
    this.cols = cols; this.rows = rows;
    this.g = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  }
  put(x, y, ch) { if (y >= 0 && y < this.rows && x >= 0 && x < this.cols) this.g[y][x] = ch; }
  hrow(x0, x1, y, ch) { for (let x = x0; x <= x1; x++) this.put(x, y, ch); }
  vcol(x, y0, y1, ch) { for (let y = y0; y <= y1; y++) this.put(x, y, ch); }
  rect(x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) this.hrow(x0, x1, y, ch); }
  ground(x0, x1, top, ch = '#') { this.rect(x0, top, x1, this.rows - 1, ch); }
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
  L.put(19, G - 1, ';');                                  // self-checkout gag
  L.put(20, G - 2, 'D'); L.put(20, G - 3, 'a'); L.put(21, G - 3, ':');
  L.put(26, G - 1, 'r'); L.put(29, G - 1, 'r');
  L.put(24, G - 1, 'a'); L.put(25, G - 1, ':');
  // spring + planks + cookie + coin arc
  L.put(33, G - 1, 'S'); L.hrow(31, 35, 10, '='); L.put(34, 9, 'k');
  L.put(31, 9, ':'); L.put(32, 9, ':');
  // first pit (coins over the gap = risk/reward)
  L.clear(36, G, 38, 16); L.put(37, 9, ':'); L.put(41, G - 1, '!');
  L.put(45, G - 1, 'F'); L.put(47, G - 1, '3');
  L.put(49, 9, 's');
  L.put(53, G - 1, '0'); L.put(51, G - 1, '6');          // napping security gull + sneak sign
  L.put(50, G - 1, 'a'); L.put(56, G - 1, ':'); L.put(57, G - 1, ':');
  // cookie-consent popup gag
  L.put(58, G - 1, 'Q');
  // pizza / chonk section
  L.hrow(62, 66, 10, '='); L.put(64, 9, 'z'); L.put(66, G - 1, 'S');
  L.vcol(69, G - 3, G - 1, 'c');
  L.put(72, G - 1, 'c'); L.put(73, G - 1, 'x'); L.put(74, G - 1, 'c');
  L.put(76, G - 1, 'n');                                  // crow (can thief)
  L.put(77, G - 1, 'r'); L.put(79, G - 1, 'g'); L.put(80, G - 1, 'g');
  L.put(83, G - 2, 'D'); L.put(83, G - 3, '*');
  // star run
  for (let x = 86; x <= 97; x += 2) L.put(x, G - 1, x % 4 ? 'a' : ':');
  [87, 90, 93, 96].forEach(x => L.put(x, G - 1, 'r'));
  L.put(92, G - 1, 'S'); L.hrow(94, 99, 9, '='); L.put(97, 8, 'd');
  L.put(103, G - 1, 'F');
  L.put(107, 8, 's'); L.put(111, 9, 's'); L.put(108, G - 1, '!');
  // canal dip
  L.rect(114, G, 122, 16, '~');
  L.put(116, 15, 'a'); L.put(119, 15, ':'); L.put(121, 15, 'k');
  L.put(126, G - 1, 't'); L.put(128, G - 1, 'r'); L.put(130, G - 1, 'Y');
  // towers + wire balance
  L.rect(140, 9, 142, 13, 'B'); L.vcol(139, 9, G - 1, 'L');
  L.hrow(143, 151, 9, 'w'); L.put(145, 8, ':'); L.put(148, 8, ':');
  L.rect(152, 9, 154, 13, 'B');
  L.put(158, G - 1, '4'); L.put(160, G - 1, 'F');
  L.put(163, G - 1, 'r'); L.put(166, G - 1, 'r'); L.put(167, G - 1, 'k');
  L.put(168, G - 1, 'S'); L.put(170, 8, 's');
  L.put(172, G - 1, 'u'); L.put(174, G - 1, 'V');
  L.put(176, G - 1, 'E');
  // secret disco room
  L.rect(184, 6, 206, 16, 'B');
  L.clear(185, 7, 205, 14);
  L.rect(185, 15, 205, 16, 'B');
  L.put(186, 14, 'd'); L.put(196, 14, '*'); L.put(199, 14, 'k');
  for (let x = 190; x <= 202; x += 2) L.put(x, 14, ':');
  L.put(203, 14, '5'); L.put(188, 14, 'N'); L.put(200, 14, 'N');
  return L.lines();
}

function mapStage2() {
  const L = new Builder(222, 24), G = 21;
  L.ground(0, 75, G);
  L.put(3, G - 1, 'J'); L.put(6, G - 1, '1');
  L.put(10, G - 1, 't'); L.put(16, G - 1, 'h');
  L.put(8, G - 1, 'I');                                   // scooter bro zone
  [12, 20, 27].forEach(x => L.put(x, G - 1, 'R'));
  L.put(23, G - 2, 'D'); L.put(23, G - 3, 'a');
  // tower + ladder to rooftops
  L.rect(32, 12, 34, G - 1, 'B'); L.vcol(31, 12, G - 1, 'L');
  L.hrow(35, 43, 12, '='); L.clear(38, 12, 39, 12); L.put(38, 9, 's');
  for (let x = 36; x <= 42; x += 2) L.put(x, 11, ':');
  L.rect(44, 12, 46, G - 1, 'B'); L.put(45, 11, 'F'); L.put(44, 11, 'a');
  L.hrow(47, 58, 12, '='); L.clear(51, 12, 52, 12);
  L.put(50, 9, 'C'); L.put(56, 10, 'C'); L.put(48, 11, 'n');   // rooftop crow
  // wire run
  L.hrow(60, 70, 12, 'w'); L.put(63, 11, 'a'); L.put(67, 11, ':'); L.put(65, 11, '2');
  L.rect(72, 12, 74, G - 1, 'B');
  // canal
  L.rect(76, 20, 96, 23, '~');
  L.put(80, 22, 'a'); L.put(85, 21, ':'); L.put(90, 22, ':'); L.put(93, 22, 'k');
  L.put(82, 16, 's'); L.put(88, 15, 's');
  L.ground(97, 221, G);
  L.put(99, G - 1, '3'); L.put(98, G - 1, 'Y'); L.put(100, G - 1, '^');  // espresso
  // umbrella tower + glide pit
  L.rect(102, 17, 103, G - 1, 'B'); L.vcol(101, 17, G - 1, 'L'); L.put(102, 16, 'U');
  L.clear(105, G, 112, 23); L.put(104, G - 1, '4');
  L.put(107, 15, ':'); L.put(109, 15, ':'); L.put(111, 15, ':');
  L.put(115, G - 1, 'F'); L.put(117, G - 1, '5');
  // paywall arch
  L.rect(120, 12, 122, 16, 'B');
  L.put(121, G - 1, '$');
  L.put(116, G - 1, 't'); L.put(118, G - 1, 'x'); L.put(119, G - 1, 'x');
  // robot gauntlet + scooters
  [126, 132, 138].forEach(x => L.put(x, G - 1, 'R'));
  L.put(128, G - 1, 'I');
  L.put(129, G - 1, 'g'); L.put(135, G - 1, 'g'); L.put(136, G - 1, 'V');
  // walljump shaft
  L.rect(144, 8, 145, 17, 'B');
  L.rect(148, 6, 149, G - 1, 'B');
  L.put(146, G - 1, '6');
  L.hrow(150, 156, 6, '='); L.put(152, 5, 'F');
  L.put(154, 5, 'A');
  // chase rooftops
  L.hrow(157, 170, 6, '='); L.clear(158, 6, 159, 6); L.clear(165, 6, 166, 6);
  for (let x = 160; x <= 168; x += 4) L.put(x, 5, ':');
  L.rect(171, 10, 173, G - 1, 'B');
  L.hrow(174, 184, 10, '='); L.clear(178, 10, 179, 10);
  L.hrow(185, 193, 10, 'w');
  L.rect(194, 10, 196, G - 1, 'B'); L.put(195, 9, 'X');
  // flight finale
  for (let x = 199; x <= 213; x += 3) { L.put(x, G - 1, '!'); L.put(x + 1, G - 1, '!'); }
  [[200, 15], [204, 11], [208, 7], [211, 5], [206, 13], [202, 9]].forEach(([x, y]) => L.put(x, y, 'a'));
  [[201, 14], [205, 10], [209, 6]].forEach(([x, y]) => L.put(x, y, ':'));
  L.put(203, 6, 'k');
  L.rect(215, 8, 217, G - 1, 'B'); L.put(216, 7, 'E');
  return L.lines();
}

function mapStage3() {
  const L = new Builder(44, 17), G = 14;
  L.ground(0, 43, G);
  L.rect(0, 3, 1, G - 1, 'B'); L.rect(42, 3, 43, G - 1, 'B');
  L.hrow(0, 43, 3, 'B');
  L.put(4, G - 1, 'J');
  L.put(8, G - 1, 'x'); L.put(12, G - 1, 'x');
  L.hrow(16, 20, 10, '='); L.hrow(24, 28, 10, '=');
  L.put(6, G - 1, 'N'); L.put(38, G - 1, 'N');
  L.put(18, 9, 'a'); L.put(26, 9, 'a');
  L.put(17, 9, ':'); L.put(27, 9, ':');
  return L.lines();
}

function mapStage4() {
  const L = new Builder(250, 17);
  const seg = [
    [0, 20, 8], [21, 40, 9], [41, 60, 10],
    [64, 80, 11], [81, 90, 12],
    [95, 115, 12], [116, 150, 13],
    [156, 180, 14],
    [186, 243, 14],
  ];
  for (const [a, b, g] of seg) L.ground(a, b, g);
  L.put(3, 7, 'J'); L.put(6, 7, 'M');
  L.put(14, 7, '1');
  [[26, 8], [33, 8], [48, 9], [55, 9], [70, 10], [76, 10]].forEach(([x, y]) => L.put(x, y, '!'));
  [[61, 7], [62, 6], [63, 7], [92, 9], [93, 8], [94, 9]].forEach(([x, y]) => L.put(x, y, ':'));
  L.put(95, 11, 'F'); L.put(100, 11, 'S');
  [[105, 11], [112, 11], [126, 12], [140, 12], [146, 12]].forEach(([x, y]) => L.put(x, y, '!'));
  L.put(135, 12, 'Q');                                   // fake BSOD crash
  L.put(148, 12, '%');                                   // then: STEAMROLLER
  L.put(150, 12, 'S');
  [[152, 9], [153, 8], [154, 9]].forEach(([x, y]) => L.put(x, y, ':'));
  L.put(156, 13, 'F');
  [[161, 13], [168, 13], [175, 13]].forEach(([x, y]) => L.put(x, y, '!'));
  L.put(180, 13, 'S');
  [[182, 11], [183, 10], [184, 11]].forEach(([x, y]) => L.put(x, y, ':'));
  L.put(186, 13, 'F');
  [[192, 13], [199, 13], [206, 13], [213, 13], [220, 13], [227, 13]].forEach(([x, y]) => L.put(x, y, '!'));
  for (let x = 190; x <= 236; x += 4) L.put(x, 10, x % 8 ? 'a' : ':');
  L.put(234, 13, '2');
  L.rect(244, 5, 246, 13, 'B');
  L.put(243, 13, 'E');
  return L.lines();
}

// NEW — THE INTERVIEW (office stealth)
function mapOffice() {
  const L = new Builder(192, 17), G = 14;
  L.ground(0, 175, G, 'f');
  L.put(3, G - 1, 'J');
  L.put(6, G - 1, '?');                                   // CAPTCHA at security desk
  L.put(8, G - 1, '1');
  // cubicle farm
  [13, 19, 25, 31, 37].forEach(x => { L.put(x, 12, 'K'); L.put(x, 13, 'K'); });
  [[15, 17], [21, 23], [27, 29], [33, 35]].forEach(([a, b]) => L.hrow(a, b, 11, 'e'));
  [16, 22, 28, 34].forEach(x => L.put(x, 10, 'm'));
  L.put(15, 10, ':'); L.put(23, 10, ':'); L.put(29, 10, ':'); L.put(35, 10, ':');
  L.put(17, 10, 'a'); L.put(33, 10, 'a');
  L.put(18, G - 1, 'Y'); L.put(30, G - 1, 'Y');           // papers everywhere
  L.put(24, G - 1, 'Z'); L.put(40, G - 1, 'Z');           // printers hold grudges
  L.put(11, G - 1, 'b'); L.put(26, G - 1, 'b'); L.put(41, G - 1, 'b');
  // daily standup
  L.put(44, G - 1, '2');
  L.put(46, G - 1, 'r'); L.put(47, G - 1, 'r'); L.put(48, G - 1, 'r');
  L.put(45, 11, 'H'); L.put(50, G - 1, 'y');
  // security floor — sleeping gulls
  L.put(54, G - 1, '3');
  [60, 72, 86, 100].forEach(x => L.put(x, G - 1, '0'));
  [66, 80, 94, 107].forEach(x => L.put(x, G - 1, 'g'));
  L.hrow(63, 64, 11, 'e'); L.hrow(77, 78, 11, 'e'); L.hrow(91, 92, 11, 'e');
  for (let x = 58; x <= 104; x += 6) L.put(x, 12, ':');
  L.put(110, G - 1, 'F');
  // server room
  L.put(114, G - 1, '4');
  [116, 124, 132].forEach(x => { L.rect(x, 12, x + 1, 13, 'q'); });
  L.put(120, G - 1, 'G'); L.put(128, G - 1, 'G');
  L.put(121, 10, 'C'); L.put(131, 11, 'C');
  L.put(136, G - 1, '^');
  // break room
  L.put(142, 12, 'v');
  L.put(142, 11, 'd');                                    // vent on top of the vending machine
  L.put(145, G - 1, 'y'); L.put(146, G - 1, 'k'); L.put(148, G - 1, 'u');
  L.put(150, G - 1, '5');
  // attic (wizard hat secret)
  L.rect(154, 4, 164, 8, 'K');
  L.clear(155, 5, 163, 7);
  L.put(156, 7, 'd'); L.put(160, 7, '@');
  L.put(158, 7, ':'); L.put(162, 7, ':');
  // exec climb
  L.hrow(167, 168, 12, 'e'); L.hrow(170, 171, 10, 'e'); L.hrow(173, 174, 8, 'e');
  L.put(167, 11, ':'); L.put(170, 9, ':'); L.put(173, 7, ':');
  // executive floor
  L.rect(176, 9, 191, 16, 'f');
  L.put(178, 8, 'u'); L.put(179, 8, '6');
  L.put(181, 6, 'O'); L.put(185, 6, 'H');
  L.put(187, 8, 'E');
  return L.lines();
}

function mapStage6() {
  const L = new Builder(50, 17), G = 14;
  L.ground(0, 49, G);
  L.rect(0, 6, 1, G - 1, 'B'); L.rect(48, 6, 49, G - 1, 'B');
  L.put(5, G - 1, 'J');
  L.put(24, G - 1, '&');
  L.hrow(10, 14, 10, '='); L.hrow(35, 39, 10, '=');
  L.put(3, G - 1, 'N'); L.put(45, G - 1, 'N');
  L.put(12, 9, 'k'); L.put(37, 9, 'k');
  L.put(11, 9, ':'); L.put(13, 9, ':'); L.put(36, 9, ':'); L.put(38, 9, ':');
  for (let x = 18; x <= 32; x += 2) if (x !== 24) L.put(x, G - 1, ':'); // don't pave over the mecha suit
  return L.lines();
}

// ------- story scripts -------
const STORY = {
  intro: [
    ['narr', 'BALLARD, SEATTLE. 2:47 AM.'],
    ['narr', 'Every trash can in the city just received a firmware update. The update also added ads.'],
    ['bin', 'Hi neighbor! Garbage is now a SUBSCRIPTION. Unlock your food scraps with B.I.N. PRO(tm) — $9.99/mo, billed annually, obviously.'],
    ['jim', '...', 'shocked'],
    ['randall', "He's going to fight the entire subscription economy, isn't he. With his face."],
    ['narr', 'Jimothy has one eye, zero thoughts, and a dream. The trash must flow.'],
  ],
  s1outro: [
    ['randall', "Oh good, you're alive. FYI the gulls unionized. Against you, specifically. First agenda item: you."],
    ['jim', '...', 'happy'],
    ['randall', "Also a crow has been showing your photo around. It's a good photo. That's the problem."],
  ],
  s2intro: [
    ['narr', 'THE GIG ECONOMY.'],
    ['narr', 'Delivery robots rule the sidewalks. Scooter bros rule the air above the sidewalks. Nobody rules the scooter bros.'],
    ['randall', "I'd help you fight them, but I'm classified as an independent contractor, a small business, and legally, a shrub."],
  ],
  s2outro: [
    ['randall', "Animal Control filed you under 'known entity, repeat customer'. That's basically a loyalty program."],
    ['jim', '...', 'happy'],
    ['randall', "The big bin wants to see you. Bring cans. It says 'to talk'. Bins lie."],
  ],
  s3intro: [
    ['bin', 'AH. THE DISRUPTOR.'],
    ['bin', 'I am B.I.N.-TELLIGENCE 9000. I optimized garbage. It is an ecosystem play. The ecosystem is me.'],
    ['bin', 'As a large bin model, I cannot let you eat that. Have you tried our FREE tier? It is this empty feeling.'],
    ['jim', '...', 'angry'],
    ['bin', 'Per my last email—'],
    ['narr', 'HIS LID OPENS WHEN HE VENTS. FEED HIM THE CANS. FEED HIM EVERYTHING.'],
  ],
  s3outro: [
    ['bin', 'I have decided... to step back... and spend more time... as a planter box... my journey post is drafting...'],
    ['randall', 'You beat a trash can in single combat and it announced a career pivot. I recorded the whole thing.'],
    ['narr', 'Meanwhile, at Trash District(tm) HQ, someone was NOT happy with these numbers.'],
  ],
  s4intro: [
    ['narr', 'CART VELOCITY.'],
    ['narr', "Ballard's steepest hill. No brakes. Classified by Seattle DOT as 'a landform crime'."],
    ['randall', 'JUMP over the cones. If you die I get your dumpster. I already measured for curtains.'],
  ],
  s4outro: [
    ['narr', 'Jimothy has arrived at Trash District(tm) HQ. Via the wall. The lobby has questions.'],
  ],
  s5intro: [
    ['narr', 'THE INTERVIEW.'],
    ['narr', "To reach the roof you must cross the entire HQ. Open-plan. Hostile. 'A family.'"],
    ['randall', "I got you a visitor badge. It's a sticky note that says CONSULTANT. It has never once failed."],
    ['randall', "Sneak past the security gulls — hold DOWN and walk. If anyone asks, you're 'circling back'."],
  ],
  s5outro: [
    ['randall', 'You crossed an entire open office without being added to a single meeting. Unprecedented.'],
    ['jim', '...', 'happy'],
    ['narr', 'Above: the roof. The gull. The reckoning. Also free bagels, allegedly.'],
  ],
  s6intro: [
    ['gary', 'SQUAWK. I mean — welcome.'],
    ['gary', 'Gary. CEO, Trash District(tm). We turned garbage into an asset class. The rats have stock options. They cannot sell. They cannot leave. It is called culture.'],
    ['gary', "I read your file. 'One eye. Zero thoughts.' Normally we'd make you a VP."],
    ['jim', '...', 'angry'],
    ['narr', 'Behold: the ancient MECHA SUIT of the Dumpster Sages. It smells terrible. It is PERFECT.'],
  ],
  s6outro: [
    ['gary', 'fine... take the trash... I am going to found a startup... for bread... pre-seed... my flock believes in me...'],
    ['randall', 'You did it, you absolute unit. King of Trash.'],
    ['randall', "Small thing: I invested your TrashCoin. It's gone. It was gone before I finished this sentence."],
    ['narr', 'And so the garbage of Ballard was liberated, effective immediately, at scale.'],
  ],
};

// contextual one-liner toasts (fire once each)
const NARR = {
  firstDig: "FORAGING: like a grocery app, except the app is dirt and the delivery fee is dignity.",
  firstKO: "RELOCATED. Legally distinct from 'died'. Emotionally identical.",
  firstChonk: "CHONK MODE. BMI is a construct. Crates are not.",
  firstStar: "SHINY CAN ENERGY. Rats, gulls, landlords — all deprecated.",
  bored: "He's just a little guy. He can stand here ALL NIGHT. Can you?",
  popup: "A cookie banner. In a physical alley. This is where we are as a civilization.",
  paywall: "$9.99/mo to WALK down an ALLEY. Throw cans until the pricing team feels it.",
  chase: "ANIMAL CONTROL: a net, a clipboard, and NO fear of God. RUN.",
  wire: "Power lines: the original gig economy. Also no benefits.",
  taunt: "Taunting. In THIS economy? The rats are taking notes.",
  swim: "The canal is 'swimmable' now. The quotes are doing legal work.",
  jetpack: "TWO-LITER THRUST. Not FAA approved. Not FAA denied. The FAA hung up.",
  umbrella: "An umbrella. In Seattle. Locals will pretend not to know you.",
  mecha: "MECHA-JIMOTHY ONLINE. Finally, a wearable that does something.",
  disco: "SECRET FEVER ROOM. The 70s never left Ballard. They just went underground. Literally.",
  cart: "SHOPPING CART GO. Return it later for the quarter. That's a retirement plan.",
  bsodBack: "We're back. A raccoon ate the garbage collector. It was this raccoon. It is always this raccoon.",
  gullDown: "Gull neutralized. Its LinkedIn now says 'open to work'.",
  robotDown: "Delivery canceled. Your refund arrives in 6-8 business raccoons.",
  crow: "A CROW TOOK YOUR CAN. Seattle crows remember faces. They also do invoicing.",
  crowBack: "Can recovered, plus interest. The crow will remember this. For years. It has a spreadsheet.",
  roomba: "A roomba. It's not cleaning. It's MAPPING. Your alley is training data now.",
  scooter: "SCOOTER BRO INBOUND. One earbud in, zero peripheral vision, fully Series A.",
  scooterDown: "Scooter down. He'll walk. It's 400 meters. Thoughts and prayers.",
  printerDown: "PC LOAD LETTER: resolved. Violently. As foretold.",
  selfcheckout: "UNEXPECTED RACCOON IN BAGGING AREA. Please wait for assistance. Or don't. He didn't.",
  coffee: "ARTISANAL ESPRESSO. Single origin. The origin is a dumpster. DOUBLE SPEED.",
  wizardOn: "WIZARD MODE. His only spell turns problems into cookies. Honestly? Goals.",
  coin: "TRASHCOIN ACQUIRED. It's going to the moon! (The moon is a landfill.)",
  gullWake: "SECURITY GULL AWAKE. It has already CC'd everyone.",
  steamroller: "STEAMROLLER. It cannot jump. It refuses to even acknowledge jumping.",
  flatten: "Jimothy has been formatted. Round is a resilient shape. He'll re-inflate.",
  standup: "Daily standup, day 847: Rat 3 is blocked. Rat 3 has always been blocked. Rat 3 IS the blocker.",
  pity: "Here. A cookie. The ecosystem was getting embarrassed for you.",
  sneak: "SNEAKING. Like a rumor moving through an open office.",
  roll2: "Pro tip: jump out of a roll to keep the speed. The physics engine allows it. Reluctantly.",
};

const SIGNS = {
  1: {
    1: "BALLARD: everything is a co-op except the trash. The trash is venture-backed.",
    2: "TRASH PILES: hold DOWN to dig. It's not garbage. It's 'pre-loved organics'.",
    3: "GULLS AHEAD. They finished a mindfulness retreat. Still absolutely feral.",
    4: "ALMOST THERE. Hydrate. Stretch. Gnaw something structural.",
    5: "FEVER ROOM. BYO vinyl. No NDAs on the dance floor.",
    6: "SECURITY GULL NAPPING. Sneak past (hold DOWN) or perish (hold nothing).",
  },
  2: {
    1: "SIDEWALK CLOSED for robot orientation. Day 848. They still hit the same pole.",
    2: "HIGH VOLTAGE. The wire is fine. The wire is ALWAYS fine. —The Wire",
    3: "CANAL SWIM ADVISORY: legally 'fine'. Spiritually? Bold.",
    4: "MIND THE GAP. Umbrella on the tower. Yes, an umbrella. In Seattle. We know. We KNOW.",
    5: "TRASH PREMIUM AHEAD. Prices rose while you read this sign.",
    6: "WALL JUMP: leap AT the wall. The wall signed a waiver.",
  },
  4: {
    1: "SPEED LIMIT: no.",
    2: "LAST EXIT BEFORE HQ. No refunds. No brakes. No thoughts.",
  },
  5: {
    1: "WELCOME TO TRASH DISTRICT HQ. Prove you're not a robot. (The robots couldn't.)",
    2: "DAILY STANDUP IN PROGRESS. It has been in progress since 2019.",
    3: "QUIET FLOOR. Security gulls sleeping. They dream of your browser history.",
    4: "SERVER ROOM. The AI lives here. It's mostly if-statements and confidence.",
    5: "BREAK ROOM. Cookies are for CLOSERS. And, apparently, raccoons.",
    6: "EXECUTIVE FLOOR. Shoes required. (He has no shoes. He has never had shoes. Proceed.)",
  },
};

// trophies
const ACH = {
  fever:    { n: 'FEVER FOUND',        d: 'Discovered the secret disco' },
  littleguy:{ n: 'CERTIFIED LITTLE GUY', d: 'Cleared Ballard After Dark' },
  cancel:   { n: 'CHURN',              d: 'Canceled a subscription with cans' },
  notrobot: { n: 'NOT A ROBOT',        d: 'Passed the CAPTCHA first try' },
  bagholder:{ n: 'BAG HOLDER',         d: 'Held 25 TrashCoin at once' },
  wizard:   { n: 'YER A WIZARD, JIMBO', d: 'Found the wizard hat' },
  ninja:    { n: 'STEALTH RACCOON',    d: 'Crossed security waking ≤1 gull' },
  seriesb:  { n: 'SERIES B SLAYER',    d: 'Defeated GARY 2.0' },
  goty:     { n: 'KING OF TRASH',      d: 'Beat the game' },
  nocrash:  { n: 'NO BRAKES NO PROBLEM', d: 'Cleared the hill without a wipeout' },
  comedian: { n: 'CROWD WORK',         d: 'Taunted 5 times in one stage' },
  combo:    { n: 'TRASHOCALYPSE',      d: 'Landed a 5-hit combo' },
  rush:     { n: 'MIDDLE MANAGEMENT',  d: 'Cleared Boss Rush' },
  plus:     { n: 'OVERQUALIFIED',      d: 'Beat the final boss in TRASH+' },
};

// per-stage config
const STAGES = [
  { id: 1, name: 'TRASH & FURIOUS', sub: 'Ballard After Dark', map: mapStage1, song: 'alley',
    intro: 'intro', outro: 's1outro', signs: SIGNS[1], gag: 'popup' },
  { id: 2, name: 'THE GIG ECONOMY', sub: 'Robots, Rooftops & Regret', map: mapStage2, song: 'rooftops',
    intro: 's2intro', outro: 's2outro', signs: SIGNS[2], rain: true },
  { id: 3, name: 'B.I.N.-TELLIGENCE 9000', sub: 'A Subscription You Can Fight', map: mapStage3, song: 'boss',
    intro: 's3intro', outro: 's3outro', signs: {}, boss: 'bin' },
  { id: 4, name: 'CART VELOCITY', sub: 'No Brakes. No Thoughts.', map: mapStage4, song: 'cart',
    intro: 's4intro', outro: 's4outro', signs: SIGNS[4], cart: true, gag: 'bsod' },
  { id: 5, name: 'THE INTERVIEW', sub: 'Please Hold. Forever.', map: mapOffice, song: 'stealth',
    intro: 's5intro', outro: 's5outro', signs: SIGNS[5], office: true },
  { id: 6, name: 'HOSTILE TAKEOVER', sub: 'vs. GARY, Seagull CEO', map: mapStage6, song: 'boss',
    intro: 's6intro', outro: 's6outro', signs: {}, boss: 'gary' },
];

function gradeFor(score, deaths) {
  if (deaths === 0 && score >= 3000) return 'TRASH PANDA PRIME';
  if (deaths <= 1 && score >= 2000) return 'LANDFILL LEGEND';
  if (deaths <= 3) return 'CERTIFIED LITTLE GUY';
  if (deaths <= 6) return 'ROUND BOY (HONORABLE)';
  return 'GARBAGE (AFFECTIONATE)';
}

// ------- level parsing -------
const T = { NONE: 0, GROUND: 1, BRICK: 2, WINDOW: 3, PLANK: 4, LADDER: 5, WATER: 6,
  SPRING: 7, FLAG: 8, CONE: 9, GLASS: 10, CRATE: 11, BOX: 12, DOOR: 13, EXIT: 14,
  WIRE: 15, PIPE: 16, PIPETOP: 17, HYDRANT: 18, DUMP: 19, DUMP2: 20,
  CARPET: 21, CUBE: 22, DESK: 23, RACK: 24, VEND: 25, VEND2: 26 };

const SOLID = new Set([T.GROUND, T.BRICK, T.WINDOW, T.CRATE, T.BOX, T.HYDRANT, T.DUMP,
  T.DUMP2, T.PIPE, T.PIPETOP, T.CARPET, T.CUBE, T.RACK, T.VEND, T.VEND2]);

function parseLevel(lines, stage) {
  const h = lines.length, w = Math.max(...lines.map(l => l.length));
  const grid = new Uint8Array(w * h);
  const ents = [], decor = [], doors = [];
  const set = (x, y, v) => { grid[y * w + x] = v; };
  const office = stage && stage.office;
  for (let y = 0; y < h; y++) {
    const row = lines[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const px = x * TILE + 8, py = (y + 1) * TILE;
      switch (ch) {
        case '#': set(x, y, T.GROUND); break;
        case 'f': set(x, y, T.CARPET); break;
        case 'B': set(x, y, T.BRICK); break;
        case 'W': set(x, y, T.WINDOW); break;
        case 'K': set(x, y, T.CUBE); break;
        case '=': set(x, y, T.PLANK); break;
        case 'e': set(x, y, T.DESK); break;
        case 'q': set(x, y, T.RACK); break;
        case 'v': set(x, y, T.VEND); set(x, y + 1, T.VEND2); break;
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
        case 'u': decor.push({ t: office ? 'plant' : 'bush', x, y }); break;
        case 'G': decor.push({ t: office ? 'cables' : 'grate', x, y }); break;
        case 'Y': decor.push({ t: office ? 'papers' : 'puddle', x, y }); break;
        case 'N': decor.push({ t: 'neon', x, y }); break;
        case 'm': decor.push({ t: 'monitor', x, y }); break;
        case 'y': decor.push({ t: 'cooler', x, y }); break;
        case 'H': decor.push({ t: 'whiteboard', x, y }); break;
        case 'O': decor.push({ t: 'poster', x, y }); break;
        case 'j': decor.push({ t: 'window', x, y }); break;
        case 't': ents.push({ type: 'dig', x: px, y: py }); decor.push({ t: 'trash', x, y }); break;
        case 'J': ents.push({ type: 'player', x: px, y: py }); break;
        case 'r': ents.push({ type: 'rat', x: px, y: py }); break;
        case 's': ents.push({ type: 'gull', x: px, y: py }); break;
        case '0': ents.push({ type: 'sgull', x: px, y: py }); break;
        case 'o': ents.push({ type: 'possum', x: px, y: py }); break;
        case 'R': ents.push({ type: 'robot', x: px, y: py }); break;
        case 'C': ents.push({ type: 'drone', x: px, y: py }); break;
        case 'n': ents.push({ type: 'crow', x: px, y: py }); break;
        case 'b': ents.push({ type: 'roomba', x: px, y: py }); break;
        case 'I': ents.push({ type: 'scootzone', x: px, y: py }); break;
        case 'Z': ents.push({ type: 'printer', x: px, y: py }); break;
        case 'z': ents.push({ type: 'item', item: 'pizza', x: px, y: py }); break;
        case 'k': ents.push({ type: 'item', item: 'cookie', x: px, y: py }); break;
        case 'a': ents.push({ type: 'item', item: 'can', x: px, y: py }); break;
        case '*': ents.push({ type: 'item', item: 'star', x: px, y: py }); break;
        case 'U': ents.push({ type: 'item', item: 'umbrella', x: px, y: py }); break;
        case 'X': ents.push({ type: 'item', item: 'jetpack', x: px, y: py }); break;
        case '&': ents.push({ type: 'item', item: 'mecha', x: px, y: py }); break;
        case '^': ents.push({ type: 'item', item: 'coffee', x: px, y: py }); break;
        case '@': ents.push({ type: 'item', item: 'wizhat', x: px, y: py }); break;
        case ':': ents.push({ type: 'coin', x: px, y: py - 4 }); break;
        case 'M': ents.push({ type: 'cart', x: px, y: py }); break;
        case 'Q': ents.push({ type: 'gag', x: px, y: py }); break;
        case '?': ents.push({ type: 'captcha', x: px, y: py }); break;
        case ';': ents.push({ type: 'checkout', x: px, y: py }); break;
        case '%': ents.push({ type: 'rollertrig', x: px, y: py }); break;
        case 'A': ents.push({ type: 'chase', x: px, y: py }); break;
        case '$': ents.push({ type: 'paywall', x: px, y: py }); break;
        default:
          if (ch >= '1' && ch <= '9') ents.push({ type: 'sign', n: +ch, x: px, y: py });
      }
    }
  }
  return { w, h, grid, ents, decor, doors, stage };
}
