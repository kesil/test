"""
Jimothy v5 — full production sprite kit for a side-scroller.
Builds on the v4 anatomy (one fuzzy mound, embedded face, spindly fingered limbs,
stub tail). Adds: complete locomotion set w/ transition frames, action verbs,
reaction states, signature trash-dive, props, collectibles, FX, HUD assets,
labeled contact sheet, and a JSON atlas (timings, anchors, hitboxes).
"""
from jimothy_v4 import *          # palette, hsh, px, mound/ears/face/snout/tail/limbs, scene
from jimothy_v4 import (W, H, SCALE, GROUND, MCX, MCY, EYE_XY, SNT_XY, TAIL_XY,
                        HIND_HIP, FRONT_HIP, new_frame, draw_shadow, draw_mound,
                        draw_ears, draw_face, draw_snout, draw_tail, limb,
                        draw_fingers, stride, limbs_far, limbs_near, scene,
                        f_idle, f_walk, f_run, f_roll, f_jump, f_fall, f_land,
                        f_dig, f_sit, f_hurt, f_sleep)
from PIL import Image, ImageDraw, ImageFont
import math, os, json

METAL2 = (150, 152, 160, 255)
METAL1 = (110, 112, 122, 255)
METAL0 = (78, 80, 92, 255)
CHEESE = (232, 196, 100, 255)
CRUST  = (190, 140, 80, 255)
PEPP   = (180, 70, 60, 255)
BONE   = (230, 224, 210, 255)
CANRED = (190, 60, 60, 255)
SHINE  = (240, 240, 245, 255)
COOKIE = (196, 150, 96, 255)
CHIP   = (86, 58, 40, 255)
HEART  = (210, 80, 90, 255)
HEARTD = (120, 50, 60, 255)
SWEAT  = (140, 190, 230, 255)

# ---------------- items ----------------
def item_pizza(d, x, y):
    d.polygon([(x - 6, y - 4), (x + 6, y - 2), (x - 3, y + 6)], fill=OUT)
    d.polygon([(x - 5, y - 3), (x + 5, y - 2), (x - 3, y + 5)], fill=CHEESE)
    d.line((x - 5, y - 4, x + 5, y - 2), fill=CRUST)
    d.line((x - 5, y - 3, x + 5, y - 1), fill=CRUST)
    px(d, x - 2, y, PEPP); px(d, x + 1, y + 1, PEPP); px(d, x - 3, y + 2, PEPP)
    px(d, x - 1, y + 4, CHEESE)  # drip

def item_fishbone(d, x, y):
    d.line((x - 6, y, x + 4, y), fill=BONE)
    d.line((x - 6, y - 1, x + 4, y - 1), fill=OUT)
    for k in range(-4, 4, 2):
        d.line((x + k, y - 2, x + k, y + 2), fill=BONE)
    d.polygon([(x + 4, y - 3), (x + 8, y), (x + 4, y + 3)], fill=BONE)
    px(d, x + 6, y - 1, OUT)  # eye socket
    d.polygon([(x - 6, y - 2), (x - 9, y), (x - 6, y + 2)], fill=BONE)  # tail fin

def item_can(d, x, y):
    d.rectangle((x - 3, y - 5, x + 3, y + 5), fill=OUT)
    d.rectangle((x - 2, y - 4, x + 2, y + 4), fill=CANRED)
    d.rectangle((x - 2, y - 4, x + 2, y - 3), fill=METAL2)
    d.rectangle((x - 2, y + 3, x + 2, y + 4), fill=METAL1)
    d.line((x - 1, y - 2, x - 1, y + 2), fill=SHINE)

def item_cookie(d, x, y):
    d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=OUT)
    d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=COOKIE)
    for cx2, cy2 in ((x - 2, y - 1), (x + 1, y - 2), (x, y + 2), (x + 2, y + 1)):
        px(d, cx2, cy2, CHIP)
    px(d, x - 2, y - 3, SHINE)

def prop_trashcan(d, x, y, tipped=False):
    """y = ground line of the can."""
    if not tipped:
        d.polygon([(x - 11, y), (x - 9, y - 22), (x + 9, y - 22), (x + 11, y)], fill=OUT)
        d.polygon([(x - 10, y - 1), (x - 8, y - 21), (x + 8, y - 21), (x + 10, y - 1)], fill=METAL1)
        for k in range(3):
            d.line((x - 9 + k, y - 18 + k * 6, x + 9 - k, y - 18 + k * 6), fill=METAL0)
        d.line((x - 7, y - 19, x - 5, y - 3), fill=METAL2)
        # lid ajar
        d.ellipse((x - 11, y - 27, x + 11, y - 21), fill=OUT)
        d.ellipse((x - 10, y - 26, x + 10, y - 22), fill=METAL2)
        d.rectangle((x - 2, y - 29, x + 2, y - 26), fill=METAL1)
    else:
        d.polygon([(x - 14, y - 4), (x + 8, y - 16), (x + 12, y - 8), (x - 12, y + 2)], fill=OUT)
        d.polygon([(x - 12, y - 4), (x + 8, y - 14), (x + 11, y - 9), (x - 11, y)], fill=METAL1)
        d.line((x - 8, y - 6, x + 6, y - 13), fill=METAL0)
        d.line((x - 10, y - 3, x + 8, y - 12), fill=METAL2)
        # spill
        item_fishbone(d, x - 18, y - 2)
        px(d, x - 14, y, DIRT); px(d, x - 16, y - 1, DIRT2); px(d, x - 20, y, DIRT)

def fx_dust(d, cx, cy, stage):
    r = 3 + stage * 3
    for k in range(4 + stage * 2):
        a = k / (4 + stage * 2) * 2 * math.pi
        x = cx + math.cos(a) * r + (hsh(k, stage) % 2)
        y = cy + math.sin(a) * (r * 0.55)
        c = [WHITE1, FUR2, FUR1][min(2, stage)]
        px(d, x, y, c)
        if stage < 2:
            px(d, x + 1, y, WHITE2 if stage == 0 else WHITE1)

