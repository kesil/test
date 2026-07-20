"""
Jimothy v6 — surprise & world expansion. Adds to the v5 kit:
TRANSFORMATIONS: mecha, wizard, ninja-dash, king-of-trash, ghost, chonk,
                 star-power (gold flash run), jetpack, balloon, umbrella, disco,
                 shopping-cart ride.
PHYSICS COMEDY:  skeleton-zap (electrocution x-ray), frozen (ice block),
                 on-fire panic run, paper-flat, hit-flash silhouette.
EXTRA VERBS:     crouch, look up/down, wall-jump, tightrope balance, pickup,
                 inspect (?), underwater dive.
WORLD:           critters (rat, seagull, possum, animal-control legs),
                 emote portraits x4, speech bubbles x4, splash/confetti/hitspark FX.
Separate builders: 16px Ballard tileset + title card (in jimothy_v6_world.py-style
functions here).
"""
from jimothy_v5 import *   # v4 anatomy + v5 items/fx/ui + constants
from PIL import Image, ImageDraw
import math, os, json

# extra palette
ICE2   = (190, 220, 240, 200)
ICE1   = (150, 190, 225, 230)
ICE0   = (110, 150, 195, 255)
FIRE2  = (250, 220, 120, 255)
FIRE1  = (240, 150, 70, 255)
FIRE0  = (200, 80, 50, 255)
SMOKE  = (120, 116, 128, 180)
GOLD2  = (250, 230, 140, 255)
GOLD1  = (230, 190, 80, 255)
GOLD0  = (170, 130, 50, 255)
CYAN   = (120, 230, 240, 255)
NAVY   = (60, 66, 92, 255)
REDC   = (200, 70, 70, 255)
TEALC  = (80, 190, 180, 255)
YELC   = (235, 210, 100, 255)
PURP   = (150, 100, 190, 255)
CAPE   = (170, 60, 70, 255)
CAPE_D = (120, 40, 52, 255)
BONEC  = (240, 238, 230, 255)
WING   = (238, 238, 242, 255)
BEAK   = (230, 180, 80, 255)
POSSUM = (210, 205, 210, 255)

def ghostify(img, alpha=150):
    r, g, b, a = img.split()
    a = a.point(lambda v: min(v, alpha) if v else 0)
    out = Image.merge("RGBA", (r, g, b, a))
    return out

def remap(img, table):
    src = img.load()
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dst = out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            p = src[x, y]
            dst[x, y] = table.get(p, p)
    return out

# ---------------- TRANSFORMATIONS ----------------

def f_mecha(i):
    """Power-armor Jimothy: plating, cyan visor, antenna ears, hover jets."""
    img, d = new_frame()
    hover = i >= 2
    dy = 0 if not hover else -6 - (i % 2)
    air = 0 if not hover else 2
    cy = MCY + dy + (i % 2 if not hover else 0)
    draw_shadow(d, MCX + 2, 21, air=air)
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] + dy, sway=i % 2)
    if not hover:
        limbs_far(d, 0, "stand", dy=dy)
    draw_mound(d, MCX, cy, rx=19, ry=15, seed=200 + i, arch=1.0)
    # armor plating
    d.arc((MCX - 20, cy - 16, MCX + 20, cy + 14), 200, 340, fill=METAL2, width=3)
    d.arc((MCX - 18, cy - 13, MCX + 18, cy + 12), 210, 330, fill=METAL1, width=2)
    d.ellipse((MCX - 8, cy + 2, MCX + 10, cy + 12), outline=METAL0, width=1)
    d.ellipse((MCX - 6, cy + 4, MCX + 8, cy + 11), fill=METAL1)
    d.line((MCX - 4, cy + 6, MCX + 6, cy + 6), fill=METAL2)
    for rx0 in (-14, -6, 2, 10):
        px(d, MCX + rx0, cy - 12, METAL0)      # rivets
    # antenna ears
    for ex in (MCX - 8, MCX + 6):
        d.line((ex, cy - 16, ex + 2, cy - 22), fill=METAL0)
        px(d, ex + 2, cy - 23, CYAN)
        if i % 2:
            px(d, ex + 3, cy - 24, (CYAN[0], CYAN[1], CYAN[2], 150))
    if not hover:
        limbs_near(d, 0, "stand", dy=dy)
    else:
        limbs_near(d, 0, "tuck", dy=dy)
    # visor over the eye zone
    d.rectangle((EYE_XY[0] - 6, EYE_XY[1] + dy - 3, EYE_XY[0] + 8, EYE_XY[1] + dy + 3), fill=OUT)
    d.rectangle((EYE_XY[0] - 5, EYE_XY[1] + dy - 2, EYE_XY[0] + 7, EYE_XY[1] + dy + 2), fill=CYAN)
    px(d, EYE_XY[0] + (i % 2) * 3 - 1, EYE_XY[1] + dy, OUT)   # scanning pupil
    d.line((EYE_XY[0] - 5, EYE_XY[1] + dy - 2, EYE_XY[0] + 7, EYE_XY[1] + dy - 2), fill=SHINE)
    draw_snout(d, SNT_XY[0], SNT_XY[1] + dy)
    if hover:
        # hover jets
        for jx in (MCX - 8, MCX + 8):
            fl = 4 + (i % 2) * 3
            d.polygon([(jx - 2, cy + 15), (jx + 2, cy + 15), (jx, cy + 15 + fl)], fill=FIRE1)
            d.polygon([(jx - 1, cy + 15), (jx + 1, cy + 15), (jx, cy + 13 + fl)], fill=FIRE2)
        for k in range(3):
            px(d, MCX - 12 + k * 12, cy + 22 + (hsh(i, k) % 3), SMOKE)
    return img

def f_wizard(i):
    """Trash wizard: cone hat, spark cast, poof."""
    img, d = new_frame()
    if i == 0:
        cy = scene(d, dy=1, seed=210, gait="stand", expr="normal", sway=1, face=True)
    elif i == 1:
        cy = scene(d, dy=0, seed=211, gait="stand", expr="alarmed", mouth="open", sway=2, face=True)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 62, 22, OUT, "front", planted=False, splay=2)
        for k, (sx, sy) in enumerate(((64, 16), (68, 20), (66, 12), (61, 14))):
            fx_sparkle(d, sx, sy, k % 2)
    else:
        cy = scene(d, dy=1, seed=212, gait="stand", expr="blink", sway=0, face=True)
        for k in range(6):
            a = k * math.pi / 3
            px(d, 62 + math.cos(a) * 7, 20 + math.sin(a) * 7, PURP)
            px(d, 62 + math.cos(a) * 10, 20 + math.sin(a) * 10, (PURP[0], PURP[1], PURP[2], 140))
    # hat on the crest
    hx, hy = MCX + 2, MCY - 15 + (1 if i == 2 else 0)
    d.polygon([(hx - 9, hy), (hx + 1, hy - 15), (hx + 9, hy)], fill=OUT)
    d.polygon([(hx - 8, hy - 1), (hx + 1, hy - 14), (hx + 8, hy - 1)], fill=PURP)
    d.ellipse((hx - 11, hy - 2, hx + 11, hy + 3), fill=OUT)
    d.ellipse((hx - 10, hy - 1, hx + 10, hy + 2), fill=PURP)
    px(d, hx - 2, hy - 6, GOLD2); px(d, hx + 3, hy - 9, GOLD2)
    px(d, hx, hy - 12, GOLD2)
    d.line((hx - 6, hy - 3, hx + 6, hy - 3), fill=GOLD1)   # hat band
    return img

