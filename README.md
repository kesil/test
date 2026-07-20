# JIMOTHY: TRASH TALES 🦝

A browser sidescroller starring **Jimothy**, the real short-spined raccoon of
Ballard, Seattle. One eye. Zero thoughts. Infinite trash.

Every trash can in the city just got a firmware update — garbage is now a
subscription. Jimothy disagrees.

## Play

It's a static site — open `index.html` over any web server:

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
| Jump (hold = higher, at walls = walljump) | Z / Space / K |
| Attack (swipe) | X / J |
| Throw soda can | Hold ▲ + X |
| Roll-dash | C / L / Shift |
| Dig trash piles / crouch / drop through planks | ▼ |
| Climb ladders | ▲ / ▼ |
| Taunt (rats respect it) | T |
| Mute | M |

Touch controls appear automatically on mobile.

## The tour

1. **TRASH & FURIOUS** — Ballard after dark. Rats, dive-bombing gulls, a
   cookie-consent popup that pays out an actual cookie, pizza-powered CHONK
   MODE, a power-line balance act, and a secret disco behind a door.
2. **THE GIG ECONOMY** — delivery robots, rooftop planks, a canal swim, an
   umbrella glide, a **$9.99/mo alley paywall** (throw cans to cancel), a
   walljump shaft, an ANIMAL CONTROL chase, and a soda-bottle jetpack finale.
3. **B.I.N.-TELLIGENCE 9000** — boss fight vs. an AI subscription trash can.
   It monologues in product-speak, shoots Terms & Conditions, and at low HP
   starts *vibe coding the level* — gravity becomes deprecated.
4. **CART VELOCITY** — downhill shopping-cart autoscroller. May or may not
   blue-screen halfway. (Press JUMP to un-crash.)
5. **HOSTILE TAKEOVER** — mecha-suit showdown vs. **GARY, Seagull CEO** of
   the Trash District™: sourdough bombs, gull interns, cold-brew projectiles,
   and a vulnerable window whenever he lands to check his phone.

Then: the Throne of Refuse, disco credits, and a final grade
("CERTIFIED LITTLE GUY" and up).

Tips: dig every trash pile, stomp works, `?stage=3` jumps to a stage,
`?god=1` for invincible sightseeing, progress and mute persist in
localStorage.

## Code layout

```
index.html        canvas + touch UI shell
js/core.js        boot, input, asset loader, atlas/anim helpers, WebAudio synth + chip songs
js/world.js       level builder + 5 stage maps, story scripts, jokes, tile legend
js/game.js        physics, player, enemies, bosses, gags, projectiles
js/main.js        game flow, rendering, HUD, title/results/victory screens, main loop
assets/           sprite sheets + atlas JSONs (v5 core, v6 expansion, extra bosses, tiles, title)
generators/       Python/Pillow scripts that generated every asset (see DESIGN.md)
```

All art is procedurally generated — regenerate or extend with
`python3 generators/jimothy_extra.py` (bosses/gags sheet) or the v5/v6/world
scripts from the original kit. `DESIGN.md` documents the sprite kit and the
art law (Jimothy is ONE fuzzy mound; do not violate).

## Testing

Headless playtests live outside the repo pattern but are trivial to rerun:
serve the folder, open with Playwright/Chromium, and drive `window.JIM`
(game state) — every stage, boss, and gag is reachable via `?stage=N&skip=1`.