def fx_sparkle(d, cx, cy, stage):
    s = 2 + stage * 2
    d.line((cx - s, cy, cx + s, cy), fill=SHINE)
    d.line((cx, cy - s, cx, cy + s), fill=SHINE)
    if stage == 0:
        px(d, cx - 1, cy - 1, FUR4); px(d, cx + 1, cy + 1, FUR4)
    else:
        px(d, cx - s + 1, cy, FUR3); px(d, cx + s - 1, cy, FUR3)

def ui_heart(d, cx, cy, kind):
    pts = [(cx - 5, cy - 2), (cx - 3, cy - 5), (cx - 1, cy - 3), (cx, cy - 3),
           (cx + 2, cy - 5), (cx + 4, cy - 2), (cx, cy + 5)]
    d.polygon(pts, fill=OUT)
    inner = [(cx - 4, cy - 2), (cx - 3, cy - 4), (cx - 1, cy - 2), (cx + 1, cy - 2),
             (cx + 2, cy - 4), (cx + 3, cy - 2), (cx, cy + 4)]
    if kind == "full":
        d.polygon(inner, fill=HEART)
        px(d, cx - 2, cy - 2, SHINE)
    elif kind == "half":
        d.polygon(inner, fill=HEARTD)
        d.polygon([(cx - 4, cy - 2), (cx - 3, cy - 4), (cx - 1, cy - 2), (cx, cy - 1),
                   (cx, cy + 4)], fill=HEART)
        px(d, cx - 2, cy - 2, SHINE)
    else:
        d.polygon(inner, fill=(60, 54, 68, 255))
    # paw print in the heart
    px(d, cx, cy, OUT); px(d, cx - 1, cy - 1, OUT); px(d, cx + 1, cy - 1, OUT)

# ================= NEW ANIMATION FRAMES =================

def f_bored(t):
    """Long-idle: scratch ear with hind leg, then a big yawn."""
    img, d = new_frame()
    if t < 2:  # scratch
        cy = scene(d, dy=1 + t, seed=80 + t, gait="stand", expr="blink" if t == 1 else "normal",
                   ear=1 + t * 2, sway=1 - t * 2, face=True)
        # hind near leg raised to the ear, ticking
        fy = 18 + (0 if t == 0 else 5)
        limb(d, HIND_HIP[0], HIND_HIP[1] + 1, 46, fy, OUT, "hind", planted=False)
        for k in range(3):
            px(d, 47 + k, fy - 2 - (t + k) % 2, FUR3)   # scratch ticks
    elif t == 2:  # yawn
        scene(d, dy=1, squash=1, seed=82, gait="stand", expr="blink", mouth="open", ear=-1)
        d.ellipse((SNT_XY[0] - 2, SNT_XY[1] + 3, SNT_XY[0] + 3, SNT_XY[1] + 7), fill=OUT)
        d.rectangle((SNT_XY[0] - 1, SNT_XY[1] + 5, SNT_XY[0] + 2, SNT_XY[1] + 6), fill=TONGUE)
    else:  # settle
        scene(d, dy=0, seed=83, gait="stand", expr="normal", sway=-1)
    return img

def f_sneak(i, n=4):
    """Lowered creep: body dropped, tiny careful steps, wide alert eye."""
    img, d = new_frame()
    ph = i / n
    drop = 4 + (i % 2)
    cy = MCY + drop
    draw_shadow(d, MCX + 2, 22)
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] + drop - 1, sway=0)
    # far limbs: short careful strides
    fx, fy, pl = stride(33, GROUND, ph + 0.5, 2, 2)
    limb(d, HIND_HIP[0] - 2, HIND_HIP[1] + drop, fx, fy, FUR0, "hind", planted=pl)
    fx, fy, pl = stride(44, GROUND, ph + 0.75, 2, 2)
    limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] + drop, fx, fy, FUR0, "front", planted=pl)
    draw_mound(d, MCX, cy, rx=20, ry=13, seed=85 + i, arch=0.8)
    draw_ears(d, MCX, cy, 13, 0.8, perk=2)
    fx, fy, pl = stride(37, GROUND, ph, 2, 2)
    limb(d, HIND_HIP[0], HIND_HIP[1] + drop, fx, fy, OUT, "hind", planted=pl, splay=2)
    fx, fy, pl = stride(49, GROUND, ph + 0.25, 2, 2)
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + drop, fx, fy, OUT, "front", planted=pl, splay=2)
    draw_face(d, EYE_XY[0], EYE_XY[1] + drop, expr="blink" if i == 2 else "alarmed")
    draw_snout(d, SNT_XY[0], SNT_XY[1] + drop)
    return img

def f_skid(i):
    """Braking: mass slides forward over stiff braced front limbs, dust ahead."""
    img, d = new_frame()
    lean = 2 + i
    cy = MCY + 1
    draw_shadow(d, MCX + 4, 22)
    draw_tail(d, TAIL_XY[0] - lean, TAIL_XY[1] - 2, sway=2)
    limb(d, HIND_HIP[0] - 2 + lean, HIND_HIP[1], 30 + lean, GROUND, FUR0, "hind")
    draw_mound(d, MCX + lean, cy, rx=20, ry=14, seed=88 + i, arch=1.1)
    draw_ears(d, MCX + lean, cy, 14, 1.1, perk=-2)
    # stiff braced front limbs, fingers dug in
    limb(d, FRONT_HIP[0] + lean, FRONT_HIP[1], 56, GROUND, OUT, "front", splay=2)
    limb(d, FRONT_HIP[0] + lean - 2, FRONT_HIP[1], 53, GROUND, FUR0, "front")
    limb(d, HIND_HIP[0] + lean, HIND_HIP[1], 34 + lean, GROUND, OUT, "hind", splay=2)
    draw_face(d, EYE_XY[0] + lean, EYE_XY[1] + 1, expr="alarmed")
    draw_snout(d, SNT_XY[0] + lean, SNT_XY[1] + 1)
    # skid dust in FRONT of the feet
    for k in range(5 + i * 2):
        x = 56 + k * 2 + hsh(i, k) % 3
        y = GROUND - (hsh(k, i) % 4)
        px(d, x, y, WHITE1); px(d, x - 1, y + 1, DIRT2)
    d.line((30, GROUND, 44, GROUND), fill=DIRT2)   # skid mark
    return img