def f_ninja(i):
    """Ninja dash: headband, lunge with baked afterimages."""
    img, d = new_frame()
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(base)
    # core pose: horizontal lunge
    lean = 7 + i * 2
    cy = MCY - 1
    draw_shadow(d, MCX + lean, 20, air=1)
    draw_tail(bd, 22, TAIL_XY[1] - 2, sway=3)
    draw_mound(bd, MCX + lean - 2, cy, rx=21, ry=12, seed=220 + i, arch=0.6)
    draw_ears(bd, MCX + lean - 2, cy, 12, 0.6, perk=-2)
    limb(bd, FRONT_HIP[0] + lean, FRONT_HIP[1] - 6, 70, 36, OUT, "front", planted=False, splay=2)
    limb(bd, HIND_HIP[0] + lean, HIND_HIP[1] - 6, 26, 48, OUT, "hind", planted=False)
    draw_face(bd, EYE_XY[0] + lean - 2, EYE_XY[1] - 2, expr="alarmed")
    draw_snout(bd, SNT_XY[0] + lean - 2, SNT_XY[1] - 2)
    # headband + trailing tails
    d2 = bd
    d2.rectangle((EYE_XY[0] + lean - 8, EYE_XY[1] - 8, EYE_XY[0] + lean + 6, EYE_XY[1] - 5), fill=REDC)
    d2.line((EYE_XY[0] + lean - 8, EYE_XY[1] - 7, EYE_XY[0] + lean - 18, EYE_XY[1] - 9 + i), fill=REDC)
    d2.line((EYE_XY[0] + lean - 8, EYE_XY[1] - 6, EYE_XY[0] + lean - 16, EYE_XY[1] - 2 + i), fill=CAPE_D)
    # afterimages behind
    for k, (ox, al) in enumerate(((-3, 90), (-6, 45))):
        gi = ghostify(base, al)
        img.alpha_composite(gi, (ox, 0))
    img.alpha_composite(base, (0, 0))
    # speed lines
    dd = ImageDraw.Draw(img)
    for yy in (cy - 6, cy + 2, cy + 8):
        dd.line((2, yy, 10 + i * 2, yy), fill=(FUR3[0], FUR3[1], FUR3[2], 150))
    return img

def f_king(i):
    """King of Trash: crown, cape, atop a small garbage mound."""
    img, d = new_frame()
    # trash pile base
    d.polygon([(14, GROUND), (26, GROUND - 10), (44, GROUND - 13), (60, GROUND - 8), (68, GROUND)], fill=OUT)
    d.polygon([(16, GROUND - 1), (27, GROUND - 9), (44, GROUND - 12), (58, GROUND - 8), (66, GROUND - 1)], fill=FUR0)
    item_can(d, 24, GROUND - 6)
    item_fishbone(d, 56, GROUND - 7)
    px(d, 36, GROUND - 12, CHEESE); px(d, 48, GROUND - 10, DIRT)
    cy = MCY - 8 + i
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] - 8 + i, sway=i)
    # cape draped behind
    d.polygon([(MCX - 16, cy - 8), (MCX - 22, GROUND - 10 + i), (MCX - 4, GROUND - 12), (MCX - 6, cy - 4)], fill=CAPE_D)
    d.polygon([(MCX - 15, cy - 8), (MCX - 20, GROUND - 11 + i), (MCX - 8, GROUND - 13)], fill=CAPE)
    draw_mound(d, MCX, cy, rx=18, ry=14, seed=230 + i, arch=1.0)
    draw_ears(d, MCX, cy, 14, 1.0, perk=1)
    limb(d, HIND_HIP[0], HIND_HIP[1] - 8 + i, 35, GROUND - 12, OUT, "hind", splay=2)
    limb(d, FRONT_HIP[0], FRONT_HIP[1] - 8 + i, 50, GROUND - 12, OUT, "front", splay=2)
    draw_face(d, EYE_XY[0], EYE_XY[1] - 8 + i, expr="normal")
    draw_snout(d, SNT_XY[0], SNT_XY[1] - 8 + i, mouth="pant" if i else "closed")
    # crown
    kx, ky = MCX + 3, cy - 16
    d.polygon([(kx - 7, ky), (kx - 7, ky - 6), (kx - 4, ky - 2), (kx - 1, ky - 7),
               (kx + 2, ky - 2), (kx + 5, ky - 6), (kx + 5, ky)], fill=GOLD1)
    d.rectangle((kx - 7, ky, kx + 5, ky + 2), fill=GOLD0)
    px(d, kx - 1, ky - 5, REDC); px(d, kx - 6, ky - 4, CYAN); px(d, kx + 4, ky - 4, CYAN)
    fx_sparkle(d, 66, 14 + i * 3, i % 2)
    return img

def f_ghost(t, n=4):
    """Respawn ghost: translucent, wisp tail, bobbing float."""
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    bob = int(round(math.sin(t / n * 2 * math.pi) * 3))
    cy = MCY - 6 + bob
    draw_mound(d, MCX, cy, rx=18, ry=14, seed=240 + t, arch=0.8)
    draw_ears(d, MCX, cy, 14, 0.8, perk=1)
    # wisp taper instead of legs
    d.polygon([(MCX - 14, cy + 8), (MCX + 12, cy + 10), (MCX + 4, cy + 20 - bob),
               (MCX - 2, cy + 14), (MCX - 8, cy + 19 - bob)], fill=FUR2)
    d.polygon([(MCX - 10, cy + 10), (MCX + 8, cy + 11), (MCX + 2, cy + 17 - bob)], fill=FUR3)
    draw_face(d, EYE_XY[0], EYE_XY[1] - 6 + bob, expr="worried")
    draw_snout(d, SNT_XY[0], SNT_XY[1] - 6 + bob)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    img.alpha_composite(ghostify(base, 140), (0, 0))
    dd = ImageDraw.Draw(img)
    # halo
    dd.ellipse((MCX - 8, cy - 24, MCX + 12, cy - 19), outline=GOLD2, width=1)
    for k in range(3):
        px(dd, MCX - 16 + k * 14, cy + 22 + (hsh(t, k) % 4), (FUR4[0], FUR4[1], FUR4[2], 120))
    return img

def f_chonk(t, n=4):
    """Mega-round powerup: over-inflated, tiny limbs, bounce cycle."""
    img, d = new_frame()
    ph = t / n
    bounce = int(round(abs(math.sin(ph * 2 * math.pi)) * 4))
    sq = 2 if bounce == 0 else -1
    cy = MCY - bounce + 2
    draw_shadow(d, MCX, 24 - bounce, air=1 if bounce > 2 else 0)
    draw_tail(d, TAIL_XY[0] - 3, TAIL_XY[1] - 2 - bounce, sway=1 if t % 2 else -1)
    draw_mound(d, MCX, cy, rx=24 + sq, ry=19 - sq, seed=250 + t, arch=0.6)
    draw_ears(d, MCX, cy, 19 - sq, 0.6, perk=0)
    # comically tiny limbs
    for x0, col in ((32, FUR0), (48, FUR0)):
        limb(d, x0, cy + 15, x0 - 1, cy + 20, col, "front", planted=False)
    for x0 in (36, 46):
        limb(d, x0, cy + 16, x0 + 1, cy + 21, OUT, "front", planted=False, splay=1)
    draw_face(d, EYE_XY[0] + 2, EYE_XY[1] - 2 - bounce + 2, expr="normal")
    draw_snout(d, SNT_XY[0] + 4, SNT_XY[1] - bounce, mouth="pant")
    # cheek blush of satisfaction
    px(d, EYE_XY[0] - 5, EYE_XY[1] + 4 - bounce + 2, PINK)
    px(d, EYE_XY[0] - 4, EYE_XY[1] + 4 - bounce + 2, PINK)
    if bounce == 0:
        for k in range(4):
            px(d, MCX - 20 + k * 13, GROUND - 1, WHITE1)
    return img

