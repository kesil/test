# JIMOTHY: TRASH TALES — Director's Cut 🦝

A browser sidescroller starring **Jimothy**, the real short-spined raccoon of
Ballard, Seattle. One eye. Zero thoughts. Infinite trash.

Every trash can in the city just got a firmware update — garbage is now a
subscription. The update also added ads. Jimothy disagrees.

## Play

It's a static site — serve the folder and open it:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

**Deploy:** enable GitHub Pages on this branch (Settings → Pages → Deploy from
branch), or drop the folder on Netlify/Vercel/itch.io. No build step, no
dependencies.

## Controls

| Action | Keys |
|---|---|
| Move | Arrows / WASD |
| Jump (hold = higher · at walls = walljump · roll-jump keeps speed) | Z / Space / K |
| Attack (swipe) | X / J |
| Throw soda can | ▲ + X |
| Pounce (down-air) | ▼ + X in the air |
| Roll-dash | C / L / Shift |
| Sneak | hold ▼ while walking |
| Dig trash piles / crouch / drop through planks | ▼ |
| Climb ladders | ▲ / ▼ |
| Taunt (rats respect it) | T |
| Pause | Enter |
| Mute | M |

Touch controls appear automatically on mobile.

## The tour — six stages

1. **TRASH & FURIOUS** — Ballard after dark. Rats, dive-bombing gulls, a
   cookie-consent popup that pays out an actual cookie, a **can-stealing crow
   with a spreadsheet**, a self-checkout that detects an unexpected raccoon in
   the bagging area, CHONK MODE, power-line balancing, and a secret disco.
2. **THE GIG ECONOMY** — now with **rain** (it's Seattle). Delivery robots,
   e-scooter bros circling the block, rooftop planks, a canal swim, an
   umbrella glide, the **$9.99/mo alley paywall** (throw cans to cancel), a
   walljump shaft, an ANIMAL CONTROL chase, and a soda-bottle jetpack finale.
3. **B.I.N.-TELLIGENCE 9000** — boss fight vs. an AI subscription trash can.
   It monologues in product-speak, shoots Terms & Conditions, deploys
   **cookie-banner shields**, and at low HP starts vibe coding the level —
   gravity becomes deprecated.
4. **CART VELOCITY** — downhill shopping-cart autoscroller. Blue-screens
   halfway (press JUMP to un-crash), after which **GRADY THE STEAMROLLER**
   politely attempts your flattening.
5. **THE INTERVIEW** *(new)* — stealth through Trash District HQ: pass a
   **CAPTCHA** at security ("select all squares containing TRASH"), cross a
   cubicle farm of printer turrets and mapping roombas, sneak past the
   sleeping security gulls, survive the server room, and find the **wizard
   hat** in the break-room attic (its only spell turns problems into cookies).
6. **HOSTILE TAKEOVER** — mecha-suit showdown vs. **GARY, Seagull CEO**. When
   his HP runs out, he declines to die and pivots to **GARY 2.0 (NOW WITH
   AI)**. Then: the Throne of Refuse, disco credits, and your final grade.

## Systems

- **Combo meter** — chain kills for DOUBLE TRASH → TRASHOCALYPSE bonuses
- **12 Trash Trophies** (persisted) — from NOT A ROBOT to SERIES B SLAYER
- **TrashCoin** — collect them all; value at every results screen: $0.00
- **Stealth** — noise wakes security gulls (running, jumping, landing, glass);
  sneaking muffles you
- **Pity cookies** — dig while at low health; the ecosystem gets embarrassed for you
- Hit-stop, screenshake, ghost respawns, iris wipes, pause tips, WebAudio
  chiptunes (7 tracks), stage select + best scores, mobile touch controls

Dev params: `?stage=N` jump to a stage, `?skip=1` skip story, `?god=1`
invincible sightseeing, `?mute=1`.

## Code layout

```
index.html        canvas + touch UI shell
js/core.js        boot, input, assets, atlas/anim, WebAudio synth + songs
js/world.js       level builder + 6 stage maps, story, jokes, trophies
js/game.js        physics, player, enemies, bosses, gags, stealth, combat
js/main.js        game flow, rendering, HUD, screens, rain, CAPTCHA UI, loop
assets/           sprite sheets + atlases (v5 core, v6 expansion, extra + extra2
                  bosses/enemies, alley + office tilesets, title card)
generators/       Python/Pillow scripts that generated every asset
```

All art is procedurally generated in a consistent kit style — regenerate or
extend via `generators/jimothy_extra.py` (bosses/gags), `generators/jimothy_v7.py`
(Director's Cut enemies + office tileset), or the original v5/v6/world scripts.
`DESIGN.md` documents the sprite kit and the art law (Jimothy is ONE fuzzy
mound; do not violate).

## Testing

Headless Playwright playtests drive `window.JIM` (live game state) through
every stage, boss, gag, and trophy — 28 mechanics checks including the full
title → victory clear. Serve the folder, open with Chromium, and everything is
reachable via `?stage=N&skip=1`.