def f_turn(i):
    """Direction-change transition: narrow squash, then rebound. Engine flips after."""
    img, d = new_frame()
    if i == 0:
        cy = MCY + 2
        draw_shadow(d, MCX, 16)
        draw_tail(d, TAIL_XY[0] + 4, TAIL_XY[1] + 4, sway=3)   # tail whips
        limbs_far(d, 0, "stand", dy=2)
        draw_mound(d, MCX, cy, rx=14, ry=16, seed=90, arch=0.7)
        draw_ears(d, MCX, cy, 16, 0.7, perk=0)
        limbs_near(d, 0, "stand", dy=2)
        draw_face(d, EYE_XY[0] - 4, EYE_XY[1] + 2, expr="blink")
        draw_snout(d, SNT_XY[0] - 4, SNT_XY[1] + 2)
        for k in range(3):
            px(d, 24 + k * 3, GROUND - 1, WHITE1)
    else:
        scene(d, dy=0, squash=-1, seed=91, gait="stand", expr="normal", sway=-2, ear=1)
    return img

def f_jump3(i):
    """0 crouch / 1 rise / 2 apex."""
    img, d = new_frame()
    if i == 0:
        scene(d, dy=5, squash=3, seed=20, gait="stand", ear=-2, expr="alarmed")
    elif i == 1:
        scene(d, dy=-6, squash=-2, seed=21, gait="tuck", air=1, ear=1,
              expr="normal", mouth="open", sway=2)
        for yy in (GROUND - 2, GROUND - 5):
            px(d, MCX - 5, yy, WHITE1); px(d, MCX + 6, yy + 1, WHITE1)
    else:
        scene(d, dy=-9, squash=0, seed=22, gait="tuck", air=2, ear=2,
              expr="normal", sway=3)
    return img

def f_climb(i, n=4):
    """Climbing a wall on the RIGHT (game draws the wall at x~=62)."""
    img, d = new_frame()
    ph = i / n
    cy = MCY - 2 + (i % 2)
    # no ground shadow while climbing
    draw_tail(d, TAIL_XY[0] + 2, TAIL_XY[1] + 2, sway=1 if i % 2 else -1)
    # far limbs reaching to the wall
    ua = math.sin(ph * 2 * math.pi)
    limb(d, HIND_HIP[0] - 2, HIND_HIP[1] - 2, 58, 50 - int(ua * 4), FUR0, "hind", planted=False)
    limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] - 10, 59, 26 + int(ua * 4), FUR0, "front", planted=False)
    draw_mound(d, MCX - 2, cy, rx=17, ry=15, seed=95 + i, arch=0.9)
    draw_ears(d, MCX - 2, cy, 15, 0.9, perk=2)
    # near limbs gripping the wall, alternating reach
    limb(d, HIND_HIP[0], HIND_HIP[1] - 2, 60, 46 + int(ua * 4), OUT, "hind", planted=False, splay=2)
    limb(d, FRONT_HIP[0], FRONT_HIP[1] - 10, 61, 22 - int(ua * 4), OUT, "front", planted=False, splay=2)
    # face tilted UP
    draw_face(d, EYE_XY[0] - 3, EYE_XY[1] - 5, expr="normal")
    draw_snout(d, SNT_XY[0] - 2, SNT_XY[1] - 8)
    return img

def f_swim(i, n=4):
    """Doggy-paddle: mound floats (waterline y=44, see atlas), limbs churn, bubbles."""
    img, d = new_frame()
    ph = i / n
    bob = int(round(math.sin(ph * 2 * math.pi)))
    cy = MCY + 2 + bob
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] + 4 + bob, sway=1)
    draw_mound(d, MCX, cy, rx=20, ry=13, seed=105 + i, arch=0.7)
    draw_ears(d, MCX, cy, 13, 0.7, perk=1)
    # paddling limbs: circular churn below waterline
    for base, po, col, sp in ((37, 0.0, OUT, 2), (49, 0.5, OUT, 2), (33, 0.25, FUR0, 1), (45, 0.75, FUR0, 1)):
        th = (ph + po) * 2 * math.pi
        fx = base + math.cos(th) * 3
        fy = 52 + math.sin(th) * 3
        limb(d, base, 46 + bob, fx, fy, col, "front", planted=False, splay=sp)
    # snout up, happy pant
    draw_face(d, EYE_XY[0], EYE_XY[1] + bob - 1, expr="normal")
    draw_snout(d, SNT_XY[0], SNT_XY[1] + bob - 3, mouth="pant")
    # bubbles + wake
    for k in range(3):
        bx = 16 - k * 4 + hsh(i, k) % 3
        by = 46 - (hsh(k, i) % 6)
        px(d, bx, by, WHITE1); px(d, bx, by - 1, SHINE)
    for k in range(6):
        px(d, 12 + k * 9 + (i % 2) * 3, 44, (WHITE1[0], WHITE1[1], WHITE1[2], 140))
    return img