def f_starpower(i):
    """Invincibility: run poses remapped to gold, alternating white-hot flash."""
    base = f_run(i % 4)
    gold = {FUR4: GOLD2, FUR3: GOLD2, FUR2: GOLD1, FUR1: GOLD0, FUR0: GOLD0,
            MASK: GOLD1, MASKD: GOLD0, RING: GOLD0, RING_HL: GOLD1, LIMB: GOLD0}
    flash = {c: SHINE for c in (FUR4, FUR3, FUR2, MASK, RING_HL, LIMB)}
    flash.update({FUR1: GOLD2, FUR0: GOLD1, MASKD: GOLD2, RING: GOLD1})
    img = remap(base, gold if i % 2 == 0 else flash)
    d = ImageDraw.Draw(img)
    for k in range(3):
        fx_sparkle(d, 14 + hsh(i, k) % 52, 10 + hsh(k, i) % 40, k % 2)
    return img

def f_jetpack(i, n=4):
    """Soda-bottle rocket flight."""
    img, d = new_frame()
    bob = int(round(math.sin(i / n * 2 * math.pi) * 2))
    cy = MCY - 8 + bob
    draw_shadow(d, MCX, 16, air=2)
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] - 6 + bob, sway=2)
    # bottle on the back (behind mound)
    bx, by = MCX - 16, cy - 2
    d.polygon([(bx - 4, by - 8), (bx + 4, by - 8), (bx + 5, by + 8), (bx - 5, by + 8)], fill=OUT)
    d.polygon([(bx - 3, by - 7), (bx + 3, by - 7), (bx + 4, by + 7), (bx - 4, by + 7)], fill=TEALC)
    d.rectangle((bx - 2, by - 10, bx + 2, by - 8), fill=METAL1)
    d.line((bx - 2, by - 5, bx - 2, by + 5), fill=SHINE)
    d.rectangle((bx - 4, by - 1, bx + 4, by + 2), fill=WHITE2)   # label
    draw_mound(d, MCX, cy, rx=19, ry=14, seed=260 + i, arch=0.9)
    draw_ears(d, MCX, cy, 14, 0.9, perk=-2)
    # strap
    d.arc((MCX - 16, cy - 12, MCX + 14, cy + 12), 140, 260, fill=CAPE_D, width=2)
    limbs_near(d, 0, "tuck", dy=cy - MCY)
    draw_face(d, EYE_XY[0], EYE_XY[1] - 8 + bob, expr="alarmed")
    draw_snout(d, SNT_XY[0], SNT_XY[1] - 8 + bob, mouth="open")
    # rocket flame
    fl = 6 + (i % 2) * 4
    d.polygon([(bx - 3, by + 9), (bx + 3, by + 9), (bx, by + 9 + fl)], fill=FIRE1)
    d.polygon([(bx - 1, by + 9), (bx + 1, by + 9), (bx, by + 7 + fl)], fill=FIRE2)
    px(d, bx - 1, by + 10 + fl, FIRE0)
    for k in range(4):
        px(d, bx - 2 + hsh(i, k) % 5, by + 12 + fl + k * 2, SMOKE)
    return img

def f_balloon(t, n=4):
    """Drifting with three balloons; body dangles relaxed."""
    img, d = new_frame()
    sway = int(round(math.sin(t / n * 2 * math.pi) * 2))
    cy = MCY + 2 - (t % 2)
    draw_shadow(d, MCX + sway, 14, air=2)
    # balloons
    bal = [(MCX + sway - 6, 12, REDC), (MCX + sway + 4, 9, TEALC), (MCX + sway + 12, 14, YELC)]
    for bxx, byy, c in bal:
        d.ellipse((bxx - 5, byy - 6, bxx + 5, byy + 6), fill=OUT)
        d.ellipse((bxx - 4, byy - 5, bxx + 4, byy + 5), fill=c)
        px(d, bxx - 2, byy - 3, SHINE); px(d, bxx - 1, byy - 3, SHINE)
        d.line((bxx, byy + 6, MCX + sway + 6, cy - 12), fill=OUT)
    draw_tail(d, TAIL_XY[0] + sway, TAIL_XY[1] + 4, sway=sway)
    draw_mound(d, MCX + sway, cy, rx=18, ry=14, seed=270 + t, arch=0.8)
    draw_ears(d, MCX + sway, cy, 14, 0.8, perk=1)
    # one arm up gripping strings; legs dangle
    limb(d, FRONT_HIP[0] + sway, FRONT_HIP[1] - 8, MCX + sway + 6, cy - 13, OUT, "front",
         planted=False, splay=2)
    limb(d, HIND_HIP[0] + sway, HIND_HIP[1], HIND_HIP[0] + sway - 2, GROUND - 4, OUT, "hind",
         planted=False)
    limb(d, HIND_HIP[0] + sway - 3, HIND_HIP[1], HIND_HIP[0] + sway - 6, GROUND - 6, FUR0, "hind",
         planted=False)
    draw_face(d, EYE_XY[0] + sway, EYE_XY[1] + 2 - (t % 2), expr="normal")
    draw_snout(d, SNT_XY[0] + sway, SNT_XY[1] + 2 - (t % 2))
    return img

def f_umbrella(i):
    """Poppins glide."""
    img, d = new_frame()
    tilt = i
    cy = MCY + 2
    draw_shadow(d, MCX, 15, air=2)
    # canopy
    ux, uy = MCX + 8 + tilt, 10
    d.chord((ux - 14, uy - 4, ux + 14, uy + 12), 180, 360, fill=OUT)
    d.chord((ux - 13, uy - 3, ux + 13, uy + 11), 180, 360, fill=REDC)
    for k in range(-2, 3):
        d.line((ux + k * 6, uy + 3, ux + k * 6, uy + 4), fill=CAPE_D)
    d.line((ux - 13, uy + 4, ux + 13, uy + 4), fill=CAPE_D)
    d.line((ux, uy + 4, ux, cy - 10), fill=OUT)
    px(d, ux, uy - 5, GOLD1)
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] + 3, sway=1 - i * 2)
    draw_mound(d, MCX, cy, rx=18, ry=14, seed=280 + i, arch=0.8)
    draw_ears(d, MCX, cy, 14, 0.8, perk=1)
    limb(d, FRONT_HIP[0], FRONT_HIP[1] - 8, ux, cy - 10, OUT, "front", planted=False, splay=2)
    limb(d, HIND_HIP[0], HIND_HIP[1], HIND_HIP[0] - 2 - i, GROUND - 6, OUT, "hind", planted=False)
    draw_face(d, EYE_XY[0], EYE_XY[1] + 2, expr="blink" if i else "normal")
    draw_snout(d, SNT_XY[0], SNT_XY[1] + 2)
    for k in range(3):
        px(d, 10 + k * 3, 30 + k * 4 + i, (FUR3[0], FUR3[1], FUR3[2], 120))
    return img

def f_disco(t):
    """Saturday-night poses: point up / point down-cross / hip left / hip right."""
    img, d = new_frame()
    hip = [0, 0, -2, 2][t]
    cy = MCY + 1
    draw_shadow(d, MCX + hip, 21)
    draw_tail(d, TAIL_XY[0] + hip, TAIL_XY[1], sway=[2, -2, 1, -1][t])
    limbs_far(d, 0, "stand", dy=1)
    draw_mound(d, MCX + hip, cy, rx=19, ry=15, seed=290 + t, arch=1.0 + 0.2 * (t % 2))
    draw_ears(d, MCX + hip, cy, 15, 1.0, perk=1)
    limbs_near(d, 0, "stand", dy=1)
    if t == 0:      # point up
        limb(d, FRONT_HIP[0] + hip, FRONT_HIP[1], 64, 12, OUT, "front", planted=False, splay=2)
    elif t == 1:    # point down-cross
        limb(d, FRONT_HIP[0] + hip, FRONT_HIP[1], 28, 52, OUT, "front", planted=False, splay=2)
    elif t == 2:
        limb(d, FRONT_HIP[0] + hip, FRONT_HIP[1], 60, 30, OUT, "front", planted=False, splay=2)
    else:
        limb(d, FRONT_HIP[0] + hip, FRONT_HIP[1], 58, 50, OUT, "front", planted=False, splay=2)
    draw_face(d, EYE_XY[0] + hip, EYE_XY[1] + 1, expr="blink" if t % 2 else "normal")
    draw_snout(d, SNT_XY[0] + hip, SNT_XY[1] + 1, mouth="pant")
    # disco sparkle corners
    for k, (sx, sy) in enumerate(((10, 10), (70, 8), (8, 44), (72, 40))):
        if (k + t) % 2:
            fx_sparkle(d, sx, sy, (k + t) % 2)
    return img