def f_hang(i):
    """Ledge hang: fingers gripping at (49,11) — game draws the ledge."""
    img, d = new_frame()
    sway = i
    cy = MCY - 2
    draw_tail(d, TAIL_XY[0] + sway, TAIL_XY[1] + 6, sway=1 - i * 2)
    # arms stretched overhead to the grip point
    limb(d, FRONT_HIP[0] - 2 + sway, FRONT_HIP[1] - 12, 45, 12, FUR0, "front", planted=False)
    draw_mound(d, MCX + sway, cy, rx=17, ry=16, seed=110 + i, arch=0.6)
    draw_ears(d, MCX + sway, cy, 16, 0.6, perk=1)
    limb(d, FRONT_HIP[0] + sway, FRONT_HIP[1] - 12, 49, 11, OUT, "front", planted=False, splay=2)
    # grip fingers curl over the (invisible) ledge line
    d.line((47, 10, 52, 10), fill=OUT)
    # hind legs dangle
    limb(d, HIND_HIP[0] + sway, HIND_HIP[1] + 2, 34 + sway, 56, OUT, "hind", planted=False)
    draw_face(d, EYE_XY[0] + sway - 2, EYE_XY[1] - 4, expr="worried")
    draw_snout(d, SNT_XY[0] + sway - 2, SNT_XY[1] - 6)
    return img

def f_push(i):
    """Shoving an object to the right (object at x>=64, game-drawn)."""
    img, d = new_frame()
    lean = 3 + i
    cy = MCY + 2
    draw_shadow(d, MCX + 3, 21)
    draw_tail(d, TAIL_XY[0] - lean, TAIL_XY[1] + 1, sway=-1)
    limb(d, HIND_HIP[0] - 2 + lean, HIND_HIP[1] + 2, 28 + i * 2, GROUND, FUR0, "hind")
    draw_mound(d, MCX + lean, cy, rx=20, ry=14, seed=115 + i, arch=1.0)
    draw_ears(d, MCX + lean, cy, 14, 1.0, perk=-1)
    # both front limbs braced straight ahead against the object
    limb(d, FRONT_HIP[0] + lean, FRONT_HIP[1], 62, 42, OUT, "front", planted=False, splay=2)
    limb(d, FRONT_HIP[0] + lean - 2, FRONT_HIP[1] + 1, 62, 46, FUR0, "front", planted=False)
    limb(d, HIND_HIP[0] + lean, HIND_HIP[1] + 2, 32 + i * 2, GROUND, OUT, "hind", splay=2)
    draw_face(d, EYE_XY[0] + lean, EYE_XY[1] + 2, expr="blink" if i else "normal")
    draw_snout(d, SNT_XY[0] + lean, SNT_XY[1] + 2)
    # foot-slip dust
    for k in range(3 + i):
        px(d, 26 + k * 3, GROUND - (hsh(i, k) % 3), WHITE1)
    return img

def f_eat(i):
    """Sitting-ish, pizza slice in fingers, nibble cycle w/ cheek bulge + crumbs."""
    img, d = new_frame()
    cy = scene(d, dy=2 + (i % 2), squash=1, seed=120 + i, gait="stand",
               expr="blink" if i in (1, 3) else "normal",
               mouth="open" if i == 1 else "closed", sway=0, face=True)
    # front limbs raised holding the slice at the snout
    hx, hy = 56, 44
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + 2, hx, hy, OUT, "front", planted=False)
    limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] + 2, hx - 3, hy + 1, FUR0, "front", planted=False)
    if i < 3:
        item_pizza(d, 62 - i, 43 + (i % 2))
    else:
        # last bite: only crust left
        d.line((59, 42, 64, 43), fill=CRUST)
        d.line((59, 43, 64, 44), fill=OUT)
    if i in (1, 2):
        d.ellipse((52, 34, 57, 39), fill=FUR3)          # cheek bulge
    for k in range(i):
        px(d, 58 + hsh(i, k) % 5, 50 + hsh(k, i) % 6, CHEESE)  # crumbs
    return img

def f_carry(i):
    """Fishbone clamped in jaws; 2-frame bob. Pair with walk row + mouth anchor."""
    img, d = new_frame()
    scene(d, dy=i, seed=125 + i, gait="stand", expr="normal", sway=i, face=True)
    item_fishbone(d, 66, SNT_XY[1] + i + 1)
    d.line((SNT_XY[0] + 2, SNT_XY[1] + i + 1, SNT_XY[0] + 5, SNT_XY[1] + i + 1), fill=OUT)  # jaw clamp
    return img

def f_throw(i):
    """0 windup (can raised behind) / 1 release (limb whipped forward) / 2 follow."""
    img, d = new_frame()
    if i == 0:
        scene(d, dy=1, squash=1, seed=130, gait="stand", expr="alarmed", ear=1, sway=-2)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 40, 22, OUT, "front", planted=False)
        item_can(d, 38, 18)
    elif i == 1:
        scene(d, dy=-1, squash=-1, seed=131, gait="stand", expr="normal", mouth="open", ear=-1, sway=2)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 64, 30, OUT, "front", planted=False, splay=2)
        # release arc
        for k in range(4):
            px(d, 60 + k * 3, 26 - k * 2, (FUR3[0], FUR3[1], FUR3[2], 160))
    else:
        scene(d, dy=1, seed=132, gait="stand", expr="blink", sway=0)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 58, 50, OUT, "front", planted=False)
        px(d, 60, 52, WHITE1); px(d, 63, 50, WHITE1)
    return img

def f_swipe(i):
    """Claw attack: raise / slash arc / recover."""
    img, d = new_frame()
    if i == 0:
        scene(d, dy=0, squash=1, seed=135, gait="stand", expr="alarmed", ear=2, sway=-1)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 52, 26, OUT, "front", planted=False, splay=2)
    elif i == 1:
        scene(d, dy=-1, seed=136, gait="stand", expr="alarmed", mouth="open", ear=1, sway=2)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 66, 40, OUT, "front", planted=False, splay=2)
        # triple slash arc
        for r0 in (10, 13, 16):
            d.arc((FRONT_HIP[0] + 2 - r0, FRONT_HIP[1] - r0, FRONT_HIP[0] + 2 + r0, FRONT_HIP[1] + r0),
                  -60, 40, fill=SHINE if r0 == 13 else FUR4)
    else:
        scene(d, dy=1, squash=1, seed=137, gait="stand", expr="normal", sway=0)
        limb(d, FRONT_HIP[0], FRONT_HIP[1], 56, 52, OUT, "front", planted=False)
    return img

def f_pounce(i):
    """0 aim (rear raised, wiggle) / 1 airborne lunge fingers-first."""
    img, d = new_frame()
    if i == 0:
        cy = MCY + 3
        draw_shadow(d, MCX + 2, 22)
        draw_tail(d, TAIL_XY[0] - 1, TAIL_XY[1] - 3, sway=3)   # tail high wiggle
        limbs_far(d, 0, "stand", dy=3)
        draw_mound(d, MCX, cy, rx=20, ry=13, seed=140, arch=1.4)   # butt up
        draw_ears(d, MCX, cy, 13, 1.4, perk=2)
        limbs_near(d, 0, "stand", dy=3)
        draw_face(d, EYE_XY[0], EYE_XY[1] + 4, expr="alarmed")
        draw_snout(d, SNT_XY[0], SNT_XY[1] + 4)
    else:
        cy = MCY - 6
        draw_shadow(d, MCX + 6, 20, air=2)
        draw_tail(d, TAIL_XY[0] - 2, TAIL_XY[1] - 4, sway=3)
        draw_mound(d, MCX + 2, cy, rx=21, ry=12, seed=141, arch=0.6)  # stretched
        draw_ears(d, MCX + 2, cy, 12, 0.6, perk=-2)
        # all limbs thrust forward, fingers first
        limb(d, FRONT_HIP[0] + 2, FRONT_HIP[1] - 8, 68, 34, OUT, "front", planted=False, splay=2)
        limb(d, FRONT_HIP[0], FRONT_HIP[1] - 7, 65, 38, FUR0, "front", planted=False)
        limb(d, HIND_HIP[0] + 2, HIND_HIP[1] - 8, 26, 50, OUT, "hind", planted=False)
        draw_face(d, EYE_XY[0] + 2, EYE_XY[1] - 6, expr="alarmed")
        draw_snout(d, SNT_XY[0] + 2, SNT_XY[1] - 6, mouth="open")
        for yy in (cy - 4, cy + 5):
            d.line((4, yy, 12, yy), fill=(FUR2[0], FUR2[1], FUR2[2], 130))
    return img

def f_alert():
    """! moment: hop, ears max, wide eye."""
    img, d = new_frame()
    scene(d, dy=-2, seed=145, gait="stand", expr="alarmed", ear=3, sway=2, air=1)
    # exclamation mark
    d.rectangle((60, 6, 63, 14), fill=OUT)
    d.rectangle((61, 7, 62, 12), fill=SHINE)
    d.rectangle((60, 16, 63, 19), fill=OUT)
    d.rectangle((61, 17, 62, 18), fill=SHINE)
    return img

def f_scared(i):
    """Trembling, double fur spikes, sweat drop."""
    img, d = new_frame()
    j = (-1) ** i
    cy = scene(d, dy=1 + i, squash=1, seed=150 + i, gait="stand", expr="worried",
               ear=3 - i, sway=j, face=True)
    # extra scruff ring
    for k in range(14):
        a = -math.pi + k * 2 * math.pi / 14
        if math.sin(a) > 0.7:
            continue
        bx = MCX + j + math.cos(a) * 21
        by = cy + math.sin(a) * 17
        px(d, bx, by, OUT)
    # tremble ticks
    for yy in (20, 30, 40):
        px(d, 12, yy + i, FUR1); px(d, 66, yy - i, FUR1)
    # sweat drop
    px(d, 56, 14 + i, SWEAT); px(d, 56, 15 + i, SWEAT); px(d, 55, 15 + i, SWEAT)
    return img

def f_ko(i):
    """Defeat splat: pancaked, tongue out, stars."""
    img, d = new_frame()
    cy = MCY + 9 - i
    draw_shadow(d, MCX + 2, 24)
    draw_tail(d, TAIL_XY[0] + 1, TAIL_XY[1] + 10, sway=-2)
    draw_mound(d, MCX, cy, rx=23, ry=7 + i, seed=155 + i, arch=0.3)
    draw_ears(d, MCX, cy, 7 + i, 0.3, perk=-3)
    # limbs splayed flat on the ground
    for x0, col in ((26, OUT), (30, FUR0), (52, OUT), (56, FUR0)):
        d.line((x0, GROUND - 2, x0 + 4, GROUND - 1), fill=col)
        draw_fingers(d, x0 + 4, GROUND - 1, col, splay=2)
    draw_face(d, EYE_XY[0], cy + 1, expr="dizzy")
    draw_snout(d, SNT_XY[0], cy + 3, mouth="open")
    d.rectangle((SNT_XY[0], cy + 6, SNT_XY[0] + 2, cy + 8 + i), fill=TONGUE)
    for sx, sy in ((44, 10), (54, 14), (49, 6)):
        px(d, sx + i, sy, FUR4); px(d, sx + i - 1, sy, OUT); px(d, sx + i + 1, sy, OUT)
        px(d, sx + i, sy - 1, OUT); px(d, sx + i, sy + 1, OUT)
    return img

def f_celebrate(t):
    """Victory bounce, fingers up, sparkles."""
    img, d = new_frame()
    hop = [0, -4, -6, -3][t]
    air = 0 if hop == 0 else (1 if hop > -5 else 2)
    scene(d, dy=hop, squash=-1 if hop < -3 else 0, seed=160 + t, gait="tuck" if air else "stand",
          air=air, expr="normal", mouth="open", ear=2, sway=2)
    # front limbs thrown up
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + hop, 58, 18 + hop, OUT, "front", planted=False, splay=2)
    limb(d, FRONT_HIP[0] - 3, FRONT_HIP[1] + hop, 40, 16 + hop, FUR0, "front", planted=False)
    fx_sparkle(d, 62, 12 + (t % 2) * 3, t % 2)
    fx_sparkle(d, 34, 8 + ((t + 1) % 2) * 3, (t + 1) % 2)
    return img