def f_cart(i, n=4):
    """Shopping-cart joyride."""
    img, d = new_frame()
    rat = (i % 2)
    cy = 30 + rat
    draw_shadow(d, 40, 24)
    # cart body (wire basket)
    d.polygon([(20, cy), (58, cy), (54, cy + 16), (24, cy + 16)], fill=OUT)
    d.polygon([(22, cy + 1), (56, cy + 1), (53, cy + 15), (25, cy + 15)], fill=(0, 0, 0, 0))
    for k in range(5):
        d.line((24 + k * 8, cy + 1, 26 + k * 7, cy + 15), fill=METAL1)
    for k in range(3):
        d.line((23 + k, cy + 3 + k * 5, 55 - k, cy + 3 + k * 5), fill=METAL1)
    d.line((20, cy, 58, cy), fill=METAL2)
    # handle
    d.line((58, cy, 66, cy - 8), fill=METAL2)
    d.line((66, cy - 8, 70, cy - 8), fill=METAL2)
    # wheels + spin spokes
    for wx in (27, 51):
        d.ellipse((wx - 5, GROUND - 9, wx + 5, GROUND + 1), fill=OUT)
        d.ellipse((wx - 3, GROUND - 7, wx + 3, GROUND - 1), fill=METAL1)
        a = (i * 45) % 180
        r = math.radians(a)
        d.line((wx - math.cos(r) * 3, GROUND - 4 - math.sin(r) * 3,
                wx + math.cos(r) * 3, GROUND - 4 + math.sin(r) * 3), fill=METAL2)
    # Jimothy hunkered in the basket (rear half hidden by wires -> draw between)
    draw_mound(d, 38, cy - 4 - rat, rx=16, ry=12, seed=300 + i, arch=0.8)
    draw_ears(d, 38, cy - 4 - rat, 12, 0.8, perk=-1 - rat)
    # paws gripping the rim
    limb(d, 46, cy - 2 - rat, 57, cy - 1, OUT, "front", planted=False, splay=2)
    draw_face(d, 50, cy - 6 - rat, expr="alarmed" if rat else "normal")
    draw_snout(d, 57, cy - 4 - rat, mouth="open")
    # wind + rattle marks
    for yy in (18, 26, 40):
        d.line((4, yy + rat, 12 + hsh(i, yy) % 4, yy + rat), fill=(FUR3[0], FUR3[1], FUR3[2], 140))
    px(d, 24, cy - 3 + rat * 2, FUR1); px(d, 54, cy - 4 - rat, FUR1)
    return img

# ---------------- PHYSICS COMEDY ----------------

def f_zap(i):
    """Electrocution: x-ray skeleton flash, then jittered normal + sparks."""
    img, d = new_frame()
    if i == 0:
        cy = MCY
        # white-hot silhouette
        draw_mound(d, MCX, cy, rx=19, ry=15, seed=310, arch=1.0)
        sil = remap(img, {FUR4: SHINE, FUR3: SHINE, FUR2: FIRE2, FUR1: FIRE2, FUR0: GOLD1, OUT: OUT})
        img.paste(sil, (0, 0))
        d = ImageDraw.Draw(img)
        # bones: spine curve, ribs, limb bones, skull blob
        d.arc((MCX - 14, cy - 12, MCX + 12, cy + 8), 200, 340, fill=OUT, width=2)
        for k in range(4):
            d.line((MCX - 8 + k * 6, cy - 6, MCX - 8 + k * 6, cy + 4), fill=OUT)
        d.ellipse((EYE_XY[0] - 4, EYE_XY[1] - 4, EYE_XY[0] + 6, EYE_XY[1] + 5), outline=OUT, width=2)
        px(d, EYE_XY[0], EYE_XY[1], OUT)
        for x0 in (34, 38, 46, 50):
            d.line((x0, cy + 10, x0 - 1, GROUND), fill=OUT)
        # tail bones
        for k in range(3):
            px(d, 24 - k * 3, 26 - k * 2, OUT); px(d, 23 - k * 3, 27 - k * 2, OUT)
        # lightning
        d.line((10, 6, 18, 16), fill=CYAN); d.line((18, 16, 12, 22), fill=CYAN)
        d.line((66, 8, 60, 18), fill=CYAN); d.line((60, 18, 68, 24), fill=CYAN)
    else:
        j = 1
        scene(d, dy=j, squash=1, seed=311, gait="stand", expr="dizzy", mouth="open",
              ear=3, sway=-2)
        for sx, sy in ((14, 18), (64, 14), (20, 44), (62, 40)):
            d.line((sx, sy, sx + 3, sy + 3), fill=CYAN)
            d.line((sx + 3, sy, sx, sy + 3), fill=CYAN)
        for k in range(4):
            px(d, 30 + k * 6, 8 + (hsh(1, k) % 3), SMOKE)
    return img

def f_frozen(i):
    """Ice block with a dimmed Jimothy inside; cracks on frame 2."""
    img, d = new_frame()
    inner = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    di = ImageDraw.Draw(inner)
    scene(di, dy=1 + i, squash=i, seed=320 + i, gait="stand", expr="worried", ear=-2, sway=i)
    dim = {FUR4: FUR3, FUR3: FUR2, FUR2: FUR1, FUR1: FUR0, WHITE2: FUR3, WHITE1: FUR2}
    inner = remap(inner, dim)
    img.alpha_composite(inner, (0, 0))
    d = ImageDraw.Draw(img)
    # ice block over
    d.polygon([(16, GROUND), (18, 12), (26, 6), (58, 8), (64, 16), (63, GROUND)], fill=ICE2)
    d.polygon([(18, GROUND - 1), (20, 13), (27, 8), (56, 9)], fill=ICE1)
    d.line((18, 12, 26, 6), fill=SHINE); d.line((26, 6, 58, 8), fill=SHINE)
    d.line((22, 16, 30, 10), fill=SHINE)
    for k in range(4):
        px(d, 20 + k * 12, GROUND - 4 - (hsh(k, 2) % 8), SHINE)
    d.polygon([(16, GROUND), (18, 12), (26, 6), (58, 8), (64, 16), (63, GROUND)],
              outline=ICE0)
    if i == 1:
        # cracks
        d.line((30, 12, 36, 24), fill=ICE0); d.line((36, 24, 32, 34), fill=ICE0)
        d.line((36, 24, 44, 28), fill=SHINE); d.line((44, 28, 41, 38), fill=ICE0)
        d.line((54, 14, 50, 26), fill=ICE0); d.line((50, 26, 55, 34), fill=SHINE)
        d.line((24, 30, 30, 40), fill=ICE0)
        px(d, 28, 10, SHINE); px(d, 55, 12, SHINE); px(d, 37, 25, SHINE); px(d, 51, 27, SHINE)
    # icicle drips under
    for k, xx in enumerate((24, 40, 56)):
        d.polygon([(xx - 1, GROUND), (xx + 1, GROUND), (xx, GROUND + 2 + k % 2 + i)], fill=ICE1)
    return img

def f_onfire(i, n=4):
    """Panic run, tail/back ablaze, smoke trail."""
    img = f_run([1, 4, 1, 4][i] % 6)   # grounded scramble poses
    d = ImageDraw.Draw(img)
    # flames along the back crest and tail
    for k in range(5):
        fx0 = 22 + k * 8 + (hsh(i, k) % 3)
        fy0 = 18 + (hsh(k, i) % 4)
        fl = 5 + (hsh(i, k * 7) % 4)
        d.polygon([(fx0 - 2, fy0 + 4), (fx0 + 2, fy0 + 4), (fx0, fy0 - fl)], fill=FIRE1)
        d.polygon([(fx0 - 1, fy0 + 4), (fx0 + 1, fy0 + 4), (fx0, fy0 - fl + 3)], fill=FIRE2)
        if k % 2 == 0:
            px(d, fx0, fy0 - fl - 1, FIRE0)
    for k in range(4):
        px(d, 8 + k * 4, 10 + (hsh(i, k) % 6), SMOKE)
    # panic overlay: bigger sweat + wide eye redraw
    px(d, 60, 16 + i % 2, SWEAT); px(d, 60, 17 + i % 2, SWEAT); px(d, 59, 17 + i % 2, SWEAT)
    return img

def f_flat(i):
    """Steamrolled paper-Jimothy, wobbling."""
    img, d = new_frame()
    w = 26 + i * 3
    cy = GROUND - 4
    draw_shadow(d, MCX + 2, 26)
    d.ellipse((MCX - w - 1, cy - 4, MCX + w + 1, cy + 4), fill=OUT)
    d.ellipse((MCX - w, cy - 3, MCX + w, cy + 3), fill=FUR2)
    d.ellipse((MCX - w + 3, cy - 2, MCX + 4, cy), fill=FUR3)
    # flattened face at the right end
    d.ellipse((MCX + w - 14, cy - 3, MCX + w - 2, cy + 3), fill=MASK)
    if i == 0:
        px(d, MCX + w - 9, cy - 1, EYE_W); px(d, MCX + w - 9, cy, OUT)
    else:
        d.line((MCX + w - 11, cy, MCX + w - 8, cy), fill=OUT)
    d.polygon([(MCX + w - 4, cy - 1), (MCX + w + 3, cy), (MCX + w - 4, cy + 2)], fill=WHITE2)
    px(d, MCX + w + 2, cy, NOSE)
    # flat ears + tail
    d.polygon([(MCX - 6, cy - 4), (MCX - 3, cy - 8 + i), (MCX, cy - 4)], fill=OUT)
    d.polygon([(MCX + 6, cy - 4), (MCX + 9, cy - 8 + (1 - i)), (MCX + 12, cy - 4)], fill=OUT)
    d.ellipse((MCX - w - 8, cy - 3 - i * 2, MCX - w, cy + 1 - i * 2), fill=RING)
    # limbs sticking out flat
    for x0 in (MCX - 12, MCX + 8):
        d.line((x0, cy + 4, x0 - 2, cy + 6), fill=OUT)
        draw_fingers(d, x0 - 2, cy + 6, OUT)
    px(d, MCX - 2, cy - 6 + i, FUR1)  # wobble tick
    return img

def f_hitflash():
    """Pure white silhouette of the stand pose (damage flash)."""
    base = f_idle(0)
    white = {}
    src = base.load()
    for y in range(H):
        for x in range(W):
            p = src[x, y]
            if p[3] > 0:
                white[p] = SHINE
    return remap(base, white)

# ---------------- EXTRA VERBS ----------------

def f_crouch(i):
    img, d = new_frame()
    scene(d, dy=5 + i, squash=3 + i, seed=330 + i, gait="stand", ear=-3,
          expr="normal" if i == 0 else "blink")
    return img

def f_look(i):
    """0 = look up, 1 = look down."""
    img, d = new_frame()
    if i == 0:
        cy = scene(d, dy=0, seed=335, gait="stand", ear=3, sway=1, face=False)
        draw_face(d, EYE_XY[0] - 2, EYE_XY[1] - 5, expr="normal")
        draw_snout(d, SNT_XY[0] - 1, SNT_XY[1] - 8)
    else:
        cy = scene(d, dy=2, seed=336, gait="stand", ear=0, sway=0, face=False)
        draw_face(d, EYE_XY[0] + 1, EYE_XY[1] + 8, expr="normal")
        draw_snout(d, SNT_XY[0], SNT_XY[1] + 11)
    return img

def f_walljump(i):
    """Kick-off from a wall at the right edge."""
    img, d = new_frame()
    lean = -2 - i * 2
    cy = MCY - 4
    draw_shadow(d, MCX - 4, 16, air=2)
    draw_tail(d, TAIL_XY[0] + lean - 2, TAIL_XY[1] + 2, sway=-2)
    draw_mound(d, MCX + lean, cy, rx=18, ry=14, seed=340 + i, arch=0.8)
    draw_ears(d, MCX + lean, cy, 14, 0.8, perk=1)
    # legs compressed against the wall
    limb(d, HIND_HIP[0] + lean + 6, HIND_HIP[1] - 6, 62, 40 - i * 3, OUT, "hind",
         planted=False, splay=2)
    limb(d, FRONT_HIP[0] + lean + 2, FRONT_HIP[1] - 8, 61, 30 - i * 3, OUT, "front",
         planted=False, splay=2)
    draw_face(d, EYE_XY[0] + lean - 4, EYE_XY[1] - 4, expr="alarmed")
    draw_snout(d, SNT_XY[0] + lean - 4, SNT_XY[1] - 4)
    # wall-dust
    for k in range(3 + i):
        px(d, 60 - hsh(i, k) % 3, 28 + k * 5, WHITE1)
    return img

def f_balance(i, n=4):
    """Tightrope wobble on a line at y=52; arms out."""
    img, d = new_frame()
    tilt = [0, 2, 0, -2][i]
    cy = MCY + 2
    # the line (game may redraw)
    d.line((1, 52, W - 2, 52), fill=FUR1)
    draw_tail(d, TAIL_XY[0] - tilt, TAIL_XY[1] + tilt, sway=tilt)
    draw_mound(d, MCX + tilt, cy, rx=18, ry=14, seed=345 + i, arch=1.0)
    draw_ears(d, MCX + tilt, cy, 14, 1.0, perk=1)
    # both feet on the line, together
    limb(d, HIND_HIP[0] + tilt, HIND_HIP[1], 39 + tilt, 52, OUT, "hind", splay=1)
    limb(d, FRONT_HIP[0] + tilt, FRONT_HIP[1], 45 + tilt, 52, OUT, "front", splay=1)
    # arms straight out for balance
    limb(d, FRONT_HIP[0] + tilt, FRONT_HIP[1] - 6, 68, 36 - tilt * 2, OUT, "front",
         planted=False, splay=2)
    limb(d, HIND_HIP[0] + tilt - 4, HIND_HIP[1] - 8, 12, 34 + tilt * 2, OUT, "front",
         planted=False, splay=2)
    draw_face(d, EYE_XY[0] + tilt, EYE_XY[1] + 2, expr="worried" if tilt else "normal")
    draw_snout(d, SNT_XY[0] + tilt, SNT_XY[1] + 2)
    return img