def f_taunt(i):
    """Butt-wiggle taunt: rear bounces, tail wags big, smug closed eye."""
    img, d = new_frame()
    wig = (-1) ** i * 3
    cy = MCY + 1
    draw_shadow(d, MCX + 2, 21)
    draw_tail(d, TAIL_XY[0] + wig, TAIL_XY[1] - 4 + wig, sway=3 * (-1) ** i)
    limbs_far(d, 0, "stand", dy=1)
    draw_mound(d, MCX + (i % 2), cy - (i % 2), rx=19, ry=15, seed=165 + i, arch=1.3 + i * 0.3)  # butt high
    draw_ears(d, MCX, cy, 15, 1.3, perk=1)
    limbs_near(d, 0, "stand", dy=1)
    # smug: happy closed-arc eye
    d.ellipse((EYE_XY[0] - 6, EYE_XY[1] - 3, EYE_XY[0] + 7, EYE_XY[1] + 6), fill=MASK)
    d.arc((EYE_XY[0] - 2, EYE_XY[1] - 1, EYE_XY[0] + 2, EYE_XY[1] + 3), 180, 360, fill=OUT)
    d.arc((EYE_XY[0] - 4, EYE_XY[1] - 5, EYE_XY[0] + 5, EYE_XY[1] + 2), 200, 340, fill=WHITE2)
    draw_snout(d, SNT_XY[0], SNT_XY[1] + 1, mouth="pant")
    # musical note
    nx, ny = 64 + i, 12 - i
    d.line((nx, ny, nx, ny + 6), fill=OUT)
    d.ellipse((nx - 3, ny + 5, nx, ny + 8), fill=OUT)
    d.line((nx, ny, nx + 3, ny + 1), fill=OUT)
    return img

def f_wake(i):
    """From sleep: stretch long, yawn."""
    img, d = new_frame()
    if i == 0:  # long cat-stretch
        cx, cy = 38, 42
        draw_shadow(d, cx, 22)
        draw_tail(d, 20, 26, sway=2)
        draw_mound(d, cx, cy, rx=23, ry=10, seed=170, arch=1.5)   # stretched low, butt up
        draw_ears(d, cx, cy, 10, 1.5, perk=1)
        limb(d, 30, 50, 24, GROUND, OUT, "hind", splay=2)
        limb(d, 50, 50, 60, GROUND, OUT, "front", planted=True, splay=2)
        limb(d, 47, 50, 57, GROUND, FUR0, "front")
        draw_face(d, 52, 44, expr="sleep")
        draw_snout(d, 60, 48, mouth="open")
    else:      # upright blinky yawn
        scene(d, dy=1, squash=1, seed=171, gait="stand", expr="blink", mouth="open", ear=0, sway=1)
        d.ellipse((SNT_XY[0] - 2, SNT_XY[1] + 3, SNT_XY[0] + 3, SNT_XY[1] + 7), fill=OUT)
        d.rectangle((SNT_XY[0] - 1, SNT_XY[1] + 5, SNT_XY[0] + 2, SNT_XY[1] + 6), fill=TONGUE)
    return img

def f_trashdive(i):
    """SIGNATURE: headfirst in a trash can — rear + kicking legs + tail out the top."""
    img, d = new_frame()
    tilt = (i % 2)
    canx, cany = 40, GROUND
    draw_shadow(d, canx, 16)
    # rear half of the mound emerging from the can mouth (drawn first, can rim over it)
    rcy = 26 - tilt
    draw_mound(d, canx - 1, rcy, rx=13, ry=10, seed=175 + i, arch=0.5)
    # tail pom on top of the rear
    draw_tail(d, canx - 6, rcy - 8, sway=2 * (-1) ** i)
    # kicking hind legs, alternating
    up = i % 2
    limb(d, canx - 4, rcy - 4, canx - 12, 12 + (4 if up else 0), OUT, "hind", planted=False, splay=2)
    limb(d, canx + 4, rcy - 4, canx + 12, 12 + (0 if up else 4), OUT, "hind", planted=False, splay=2)
    # the can (front, overlapping the mound's lower half)
    d.polygon([(canx - 12, cany), (canx - 10, cany - 24), (canx + 10, cany - 24), (canx + 12, cany)], fill=OUT)
    d.polygon([(canx - 11, cany - 1), (canx - 9, cany - 23), (canx + 9, cany - 23), (canx + 11, cany - 1)], fill=METAL1)
    for k in range(3):
        d.line((canx - 9 + k, cany - 19 + k * 6, canx + 9 - k, cany - 19 + k * 6), fill=METAL0)
    d.line((canx - 7, cany - 21, canx - 5, cany - 3), fill=METAL2)
    d.ellipse((canx - 12, cany - 27 + tilt, canx + 12, cany - 21 + tilt), outline=OUT, width=2)
    d.ellipse((canx - 11, cany - 26 + tilt, canx + 11, cany - 22 + tilt), outline=METAL2, width=1)
    # lid flung to the side, rocking
    d.ellipse((60, cany - 6 + tilt, 76, cany - 1 + tilt), fill=OUT)
    d.ellipse((61, cany - 5 + tilt, 75, cany - 2 + tilt), fill=METAL2)
    # debris popping out
    for k in range(2 + i % 3):
        x = canx - 6 + hsh(i, k) % 12
        y = cany - 30 - (hsh(k, i) % 8)
        c = [CHEESE, BONE, DIRT][hsh(i, k * 3) % 3]
        px(d, x, y, c); px(d, x + 1, y, OUT)
    # rummage noise ticks
    px(d, canx - 15, cany - 14 + tilt, FUR1); px(d, canx + 15, cany - 16 - tilt, FUR1)
    return img