def f_pickup(i):
    """Bend and grab a cookie off the ground."""
    img, d = new_frame()
    if i == 0:
        cy = scene(d, dy=3, squash=2, seed=350, gait="stand", ear=0, expr="normal", face=False)
        draw_face(d, EYE_XY[0] + 1, EYE_XY[1] + 8, expr="normal")
        draw_snout(d, SNT_XY[0], SNT_XY[1] + 11)
        item_cookie(d, 64, GROUND - 5)
        limb(d, FRONT_HIP[0], FRONT_HIP[1] + 3, 60, GROUND - 4, OUT, "front",
             planted=False, splay=2)
    else:
        cy = scene(d, dy=0, seed=351, gait="stand", ear=1, expr="normal", mouth="pant", face=True)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 58, 30, OUT, "front", planted=False)
        item_cookie(d, 61, 26)
        fx_sparkle(d, 68, 20, 0)
    return img

def f_inspect(i):
    """Nose-boop lean with a '?' overhead."""
    img, d = new_frame()
    lean = 2 + i
    cy = scene(d, dy=1, seed=355 + i, gait="stand", ear=2, sway=1, face=False)
    draw_face(d, EYE_XY[0] + lean, EYE_XY[1] + 1, expr="alarmed" if i else "normal")
    draw_snout(d, SNT_XY[0] + lean + 1, SNT_XY[1] + 1)
    # question mark
    qx, qy = 64, 10 + i
    d.arc((qx - 4, qy - 2, qx + 4, qy + 6), 150, 60, fill=OUT, width=2)
    d.line((qx + 2, qy + 5, qx + 1, qy + 8), fill=OUT)
    px(d, qx + 1, qy + 11, OUT); px(d, qx, qy + 11, OUT)
    return img

def f_dive(i):
    """Underwater swim-down: body angled, bubbles rising."""
    img, d = new_frame()
    cy = MCY + i
    draw_tail(d, TAIL_XY[0] - 2, TAIL_XY[1] - 8 + i, sway=2)
    draw_mound(d, MCX, cy, rx=20, ry=13, seed=360 + i, arch=0.5)
    draw_ears(d, MCX, cy, 13, 0.5, perk=-2)
    # limbs sweep back
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + i, 30 - i * 2, 30, OUT, "front", planted=False)
    limb(d, HIND_HIP[0], HIND_HIP[1] + i, 22, 40 + i * 2, OUT, "hind", planted=False)
    # face angled down-forward
    draw_face(d, EYE_XY[0] + 1, EYE_XY[1] + 5 + i, expr="normal")
    draw_snout(d, SNT_XY[0] + 1, SNT_XY[1] + 8 + i)
    # bubbles rising
    for k in range(4):
        bx = 60 + hsh(i, k) % 8
        by = 30 - k * 6 - (i * 2)
        d.ellipse((bx - 1, by - 1, bx + 1, by + 1), outline=SHINE)
    return img

# ---------------- CRITTERS ----------------

def f_rat(i):
    img, d = new_frame()
    j = i % 2
    cx, cy = 40, 48 - j
    draw_shadow(d, cx, 12)
    d.line((cx - 10, cy + 4, cx - 20, cy - 4 + j * 5), fill=PINK)   # tail
    d.ellipse((cx - 10, cy - 5, cx + 8, cy + 6), fill=OUT)
    d.ellipse((cx - 9, cy - 4, cx + 7, cy + 5), fill=FUR1)
    d.ellipse((cx - 6, cy - 4, cx + 2, cy), fill=FUR2)
    d.ellipse((cx + 2, cy - 4, cx + 12, cy + 4), fill=OUT)
    d.ellipse((cx + 3, cy - 3, cx + 11, cy + 3), fill=FUR1)
    d.ellipse((cx + 4, cy - 6, cx + 8, cy - 2), fill=FUR1)   # ear
    px(d, cx + 5, cy - 4, PINK)
    px(d, cx + 9, cy - 1, EYE_W); px(d, cx + 10, cy, NOSE)
    px(d, cx + 12, cy + 1, PINK)
    for x0 in (cx - 5 + j * 2, cx + 2 - j * 2):
        d.line((x0, cy + 5, x0 - 1 + j, cy + 9), fill=OUT)
    return img

def f_gull(i):
    img, d = new_frame()
    j = i % 2
    cx, cy = 40, 32 - j * 2
    draw_shadow(d, cx, 10, air=2)
    # wings
    if j == 0:
        d.polygon([(cx - 4, cy - 2), (cx - 20, cy - 12), (cx - 6, cy - 5)], fill=OUT)
        d.polygon([(cx - 5, cy - 3), (cx - 18, cy - 11), (cx - 7, cy - 5)], fill=WING)
        d.polygon([(cx + 4, cy - 2), (cx + 18, cy - 12), (cx + 6, cy - 5)], fill=OUT)
        d.polygon([(cx + 5, cy - 3), (cx + 16, cy - 11), (cx + 7, cy - 5)], fill=WING)
    else:
        d.polygon([(cx - 4, cy), (cx - 19, cy + 7), (cx - 5, cy + 3)], fill=OUT)
        d.polygon([(cx - 5, cy + 1), (cx - 17, cy + 6), (cx - 6, cy + 3)], fill=WING)
        d.polygon([(cx + 4, cy), (cx + 17, cy + 7), (cx + 5, cy + 3)], fill=OUT)
        d.polygon([(cx + 5, cy + 1), (cx + 15, cy + 6), (cx + 6, cy + 3)], fill=WING)
    d.ellipse((cx - 7, cy - 4, cx + 9, cy + 6), fill=OUT)
    d.ellipse((cx - 6, cy - 3, cx + 8, cy + 5), fill=WING)
    d.ellipse((cx - 2, cy + 1, cx + 8, cy + 5), fill=FUR3)
    px(d, cx + 4, cy - 1, OUT)
    d.polygon([(cx + 8, cy), (cx + 13, cy + 1), (cx + 8, cy + 2)], fill=BEAK)
    return img

def f_possum(i):
    img, d = new_frame()
    j = i % 2
    cx, cy = 40, 46 - j
    draw_shadow(d, cx, 13)
    d.line((cx - 12, cy + 2, cx - 22, cy - 6 + j * 5), fill=PINK)
    d.ellipse((cx - 12, cy - 7, cx + 10, cy + 7), fill=OUT)
    d.ellipse((cx - 11, cy - 6, cx + 9, cy + 6), fill=POSSUM)
    d.ellipse((cx - 8, cy - 5, cx + 2, cy), fill=WHITE2)
    # pointy pale face
    d.polygon([(cx + 6, cy - 4), (cx + 18, cy + 1), (cx + 6, cy + 5)], fill=OUT)
    d.polygon([(cx + 6, cy - 3), (cx + 16, cy + 1), (cx + 6, cy + 4)], fill=WHITE2)
    px(d, cx + 16, cy + 1, PINK)
    px(d, cx + 9, cy - 1, OUT)
    d.ellipse((cx + 3, cy - 8, cx + 8, cy - 3), fill=OUT)
    d.ellipse((cx + 4, cy - 7, cx + 7, cy - 4), fill=PINK)
    for x0 in (cx - 6 + j * 2, cx + 2 - j * 2):
        d.line((x0, cy + 6, x0 - 1 + j, cy + 10), fill=PINK)
    return img

def f_control(i):
    """Animal Control: navy legs + boots + net pole (torso off-screen — he's HUGE)."""
    img, d = new_frame()
    j = i % 2
    draw_shadow(d, 40, 18)
    # legs from the top of the frame
    for lx, ph in ((30, j), (48, 1 - j)):
        step = 4 * ph
        d.rectangle((lx - 4, 0, lx + 4, GROUND - 10 - step), fill=NAVY)
        d.line((lx - 4, 0, lx - 4, GROUND - 10 - step), fill=OUT)
        d.line((lx + 4, 0, lx + 4, GROUND - 10 - step), fill=OUT)
        d.line((lx - 3, 20, lx - 3, GROUND - 14 - step), fill=(80, 88, 118, 255))
        # boot
        d.rectangle((lx - 5, GROUND - 10 - step, lx + 8, GROUND - step), fill=OUT)
        d.rectangle((lx - 4, GROUND - 9 - step, lx + 7, GROUND - 1 - step), fill=(52, 46, 60, 255))
        d.line((lx - 4, GROUND - 4 - step, lx + 7, GROUND - 4 - step), fill=METAL1)
    # net pole descending at the right
    d.line((66, 0, 62, 40 + j * 2), fill=METAL2)
    d.arc((54, 36 + j * 2, 70, 52 + j * 2), 300, 240, fill=METAL1)
    for k in range(3):
        d.line((56 + k * 4, 42 + j * 2, 58 + k * 4, 50 + j * 2), fill=WHITE1)
    return img

# ---------------- EMOTES / BUBBLES / FX ----------------

def _portrait_shell(d):
    d.rounded_rectangle((14, 6, 66, 58), radius=8, fill=OUT)
    d.rounded_rectangle((16, 8, 64, 56), radius=7, fill=FUR2)
    d.ellipse((18, 18, 62, 55), fill=FUR2)
    d.ellipse((20, 19, 56, 44), fill=FUR3)
    for ex in (26, 48):
        d.ellipse((ex - 6, 8, ex + 6, 20), fill=OUT)
        d.ellipse((ex - 5, 9, ex + 5, 19), fill=FUR2)
        d.ellipse((ex - 3, 11, ex + 3, 17), fill=PINK)
    d.ellipse((26, 24, 56, 48), fill=MASK)
    d.ellipse((30, 28, 52, 44), fill=MASKD)
    d.arc((28, 20, 54, 40), 200, 340, fill=WHITE2)

def f_emote(i):
    """Portrait variants: 0 happy, 1 sad, 2 angry, 3 shocked."""
    img, d = new_frame()
    _portrait_shell(d)
    if i == 0:
        d.arc((34, 32, 42, 40), 190, 350, fill=OUT, width=2)         # happy closed eye
        d.arc((44, 40, 56, 50), 20, 140, fill=OUT, width=2)          # smile
        px(d, 27, 42, PINK); px(d, 28, 42, PINK)
    elif i == 1:
        d.ellipse((34, 32, 42, 40), fill=OUT); px(d, 36, 34, EYE_W)
        d.line((33, 30, 43, 32), fill=OUT)                            # droop brow
        px(d, 34, 42, SWEAT); px(d, 34, 44, SWEAT); px(d, 33, 43, SWEAT)  # tear
        d.arc((46, 46, 56, 54), 200, 340, fill=OUT, width=2)          # frown
    elif i == 2:
        d.ellipse((34, 33, 42, 41), fill=OUT); px(d, 37, 35, EYE_W)
        d.line((32, 29, 44, 33), fill=OUT); d.line((32, 28, 44, 32), fill=OUT)  # angry brow
        d.line((46, 48, 56, 46), fill=OUT)
        for k in range(3):
            d.line((60 - k, 12 + k * 3, 63 - k, 12 + k * 3), fill=REDC)  # anger mark
    else:
        d.ellipse((32, 30, 44, 42), fill=EYE_W)
        d.ellipse((37, 35, 40, 38), fill=OUT)
        d.ellipse((47, 44, 54, 52), fill=OUT)                          # gasp mouth
        for sx, sy in ((22, 12), (58, 10)):
            d.line((sx - 2, sy, sx + 2, sy), fill=SHINE)
            d.line((sx, sy - 2, sx, sy + 2), fill=SHINE)
    # snout for non-shocked
    if i != 3:
        d.polygon([(48, 36), (62, 40), (50, 46)], fill=OUT)
        d.polygon([(49, 37), (59, 40), (50, 44)], fill=WHITE2)
        d.rectangle((58, 38, 61, 41), fill=NOSE)
    d.rounded_rectangle((14, 6, 66, 58), radius=8, outline=OUT, width=2)
    d.rounded_rectangle((16, 8, 64, 56), radius=7, outline=FUR4, width=1)
    return img

def f_bubble(i):
    """Speech bubbles: 0 '!', 1 '?', 2 heart, 3 Zzz."""
    img, d = new_frame()
    d.rounded_rectangle((22, 14, 58, 42), radius=9, fill=OUT)
    d.rounded_rectangle((24, 16, 56, 40), radius=8, fill=WHITE2)
    d.polygon([(30, 40), (26, 50), (38, 41)], fill=OUT)
    d.polygon([(31, 39), (28, 47), (36, 40)], fill=WHITE2)
    cx, cy = 40, 27
    if i == 0:
        d.rectangle((cx - 2, cy - 8, cx + 2, cy + 3), fill=OUT)
        d.rectangle((cx - 2, cy + 6, cx + 2, cy + 9), fill=OUT)
    elif i == 1:
        d.arc((cx - 6, cy - 9, cx + 6, cy + 2), 150, 60, fill=OUT, width=3)
        d.line((cx + 3, cy + 1, cx + 1, cy + 4), fill=OUT)
        d.rectangle((cx, cy + 7, cx + 2, cy + 9), fill=OUT)
    elif i == 2:
        ui_heart(d, cx, cy + 1, "full")
    else:
        for k, s in enumerate((7, 5, 3)):
            zx, zy = cx - 8 + k * 8, cy + 4 - k * 5
            d.line((zx, zy, zx + s, zy), fill=OUT)
            d.line((zx + s, zy, zx, zy + s), fill=OUT)
            d.line((zx, zy + s, zx + s, zy + s), fill=OUT)
    return img

def f_splash(i):
    img, d = new_frame()
    cy = 44
    d.line((10, cy, 70, cy), fill=(WHITE1[0], WHITE1[1], WHITE1[2], 150))
    if i == 0:
        d.ellipse((34, cy - 3, 46, cy + 3), outline=SHINE)
    elif i == 1:
        for k in range(6):
            a = math.pi + k * math.pi / 5
            x = 40 + math.cos(a) * 10
            y = cy + math.sin(a) * 9
            px(d, x, y, SHINE); px(d, x, y + 1, ICE1)
        d.ellipse((30, cy - 2, 50, cy + 3), outline=ICE1)
    else:
        for k in range(8):
            a = math.pi + k * math.pi / 7
            x = 40 + math.cos(a) * 16
            y = cy + math.sin(a) * 14
            px(d, x, y, ICE1)
        d.ellipse((24, cy - 2, 56, cy + 4), outline=(ICE1[0], ICE1[1], ICE1[2], 120))
    return img

def f_confetti(i):
    img, d = new_frame()
    cols = [REDC, TEALC, YELC, PURP, SHINE, GOLD1]
    for k in range(18):
        x = 8 + hsh(i, k) % 64
        y = 6 + hsh(k, i * 5) % 48 + i * 3
        c = cols[hsh(i * 3, k) % len(cols)]
        if hsh(k, i) % 2:
            d.line((x, y, x + 2, y + 1), fill=c)
        else:
            px(d, x, y, c); px(d, x, y + 1, c)
    return img

def f_hitspark(i):
    img, d = new_frame()
    cx, cy = 40, 32
    s = 6 + i * 5
    for a in range(0, 360, 45):
        r = math.radians(a)
        x2, y2 = cx + math.cos(r) * s, cy + math.sin(r) * s
        d.line((cx + math.cos(r) * (s - 5), cy + math.sin(r) * (s - 5), x2, y2),
               fill=SHINE if a % 90 == 0 else GOLD2)
    if i == 0:
        d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=SHINE)
    return img