def f_portrait():
    """HUD portrait: big face closeup in a rounded frame."""
    img, d = new_frame()
    d.rounded_rectangle((14, 6, 66, 58), radius=8, fill=OUT)
    d.rounded_rectangle((16, 8, 64, 56), radius=7, fill=FUR0)
    d.rounded_rectangle((17, 9, 63, 55), radius=7, fill=FUR2)
    # mound crest fills the frame (kept inside the border)
    d.ellipse((18, 18, 62, 55), fill=FUR2)
    d.ellipse((20, 19, 56, 44), fill=FUR3)
    # keep inside frame: redraw border
    # ears
    for ex in (26, 48):
        d.ellipse((ex - 6, 8, ex + 6, 20), fill=OUT)
        d.ellipse((ex - 5, 9, ex + 5, 19), fill=FUR2)
        d.ellipse((ex - 3, 11, ex + 3, 17), fill=PINK)
    # big face
    d.ellipse((26, 24, 56, 48), fill=MASK)
    d.ellipse((30, 28, 52, 44), fill=MASKD)
    d.arc((28, 20, 54, 40), 200, 340, fill=WHITE2)
    d.ellipse((34, 30, 42, 38), fill=OUT)         # eye
    px(d, 36, 32, EYE_W); px(d, 37, 33, EYE_W)
    d.polygon([(48, 36), (62, 40), (50, 46)], fill=OUT)
    d.polygon([(49, 37), (59, 40), (50, 44)], fill=WHITE2)
    d.rectangle((58, 38, 61, 41), fill=NOSE)
    # frame border back on top
    d.rounded_rectangle((14, 6, 66, 58), radius=8, outline=OUT, width=2)
    d.rounded_rectangle((16, 8, 64, 56), radius=7, outline=FUR4, width=1)
    return img

def f_props(i):
    img, d = new_frame()
    if i == 0:
        prop_trashcan(d, 40, GROUND)
        draw_shadow(d, 40, 14)
    else:
        prop_trashcan(d, 42, GROUND, tipped=True)
        draw_shadow(d, 40, 18)
    return img

def f_items(i):
    img, d = new_frame()
    fn = [item_pizza, item_fishbone, item_can, item_cookie][i]
    fn(d, 40, 32)
    d.ellipse((32, 40, 48, 44), fill=(SHDW[0], SHDW[1], SHDW[2], 50))
    fx_sparkle(d, 50, 24, i % 2)
    return img

def f_fx_dust(i):
    img, d = new_frame()
    fx_dust(d, 40, 40, i)
    return img

def f_fx_sparkle(i):
    img, d = new_frame()
    fx_sparkle(d, 40, 32, i)
    if i == 1:
        fx_sparkle(d, 30, 40, 0); fx_sparkle(d, 50, 26, 0)
    return img

def f_hearts(i):
    img, d = new_frame()
    ui_heart(d, 40, 32, ["full", "half", "empty"][i])
    return img

# ================= build =================
ANIMS = [
    # (name, frame_fn_list, duration_ms, loop, note)
    ("idle",      lambda: [f_idle(t) for t in range(4)],      220, True,  "default loop"),
    ("bored",     lambda: [f_bored(t) for t in range(4)],     260, True,  "long-idle: scratch + yawn"),
    ("sneak",     lambda: [f_sneak(i) for i in range(4)],     180, True,  "crouch-walk"),
    ("walk",      lambda: [f_walk(i) for i in range(6)],      130, True,  ""),
    ("run",       lambda: [f_run(i) for i in range(6)],        95, True,  "bounding gait"),
    ("skid",      lambda: [f_skid(i) for i in range(2)],      110, False, "brake from run"),
    ("turn",      lambda: [f_turn(i) for i in range(2)],       90, False, "flip transition"),
    ("jump",      lambda: [f_jump3(i) for i in range(3)],     100, False, "crouch/rise/apex"),
    ("fall",      lambda: [f_fall()],                         120, True,  ""),
    ("land",      lambda: [f_land(i) for i in range(2)],      120, False, "squash/recover"),
    ("roll",      lambda: [f_roll(i) for i in range(4)],       80, True,  "ball-dash"),
    ("climb",     lambda: [f_climb(i) for i in range(4)],     160, True,  "wall at right edge"),
    ("swim",      lambda: [f_swim(i) for i in range(4)],      170, True,  "waterline y=44"),
    ("hang",      lambda: [f_hang(i) for i in range(2)],      300, True,  "grip anchor (49,11)"),
    ("push",      lambda: [f_push(i) for i in range(2)],      200, True,  "object at right edge"),
    ("dig",       lambda: [f_dig(i) for i in range(4)],       150, True,  "forage"),
    ("eat",       lambda: [f_eat(i) for i in range(4)],       200, False, "consume pickup"),
    ("carry",     lambda: [f_carry(i) for i in range(2)],     260, True,  "item in jaws; mouth anchor"),
    ("throw",     lambda: [f_throw(i) for i in range(3)],     110, False, "spawn projectile frame 1"),
    ("swipe",     lambda: [f_swipe(i) for i in range(3)],      90, False, "melee; hit frame 1"),
    ("pounce",    lambda: [f_pounce(i) for i in range(2)],    140, False, "lunge attack"),
    ("alert",     lambda: [f_alert()],                        400, False, "enemy spotted"),
    ("scared",    lambda: [f_scared(i) for i in range(2)],    120, True,  "tremble"),
    ("hurt",      lambda: [f_hurt()],                         200, False, ""),
    ("ko",        lambda: [f_ko(i) for i in range(2)],        400, True,  "defeat splat"),
    ("celebrate", lambda: [f_celebrate(t) for t in range(4)], 150, True,  "level clear"),
    ("taunt",     lambda: [f_taunt(i) for i in range(2)],     200, True,  "butt wiggle"),
    ("sleep",     lambda: [f_sleep(t) for t in range(2)],     550, True,  ""),
    ("wake",      lambda: [f_wake(i) for i in range(2)],      300, False, "stretch + yawn"),
    ("trashdive", lambda: [f_trashdive(i) for i in range(4)], 160, True,  "SIGNATURE set piece"),
    ("portrait",  lambda: [f_portrait()],                       0, False, "HUD face"),
    ("props",     lambda: [f_props(i) for i in range(2)],       0, False, "trashcan upright/tipped"),
    ("items",     lambda: [f_items(i) for i in range(4)],       0, False, "pizza/fishbone/can/cookie"),
    ("fx_dust",   lambda: [f_fx_dust(i) for i in range(3)],    90, False, "landing/skid puff"),
    ("fx_sparkle",lambda: [f_fx_sparkle(i) for i in range(2)],120, True,  "pickup shine"),
    ("hearts",    lambda: [f_hearts(i) for i in range(3)],      0, False, "HUD full/half/empty"),
]