# ================= build =================
ANIMS6 = [
    ("mecha",      lambda: [f_mecha(i) for i in range(4)],     160, True,  "power armor: idle 0-1, hover 2-3"),
    ("wizard",     lambda: [f_wizard(i) for i in range(3)],    180, False, "cast on frame 1"),
    ("ninja_dash", lambda: [f_ninja(i) for i in range(3)],      70, False, "baked afterimages"),
    ("king",       lambda: [f_king(i) for i in range(2)],      400, True,  "victory screen set piece"),
    ("ghost",      lambda: [f_ghost(t) for t in range(4)],     200, True,  "respawn float"),
    ("chonk",      lambda: [f_chonk(t) for t in range(4)],     160, True,  "over-fed powerup bounce"),
    ("star_power", lambda: [f_starpower(i) for i in range(4)], 80,  True,  "invincibility gold flash"),
    ("jetpack",    lambda: [f_jetpack(i) for i in range(4)],   120, True,  "soda-bottle rocket"),
    ("balloon",    lambda: [f_balloon(t) for t in range(4)],   240, True,  "slow drift descent"),
    ("umbrella",   lambda: [f_umbrella(i) for i in range(2)],  280, True,  "glide fall"),
    ("disco",      lambda: [f_disco(t) for t in range(4)],     200, True,  "dance minigame"),
    ("cart_ride",  lambda: [f_cart(i) for i in range(4)],      110, True,  "downhill vehicle"),
    ("zap",        lambda: [f_zap(i) for i in range(2)],        90, True,  "electrocution x-ray"),
    ("frozen",     lambda: [f_frozen(i) for i in range(2)],    350, False, "cracks on frame 1"),
    ("onfire",     lambda: [f_onfire(i) for i in range(4)],     90, True,  "panic run w/ flames"),
    ("flat",       lambda: [f_flat(i) for i in range(2)],      220, True,  "steamrolled wobble"),
    ("hitflash",   lambda: [f_hitflash()],                      60, False, "white damage flash"),
    ("crouch",     lambda: [f_crouch(i) for i in range(2)],    300, True,  "duck under things"),
    ("look",       lambda: [f_look(i) for i in range(2)],        0, False, "0 up / 1 down (camera peek)"),
    ("walljump",   lambda: [f_walljump(i) for i in range(2)],  100, False, "wall at right edge"),
    ("balance",    lambda: [f_balance(i) for i in range(4)],   220, True,  "tightrope at y=52"),
    ("pickup",     lambda: [f_pickup(i) for i in range(2)],    160, False, "grab ground item"),
    ("inspect",    lambda: [f_inspect(i) for i in range(2)],   280, True,  "interact prompt"),
    ("dive",       lambda: [f_dive(i) for i in range(2)],      180, True,  "underwater descent"),
    ("rat",        lambda: [f_rat(i) for i in range(2)],       140, True,  "enemy scurry"),
    ("gull",       lambda: [f_gull(i) for i in range(2)],      140, True,  "flying enemy"),
    ("possum",     lambda: [f_possum(i) for i in range(2)],    180, True,  "npc/rival"),
    ("control",    lambda: [f_control(i) for i in range(2)],   200, True,  "Animal Control hazard: legs+net"),
    ("emotes",     lambda: [f_emote(i) for i in range(4)],       0, False, "dialogue: happy/sad/angry/shocked"),
    ("bubbles",    lambda: [f_bubble(i) for i in range(4)],      0, False, "speech: ! ? heart zzz"),
    ("fx_splash",  lambda: [f_splash(i) for i in range(3)],     90, False, "water entry"),
    ("fx_confetti",lambda: [f_confetti(i) for i in range(2)],  140, True,  "celebration"),
    ("fx_hitspark",lambda: [f_hitspark(i) for i in range(2)],   70, False, "melee impact"),
]

def build6():
    os.makedirs("/home/claude/out6", exist_ok=True)
    built = [(name, fn(), dur, loop, note) for name, fn, dur, loop, note in ANIMS6]
    maxc = max(len(fr) for _, fr, _, _, _ in built)
    sheet = Image.new("RGBA", (W * maxc, H * len(built)), (0, 0, 0, 0))
    for r, (name, frames, dur, loop, note) in enumerate(built):
        for c, f in enumerate(frames):
            sheet.paste(f, (c * W, r * H))
    sheet.save("/home/claude/out6/jimothy_v6_sheet_native.png")

    gut = 110
    S3 = 3
    from PIL import ImageFont
    lab = Image.new("RGBA", (gut + W * S3 * maxc, H * S3 * len(built)), (24, 22, 32, 255))
    dl = ImageDraw.Draw(lab)
    font = ImageFont.load_default()
    for r, (name, frames, dur, loop, note) in enumerate(built):
        y0 = r * H * S3
        dl.rectangle((0, y0, gut - 6, y0 + H * S3), fill=(36, 33, 46, 255))
        dl.text((8, y0 + 8), name.upper(), fill=(235, 233, 240, 255), font=font)
        dl.text((8, y0 + 22), f"{len(frames)}f {dur}ms", fill=(150, 148, 162, 255), font=font)
        dl.text((8, y0 + 34), "loop" if loop else "once", fill=(150, 148, 162, 255), font=font)
        for li, chunk in enumerate([note[k:k + 16] for k in range(0, len(note), 16)][:5]):
            dl.text((8, y0 + 52 + li * 12), chunk, fill=(120, 118, 134, 255), font=font)
        for c, f in enumerate(frames):
            big = f.resize((W * S3, H * S3), Image.NEAREST)
            lab.alpha_composite(big, (gut + c * W * S3, y0))
            dl.rectangle((gut + c * W * S3, y0, gut + (c + 1) * W * S3 - 1, y0 + H * S3 - 1),
                         outline=(52, 48, 66, 255))
            dl.text((gut + c * W * S3 + 4, y0 + H * S3 - 16), str(c),
                    fill=(120, 118, 134, 255), font=font)
    lab.save("/home/claude/out6/jimothy_v6_sheet_labeled_3x.png")

    gif_rows = {"mecha", "ghost", "chonk", "star_power", "jetpack", "balloon", "disco",
                "cart_ride", "zap", "onfire", "flat", "balance", "king", "ninja_dash",
                "rat", "gull", "possum", "control", "fx_confetti"}
    for name, frames, dur, loop, note in built:
        strip = Image.new("RGBA", (W * len(frames), H), (0, 0, 0, 0))
        for c, f in enumerate(frames):
            strip.paste(f, (c * W, 0))
        strip.resize((strip.width * SCALE, strip.height * SCALE), Image.NEAREST)\
             .save(f"/home/claude/out6/jimothy_v6_{name}_5x.png")
        if name in gif_rows and len(frames) > 1:
            fr = [f.resize((W * SCALE, H * SCALE), Image.NEAREST).convert("RGBA") for f in frames]
            bg = [Image.new("RGBA", f.size, (28, 26, 38, 255)) for f in fr]
            comp = [Image.alpha_composite(b, f) for b, f in zip(bg, fr)]
            comp[0].save(f"/home/claude/out6/jimothy_v6_{name}.gif", save_all=True,
                         append_images=comp[1:], duration=max(60, dur), loop=0)

    atlas = {
        "image": "jimothy_v6_sheet_native.png",
        "frame_w": W, "frame_h": H, "facing": "right",
        "notes": "Expansion sheet. Shares anatomy/anchors with jimothy_v5_atlas.json.",
        "animations": {},
    }
    for r, (name, frames, dur, loop, note) in enumerate(built):
        atlas["animations"][name] = {"row": r, "frames": len(frames),
                                     "duration_ms": dur, "loop": loop, "note": note}
    with open("/home/claude/out6/jimothy_v6_atlas.json", "w") as fh:
        json.dump(atlas, fh, indent=2)
    print("v6 rows:", len(built), "| frames:", sum(len(fr) for _, fr, _, _, _ in built),
          "| sheet:", sheet.size)

if __name__ == "__main__":
    build6()