def build():
    os.makedirs("/home/claude/out5", exist_ok=True)
    built = [(name, fn(), dur, loop, note) for name, fn, dur, loop, note in ANIMS]
    maxc = max(len(fr) for _, fr, _, _, _ in built)

    # clean native sheet (game asset)
    sheet = Image.new("RGBA", (W * maxc, H * len(built)), CLEAR)
    for r, (name, frames, dur, loop, note) in enumerate(built):
        for c, f in enumerate(frames):
            sheet.paste(f, (c * W, r * H))
    sheet.save("/home/claude/out5/jimothy_v5_sheet_native.png")

    # labeled contact sheet at 3x with a gutter
    gut = 110
    S3 = 3
    lab = Image.new("RGBA", (gut + W * S3 * maxc, H * S3 * len(built)), (24, 22, 32, 255))
    dl = ImageDraw.Draw(lab)
    font = ImageFont.load_default()
    for r, (name, frames, dur, loop, note) in enumerate(built):
        y0 = r * H * S3
        dl.rectangle((0, y0, gut - 6, y0 + H * S3), fill=(36, 33, 46, 255))
        dl.text((8, y0 + 8), name.upper(), fill=(235, 233, 240, 255), font=font)
        dl.text((8, y0 + 22), f"{len(frames)}f {dur}ms", fill=(150, 148, 162, 255), font=font)
        dl.text((8, y0 + 34), "loop" if loop else "once", fill=(150, 148, 162, 255), font=font)
        if note:
            for li, chunk in enumerate([note[k:k + 16] for k in range(0, len(note), 16)][:5]):
                dl.text((8, y0 + 52 + li * 12), chunk, fill=(120, 118, 134, 255), font=font)
        for c, f in enumerate(frames):
            big = f.resize((W * S3, H * S3), Image.NEAREST)
            lab.alpha_composite(big, (gut + c * W * S3, y0))
            dl.rectangle((gut + c * W * S3, y0, gut + (c + 1) * W * S3 - 1, y0 + H * S3 - 1),
                         outline=(52, 48, 66, 255))
            dl.text((gut + c * W * S3 + 4, y0 + H * S3 - 16), str(c), fill=(120, 118, 134, 255), font=font)
    lab.save("/home/claude/out5/jimothy_v5_sheet_labeled_3x.png")

    # per-animation strips + gifs
    gif_rows = {"idle", "bored", "sneak", "walk", "run", "roll", "climb", "swim",
                "dig", "eat", "celebrate", "taunt", "trashdive", "scared", "hang", "push"}
    for name, frames, dur, loop, note in built:
        strip = Image.new("RGBA", (W * len(frames), H), CLEAR)
        for c, f in enumerate(frames):
            strip.paste(f, (c * W, 0))
        strip.resize((strip.width * SCALE, strip.height * SCALE), Image.NEAREST)\
             .save(f"/home/claude/out5/jimothy_v5_{name}_5x.png")
        if name in gif_rows and len(frames) > 1:
            fr = [f.resize((W * SCALE, H * SCALE), Image.NEAREST).convert("RGBA") for f in frames]
            bg = [Image.new("RGBA", f.size, (28, 26, 38, 255)) for f in fr]
            comp = [Image.alpha_composite(b, f) for b, f in zip(bg, fr)]
            comp[0].save(f"/home/claude/out5/jimothy_v5_{name}.gif", save_all=True,
                         append_images=comp[1:], duration=max(60, dur), loop=0)

    # JSON atlas for the game
    atlas = {
        "image": "jimothy_v5_sheet_native.png",
        "frame_w": W, "frame_h": H,
        "facing": "right",
        "anchors": {
            "feet_baseline_y": GROUND,
            "body_center": [MCX, MCY],
            "mouth": [SNT_XY[0] + 4, SNT_XY[1] + 1],
            "hands": [FRONT_HIP[0] + 4, FRONT_HIP[1]],
            "ledge_grip": [49, 11],
            "swim_waterline_y": 44,
            "throw_spawn": [64, 28],
            "swipe_hit_center": [58, 40],
        },
        "hitboxes": {
            "stand": {"x": 22, "y": 20, "w": 34, "h": 38},
            "sneak_swim": {"x": 20, "y": 28, "w": 38, "h": 30},
            "roll": {"x": 24, "y": 26, "w": 30, "h": 30},
            "ko": {"x": 18, "y": 38, "w": 42, "h": 20},
        },
        "animations": {},
    }
    for r, (name, frames, dur, loop, note) in enumerate(built):
        atlas["animations"][name] = {
            "row": r, "frames": len(frames), "duration_ms": dur, "loop": loop, "note": note,
        }
    with open("/home/claude/out5/jimothy_v5_atlas.json", "w") as fh:
        json.dump(atlas, fh, indent=2)

    print("rows:", len(built), "| total frames:", sum(len(fr) for _, fr, _, _, _ in built),
          "| native sheet:", sheet.size)
    return built

if __name__ == "__main__":
    build()
