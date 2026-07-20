"""
Jimothy v4 — grounded in photos + The Oatmeal caricature.
Design law:
1. ONE fuzzy mound (~38x30 px), back arched high, no head shape at all.
2. Face embedded flat on the front-lower surface: one eye w/ highlight ring inside a
   soft mask patch, white brow/cheek, short snout bump w/ black nose.
3. Two small rounded ears ON TOP of the mound, spaced apart.
4. Spindly dark limbs with splayed fingers, clustered under the FRONT half;
   the rear of the mass hangs unsupported behind them.
5. Tail = small fluffy ringed pom at the back. Subordinate to the body.
6. Directional fur strokes + silhouette spikes + hash noise all over the mound.
Animations: idle4 walk6 run6 roll4 jump2 fall1 land2 dig4 sit1 hurt1 sleep2.
"""
from PIL import Image, ImageDraw
import math, os

W, H = 80, 64
SCALE = 5
GROUND = 58

OUT    = (43, 36, 48, 255)
FUR4   = (222, 220, 224, 255)
FUR3   = (196, 192, 200, 255)
FUR2   = (162, 158, 168, 255)
FUR1   = (120, 115, 132, 255)
FUR0   = (84, 78, 98, 255)
LIMB   = (98, 88, 104, 255)
RING   = (54, 48, 64, 255)
RING_HL= (94, 86, 108, 255)
MASK   = (108, 100, 118, 255)   # soft mask patch on the surface (side view)
MASKD  = (72, 64, 84, 255)
WHITE2 = (247, 245, 241, 255)
WHITE1 = (212, 207, 209, 255)
NOSE   = (32, 27, 38, 255)
NOSE_HL= (132, 122, 137, 255)
PINK   = (198, 142, 148, 255)
TONGUE = (212, 122, 130, 255)
EYE_W  = (255, 255, 255, 255)
DIRT   = (120, 92, 70, 255)
DIRT2  = (90, 68, 52, 255)
SHDW   = (30, 26, 40, 70)
ZZZ    = (172, 170, 192, 255)
CLEAR  = (0, 0, 0, 0)

def hsh(x, y, s=0):
    n = (int(x) * 73856093) ^ (int(y) * 19349663) ^ (int(s) * 83492791)
    return (n >> 8) & 0xffff

def new_frame():
    img = Image.new("RGBA", (W, H), CLEAR)
    return img, ImageDraw.Draw(img)

def px(d, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        d.point((int(x), int(y)), fill=c)

def draw_shadow(d, cx, w, air=0):
    w = max(6, w - air * 3)
    a = max(20, SHDW[3] - air * 18)
    d.ellipse((cx - w, GROUND + 1, cx + w, GROUND + 4), fill=(SHDW[0], SHDW[1], SHDW[2], a))

# ---------------- THE MOUND ----------------
def mound_pt(cx, cy, rx, ry, ang, arch):
    """Blob boundary: ellipse warped so the back-top arches higher and the front-low
    tucks in (face zone)."""
    c, s = math.cos(ang), math.sin(ang)
    r = 1.0
    r += 0.14 * math.exp(-((ang - (-2.2)) ** 2) / 0.5) * arch      # back-top bulge
    r -= 0.10 * math.exp(-((ang - (0.55)) ** 2) / 0.35)            # front-low tuck
    return cx + c * rx * r, cy + s * ry * r

def draw_mound(d, cx, cy, rx=19, ry=15, seed=0, arch=1.0):
    n = 72
    poly = [mound_pt(cx, cy, rx, ry, -math.pi + i * 2 * math.pi / n, arch) for i in range(n)]
    # outline pass (expanded)
    polyo = [mound_pt(cx, cy, rx + 1.2, ry + 1.2, -math.pi + i * 2 * math.pi / n, arch) for i in range(n)]
    d.polygon(polyo, fill=OUT)
    d.polygon(poly, fill=FUR2)
    # interior shading: distance from light point, fur noise
    lx, ly = cx - rx * 0.30, cy - ry * 0.62
    maxd = math.hypot(rx * 1.5, ry * 1.5)
    for y in range(int(cy - ry * 1.25), int(cy + ry) + 2):
        for x in range(int(cx - rx * 1.1), int(cx + rx * 1.1) + 1):
            # inside test vs warped boundary (approx via angle)
            ang = math.atan2((y - cy) / ry, (x - cx) / rx)
            bx, by = mound_pt(cx, cy, rx, ry, ang, arch)
            din = math.hypot(x - cx, (y - cy) * rx / ry)
            dbd = math.hypot(bx - cx, (by - cy) * rx / ry)
            if din >= dbd - 0.5:
                continue
            dist = math.hypot(x - lx, y - ly) / maxd
            dist += ((hsh(x, y, seed) % 9) - 4) * 0.017
            edge = din > dbd - 2.5
            if edge:
                c = FUR4 if y < cy - ry * 0.2 else (FUR0 if y > cy + ry * 0.45 else FUR1)
            elif dist < 0.28: c = FUR4
            elif dist < 0.44: c = FUR3
            elif dist < 0.68: c = FUR2
            elif dist < 0.88: c = FUR1
            else:             c = FUR0
            px(d, x, y, c)
    # directional fur strokes (sketchy, follow contour downward-back)
    for k in range(16):
        a = -2.9 + (hsh(k, seed, 5) % 100) / 100 * 2.6
        rr = 0.35 + (hsh(seed, k, 6) % 100) / 100 * 0.5
        sx = cx + math.cos(a) * rx * rr
        sy = cy + math.sin(a) * ry * rr
        c = FUR3 if sy < cy else FUR1
        if hsh(k, seed) % 3 == 0:
            c = FUR4 if sy < cy else FUR0
        d.line((sx, sy, sx - 2, sy + 2), fill=c)
        px(d, sx - 3, sy + 3, c)
    # silhouette spikes (scruff) all around except the very bottom
    for i in range(0, n, 4):
        ang = -math.pi + i * 2 * math.pi / n
        if math.sin(ang) > 0.75:
            continue
        bx, by = mound_pt(cx, cy, rx + 1.2, ry + 1.2, ang, arch)
        ox, oy = math.cos(ang), math.sin(ang)
        px(d, bx + ox * 1.5, by + oy * 1.5, OUT)
        if hsh(i, seed) % 2:
            px(d, bx + ox * 2.5, by + oy * 2.5, OUT)
        ix, iy = mound_pt(cx, cy, rx - 0.5, ry - 0.5, ang, arch)
        px(d, ix, iy, FUR4 if oy < -0.2 else FUR2)

# ---------------- EARS ON TOP ----------------
def draw_ears(d, cx, cy, ry, arch, perk=0):
    """Two small rounded ears sitting directly on the mound's top, spaced apart."""
    for ang, lean in ((-2.25, -1), (-1.15, 1)):        # back ear, front ear
        ex, ey = mound_pt(cx, cy, 19 + 1.2, ry + 1.2, ang, arch)
        ey -= perk
        d.ellipse((ex - 4, ey - 6, ex + 4, ey + 2), fill=OUT)
        d.ellipse((ex - 3, ey - 5, ex + 3, ey + 1), fill=FUR2)
        d.ellipse((ex - 2, ey - 4, ex + 2, ey), fill=FUR1)
        d.ellipse((ex - 1, ey - 3, ex + 1, ey - 1), fill=PINK)
        px(d, ex - 3 * lean, ey - 5, FUR4)             # ear-edge light
        # scruff at ear base
        px(d, ex - 4, ey + 1, OUT); px(d, ex + 4, ey, OUT)

# ---------------- FACE ON THE SURFACE ----------------
def draw_face(d, fx, fy, expr="normal", mouth="closed"):
    """Face embedded flat on the mound's front-lower surface. fx,fy = eye center.
    Side view: ONE eye, soft mask patch, white brow+cheek, short snout bump."""
    # soft mask patch (surface shading, not a band)
    d.ellipse((fx - 6, fy - 4, fx + 7, fy + 5), fill=MASK)
    d.ellipse((fx - 4, fy - 2, fx + 6, fy + 4), fill=MASKD)
    for yy in range(fy - 4, fy + 6):
        for xx in range(fx - 6, fx + 8):
            if hsh(xx, yy, 11) % 5 == 0:
                px(d, xx, yy, MASK)
    # white brow arc above eye + cheek below
    d.arc((fx - 4, fy - 6, fx + 5, fy + 2), 200, 340, fill=WHITE2)
    d.arc((fx - 4, fy - 5, fx + 5, fy + 3), 210, 330, fill=WHITE1)
    d.ellipse((fx - 3, fy + 4, fx + 5, fy + 7), fill=WHITE1)
    d.ellipse((fx - 2, fy + 4, fx + 4, fy + 6), fill=WHITE2)
    # the eye
    if expr == "blink" or expr == "sleep":
        d.line((fx - 2, fy, fx + 2, fy), fill=OUT)
        if expr == "sleep":
            d.arc((fx - 2, fy - 1, fx + 2, fy + 2), 0, 180, fill=OUT)
    elif expr == "dizzy":
        px(d, fx - 2, fy - 2, EYE_W); px(d, fx + 2, fy - 2, EYE_W)
        px(d, fx, fy, EYE_W)
        px(d, fx - 2, fy + 2, EYE_W); px(d, fx + 2, fy + 2, EYE_W)
    elif expr == "alarmed":
        d.ellipse((fx - 3, fy - 3, fx + 3, fy + 3), fill=EYE_W)
        d.ellipse((fx - 1, fy - 1, fx + 1, fy + 1), fill=OUT)
        px(d, fx - 1, fy - 2, EYE_W)
    elif expr == "worried":
        d.ellipse((fx - 2, fy - 2, fx + 2, fy + 2), fill=EYE_W)
        px(d, fx, fy + 1, OUT); px(d, fx + 1, fy + 1, OUT)
    else:  # normal: round dark eye with highlight ring (Oatmeal style)
        d.ellipse((fx - 2, fy - 2, fx + 2, fy + 2), fill=OUT)
        d.arc((fx - 2, fy - 2, fx + 2, fy + 2), 120, 300, fill=FUR1)
        px(d, fx - 1, fy - 1, EYE_W)
    return

def draw_snout(d, sx, sy, mouth="closed"):
    """Short snout bump protruding from the mound edge at (sx,sy)."""
    d.polygon([(sx - 3, sy - 3), (sx + 5, sy - 1), (sx + 4, sy + 2), (sx - 3, sy + 3)], fill=OUT)
    d.polygon([(sx - 3, sy - 2), (sx + 4, sy - 1), (sx + 3, sy + 1), (sx - 3, sy + 2)], fill=WHITE2)
    px(d, sx - 2, sy + 2, WHITE1); px(d, sx - 1, sy + 2, WHITE1)
    # nose
    d.rectangle((sx + 3, sy - 1, sx + 5, sy + 1), fill=NOSE)
    px(d, sx + 3, sy - 1, NOSE_HL)
    # mouth
    if mouth == "open":
        d.polygon([(sx - 1, sy + 3), (sx + 3, sy + 2), (sx + 1, sy + 5)], fill=OUT)
        px(d, sx + 1, sy + 4, TONGUE)
    elif mouth == "pant":
        d.line((sx - 1, sy + 3, sx + 2, sy + 3), fill=OUT)
        px(d, sx, sy + 4, TONGUE); px(d, sx, sy + 5, TONGUE)
    else:
        d.line((sx - 1, sy + 3, sx + 2, sy + 2), fill=OUT)
    px(d, sx - 2, sy, FUR1)   # whisker dot

# ---------------- STUB TAIL ----------------
def draw_tail(d, bx, by, sway=0):
    """Small fluffy ringed pom. Subordinate to the mound."""
    segs = [(bx, by, 4.5, False), (bx - 4, by - 2 - sway, 4.0, True),
            (bx - 7, by - 4 - sway * 2, 3.0, False), (bx - 9, by - 6 - sway * 2, 2.0, True)]
    for x, y, r, ring in segs:
        d.ellipse((x - r - 1, y - r - 1, x + r + 1, y + r + 1), fill=OUT)
    for x, y, r, ring in segs:
        d.ellipse((x - r, y - r, x + r, y + r), fill=RING if ring else FUR2)
        if r >= 2.5:
            d.ellipse((x - r + 1, y - r + 1, x + r - 1, y - r + 2), fill=RING_HL if ring else FUR3)
            d.ellipse((x - r + 1, y + r - 2, x + r - 1, y + r - 1), fill=OUT if ring else FUR1)
    # spiky fluff
    for k, (x, y, r, ring) in enumerate(segs):
        px(d, x, y - r - 2, OUT); px(d, x + 1, y - r - 1, FUR3)
        px(d, x - 1, y + r + 2, OUT)

# ---------------- SPINDLY FINGERED LIMBS ----------------
def draw_fingers(d, x, y, col, splay=1, planted=True):
    """3 thin fingers fanning from the foot."""
    if planted:
        for ddx, ddy in ((2, 0), (2 + splay, 1), (1, 1)):
            d.line((x, y, x + ddx + 1, y + ddy), fill=col)
    else:
        for ddx, ddy in ((1, 2), (2, 2), (0, 3)):
            d.line((x, y, x + ddx, y + ddy), fill=col)

def limb(d, hipx, hipy, footx, footy, col, kind="front", planted=True, splay=1):
    """Thin two-segment limb with a knee/elbow bend and splayed fingers."""
    if kind == "front":
        kx = (hipx + footx) / 2 - 1
        ky = (hipy + footy) / 2 + 1
    else:  # hind: knee juts backward, thigh slightly thicker
        kx = (hipx + footx) / 2 - 3
        ky = (hipy + footy) / 2
        d.line((hipx + 1, hipy, kx + 1, ky), fill=col)     # thigh thickness
    d.line((hipx, hipy, kx, ky), fill=col)
    d.line((kx, ky, footx, footy), fill=col)
    draw_fingers(d, footx, footy, col, splay=splay, planted=planted)

def stride(base_x, ground, phase, reach=5, lift=4):
    th = phase * 2 * math.pi
    fx = base_x + math.cos(th) * reach
    fy = ground - max(0.0, math.sin(th)) * lift
    return fx, fy, math.sin(th) <= 0.05

# Limb anchor points: clustered under the FRONT half of the mound.
# mound center (38,34): front half is x>38. Rear of mass (x 19..30) hangs behind.
HIND_HIP = (36, 44)
FRONT_HIP = (47, 45)

def limbs_far(d, phase, gait, ground=GROUND, dy=0):
    if gait == "tuck":
        return
    if gait == "stand":
        limb(d, HIND_HIP[0] - 2, HIND_HIP[1] + dy, 33, ground, FUR0, "hind")
        limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] + dy, 44, ground, FUR0, "front")
        return
    r, l = (6, 5) if gait == "run" else (4, 3)
    fx, fy, pl = stride(33, ground, phase + 0.5, r, l)
    limb(d, HIND_HIP[0] - 2, HIND_HIP[1] + dy, fx, fy, FUR0, "hind", planted=pl)
    fx, fy, pl = stride(44, ground, phase + 0.75, r, l)
    limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] + dy, fx, fy, FUR0, "front", planted=pl)

def limbs_near(d, phase, gait, ground=GROUND, dy=0):
    if gait == "tuck":
        # limbs dangle straight down, fingers splayed (Oatmeal jump pose)
        limb(d, HIND_HIP[0], HIND_HIP[1] + dy, HIND_HIP[0] - 2, HIND_HIP[1] + dy + 8, OUT, "hind", planted=False)
        limb(d, FRONT_HIP[0], FRONT_HIP[1] + dy, FRONT_HIP[0] + 1, FRONT_HIP[1] + dy + 9, OUT, "front", planted=False)
        return
    if gait == "stand":
        limb(d, HIND_HIP[0], HIND_HIP[1] + dy, 37, ground, OUT, "hind", splay=2)
        limb(d, FRONT_HIP[0], FRONT_HIP[1] + dy, 49, ground, OUT, "front", splay=2)
        return
    r, l = (6, 5) if gait == "run" else (4, 3)
    fx, fy, pl = stride(37, ground, phase, r, l)
    limb(d, HIND_HIP[0], HIND_HIP[1] + dy, fx, fy, OUT, "hind", planted=pl, splay=2)
    fx, fy, pl = stride(49, ground, phase + 0.25, r, l)
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + dy, fx, fy, OUT, "front", planted=pl, splay=2)

# ================= FRAMES =================
MCX, MCY = 38, 34         # mound center
EYE_XY = (52, 33)         # eye on the front-lower surface
SNT_XY = (59, 37)         # snout bump at the mound edge
TAIL_XY = (23, 27)        # stub tail at back

def scene(d, dy=0, squash=0, seed=0, arch=1.0, ear=0, expr="normal", mouth="closed",
          sway=0, phase=0.0, gait="stand", ground=GROUND, air=0, face=True):
    cy = MCY + dy
    draw_shadow(d, MCX + 2, 21, air=air)
    draw_tail(d, TAIL_XY[0], TAIL_XY[1] + dy, sway=sway)
    limbs_far(d, phase, gait, ground, dy)
    draw_mound(d, MCX, cy, rx=19 + squash, ry=15 - squash, seed=seed, arch=arch)
    draw_ears(d, MCX, cy, 15 - squash, arch, perk=ear)
    limbs_near(d, phase, gait, ground, dy)
    if face:
        draw_face(d, EYE_XY[0], EYE_XY[1] + dy + squash // 2, expr=expr)
        draw_snout(d, SNT_XY[0] + squash, SNT_XY[1] + dy + squash // 2, mouth=mouth)
    return cy

def f_idle(t):
    img, d = new_frame()
    br = [0, 1, 1, 0][t]
    scene(d, dy=br, squash=br, seed=t, ear=[0, 0, 2, 0][t],
          expr="blink" if t == 3 else "normal", sway=[0, 1, 0, -1][t])
    return img

def f_walk(i, n=6):
    img, d = new_frame()
    ph = i / n
    th = ph * 2 * math.pi
    bounce = int(round(abs(math.sin(th)) * 1.4 + math.sin(2 * th) * 0.9 + 0.9))
    scene(d, dy=-bounce, seed=i, phase=ph, gait="walk",
          sway=int(round(math.sin(th + 0.6))), mouth="closed")
    return img

def f_run(i, n=6):
    img, d = new_frame()
    ph = i / n
    key = [   # dy, squash, gait, air
        (2, 1, "run", 0),     # gather
        (0, 0, "run", 0),     # push
        (-5, -1, "tuck", 1),  # airborne
        (-6, -1, "tuck", 2),  # apex
        (-2, 0, "run", 0),    # reach
        (1, 1, "run", 0),     # touch
    ][i]
    dy, sq, gait, air = key
    scene(d, dy=dy, squash=sq, seed=i, phase=ph, gait=gait, air=air,
          expr="alarmed" if air else "normal", mouth="pant" if air else "open",
          ear=-1 - air, sway=2 if air else 0)
    # kicked-up debris behind (Oatmeal dirt flecks)
    for k in range(5 + air * 2):
        x = 16 - k * 2 - hsh(i, k) % 4
        y = GROUND - (hsh(k, i * 3) % 7)
        px(d, x, y, DIRT2 if k % 2 else FUR1)
        if k % 3 == 0:
            px(d, x + 1, y + 1, DIRT)
    if air:
        for yy in (MCY + dy - 6, MCY + dy + 3):
            d.line((3, yy, 10 + hsh(i, yy) % 4, yy), fill=(FUR2[0], FUR2[1], FUR2[2], 130))
    return img

def f_roll(i, n=4):
    img, d = new_frame()
    cy = MCY + 6
    r = 16
    draw_shadow(d, MCX, 15)
    # pure furry sphere
    draw_mound(d, MCX, cy, rx=r, ry=r - 1, seed=100 + i, arch=0.0)
    a0 = i * 90
    for k in range(3):
        ang = math.radians(a0 + k * 120)
        x1 = MCX + math.cos(ang) * (r - 2); y1 = cy + math.sin(ang) * (r - 2)
        x2 = MCX - math.cos(ang) * (r - 2); y2 = cy - math.sin(ang) * (r - 2)
        d.line((x1, y1, x2, y2), fill=RING, width=3)
        d.line((x1, y1 - 1, x2, y2 - 1), fill=RING_HL, width=1)
    d.ellipse((MCX - r - 1, cy - r, MCX + r + 1, cy + r), outline=OUT, width=2)
    # ears whip around
    ea = math.radians(-60 + (a0 % 90) - 45)
    ex, ey = MCX + math.cos(ea) * (r + 1), cy + math.sin(ea) * r
    d.ellipse((ex - 3, ey - 4, ex + 3, ey + 1), fill=OUT)
    px(d, ex, ey - 2, FUR1)
    # fingers poking out mid-roll (comedy)
    fa = math.radians(a0 + 200)
    fx, fy = MCX + math.cos(fa) * (r + 1), cy + math.sin(fa) * r
    draw_fingers(d, fx, fy, OUT, planted=False)
    for k in range(6):
        x = max(3, MCX - 17 - k * 2 - hsh(i, k) % 3)
        y = GROUND - (hsh(k, i) % 6)
        px(d, x, y, WHITE1); px(d, x - 1, y, FUR2); px(d, x, y + 1, DIRT2)
    d.arc((MCX - r - 4, cy - r - 4, MCX + r + 4, cy + r + 4), a0, a0 + 90,
          fill=(FUR3[0], FUR3[1], FUR3[2], 150))
    d.arc((MCX - r - 4, cy - r - 4, MCX + r + 4, cy + r + 4), a0 + 180, a0 + 270,
          fill=(FUR3[0], FUR3[1], FUR3[2], 150))
    return img

def f_jump(i):
    img, d = new_frame()
    if i == 0:  # crouch: squash wide, limbs coiled, ears flat
        scene(d, dy=5, squash=3, seed=20, gait="stand", ear=-2, expr="alarmed")
    else:       # launch: stretch tall, limbs dangling w/ splayed fingers
        scene(d, dy=-8, squash=-2, seed=21, gait="tuck", air=2, ear=1,
              expr="normal", mouth="open", sway=2)
        for yy in (GROUND - 2, GROUND - 5):
            px(d, MCX - 5, yy, WHITE1); px(d, MCX + 6, yy + 1, WHITE1)
    return img

def f_fall():
    img, d = new_frame()
    scene(d, dy=-7, squash=-1, seed=30, gait="tuck", air=2, ear=3,
          expr="worried", sway=3)
    return img

def f_land(i):
    img, d = new_frame()
    if i == 0:
        scene(d, dy=6, squash=4, seed=40, gait="stand", ear=-3, expr="blink")
        for k in range(6):
            x = MCX - 22 + k * 9 + hsh(k, 1) % 3
            y = GROUND - 1 - (hsh(1, k) % 3)
            px(d, x, y, WHITE1); px(d, x + 1, y, DIRT2); px(d, x, y - 1, WHITE1)
    else:
        scene(d, dy=2, squash=1, seed=41, gait="stand", expr="normal")
    return img

def f_dig(i):
    """Nose to the ground, fingered paws scratching, debris flying."""
    img, d = new_frame()
    tilt = 3 + (i % 2)  # whole mass pitched forward, rocking with each scratch
    cy = MCY + tilt
    draw_shadow(d, MCX + 2, 21)
    draw_tail(d, TAIL_XY[0] + 1, TAIL_XY[1] - 2, sway=1 if i % 2 else -1)
    limbs_far(d, 0, "stand", dy=tilt)
    draw_mound(d, MCX, cy, rx=19, ry=15, seed=50 + i, arch=1.2)
    draw_ears(d, MCX, cy, 15, 1.2, perk=1)
    # hind near limb planted; front paws alternate scratch
    limb(d, HIND_HIP[0], HIND_HIP[1] + tilt, 37, GROUND, OUT, "hind", splay=2)
    up = i % 2
    limb(d, FRONT_HIP[0], FRONT_HIP[1] + tilt, 50, GROUND - (5 if up else 0), OUT, "front",
         planted=not up, splay=2)
    limb(d, FRONT_HIP[0] - 2, FRONT_HIP[1] + tilt, 46, GROUND - (0 if up else 5), FUR0, "front",
         planted=up)
    # face pitched down at the ground
    draw_face(d, EYE_XY[0] + 1, EYE_XY[1] + tilt + 6, expr="blink" if i in (1, 3) else "normal")
    draw_snout(d, SNT_XY[0] - 1, GROUND - 3, mouth="closed")
    # debris arcs
    for k in range(3 + i):
        x = 56 + hsh(i, k) % 10
        y = GROUND - 5 - (hsh(k, i + 9) % 9)
        px(d, x, y, DIRT); px(d, x + 1, y + 1, DIRT2)
    for k in range(5):
        px(d, 54 + k * 2, GROUND, DIRT2)
    return img

def f_sit():
    """Mound rears upright; belly exposed; fingered paws held up; hind feet forward."""
    img, d = new_frame()
    cx, cy = 38, 32
    draw_shadow(d, cx, 17)
    draw_tail(d, TAIL_XY[0] + 2, GROUND - 8, sway=1)
    # upright egg mound
    draw_mound(d, cx, cy, rx=15, ry=19, seed=55, arch=0.6)
    draw_ears(d, cx, cy, 19, 0.6, perk=1)
    # belly patch
    d.ellipse((cx - 7, cy + 2, cx + 9, cy + 16), fill=FUR3)
    for yv in range(cy + 2, cy + 16):
        for xv in range(cx - 7, cx + 10):
            if hsh(xv, yv, 3) % 9 == 0:
                px(d, xv, yv, FUR2)
    # hind feet forward w/ fingers
    for fx0 in (cx - 4, cx + 4):
        d.line((fx0, GROUND - 2, fx0 + 4, GROUND - 1), fill=OUT)
        draw_fingers(d, fx0 + 4, GROUND - 1, OUT, splay=2)
    # front paws raised at chest, fingers curled
    for pxx in (cx + 2, cx + 8):
        d.line((pxx, cy + 4, pxx + 2, cy + 1), fill=OUT)
        draw_fingers(d, pxx + 2, cy + 1, OUT, planted=False)
    # face high on the upright mound
    draw_face(d, cx + 9, cy - 8, expr="alarmed")
    draw_snout(d, cx + 16, cy - 4)
    return img

def f_hurt():
    img, d = new_frame()
    scene(d, dy=3, squash=3, seed=60, gait="stand", ear=-3, expr="dizzy",
          mouth="open", sway=-2)
    for sx, sy in ((48, 8), (58, 12), (53, 5)):
        px(d, sx, sy, FUR4); px(d, sx - 1, sy, OUT); px(d, sx + 1, sy, OUT)
        px(d, sx, sy - 1, OUT); px(d, sx, sy + 1, OUT)
    return img

def f_sleep(t):
    img, d = new_frame()
    br = t
    cx, cy = 38, 40 - br
    draw_shadow(d, cx, 19)
    draw_mound(d, cx, cy, rx=20, ry=13 + br, seed=70 + t, arch=0.4)
    # tail pom tucked at the front-bottom
    draw_tail(d, cx + 12, GROUND - 5, sway=0)
    # ears barely poking
    draw_ears(d, cx, cy, 13 + br, 0.4, perk=-2)
    # closed eye + snout tucked low
    draw_face(d, cx + 12, cy + 1, expr="sleep")
    zs = [(58, 16), (63, 10)] if t == 0 else [(59, 13), (64, 7)]
    for k, (zx, zy) in enumerate(zs):
        s = 2 + k
        d.line((zx, zy, zx + s, zy), fill=ZZZ)
        d.line((zx + s, zy, zx, zy + s), fill=ZZZ)
        d.line((zx, zy + s, zx + s, zy + s), fill=ZZZ)
    return img

# ================= build =================
def build():
    anims = {
        "idle":  [f_idle(t) for t in range(4)],
        "walk":  [f_walk(i) for i in range(6)],
        "run":   [f_run(i) for i in range(6)],
        "roll":  [f_roll(i) for i in range(4)],
        "jump":  [f_jump(i) for i in range(2)],
        "fall":  [f_fall()],
        "land":  [f_land(i) for i in range(2)],
        "dig":   [f_dig(i) for i in range(4)],
        "sit":   [f_sit()],
        "hurt":  [f_hurt()],
        "sleep": [f_sleep(t) for t in range(2)],
    }
    os.makedirs("/home/claude/out4", exist_ok=True)
    maxc = max(len(v) for v in anims.values())
    sheet = Image.new("RGBA", (W * maxc, H * len(anims)), CLEAR)
    for r, (name, frames) in enumerate(anims.items()):
        for c, f in enumerate(frames):
            sheet.paste(f, (c * W, r * H))
    sheet.save("/home/claude/out4/jimothy_v4_sheet_native.png")
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST)\
         .save("/home/claude/out4/jimothy_v4_sheet_4x.png")
    for name, frames in anims.items():
        strip = Image.new("RGBA", (W * len(frames), H), CLEAR)
        for c, f in enumerate(frames):
            strip.paste(f, (c * W, 0))
        strip.resize((strip.width * SCALE, strip.height * SCALE), Image.NEAREST)\
             .save(f"/home/claude/out4/jimothy_v4_{name}_5x.png")
    durs = {"walk": 130, "run": 95, "roll": 80, "idle": 220, "dig": 150, "sleep": 550}
    for name in durs:
        fr = [f.resize((W * SCALE, H * SCALE), Image.NEAREST).convert("RGBA") for f in anims[name]]
        bg = [Image.new("RGBA", f.size, (28, 26, 38, 255)) for f in fr]
        comp = [Image.alpha_composite(b, f) for b, f in zip(bg, fr)]
        comp[0].save(f"/home/claude/out4/jimothy_v4_{name}.gif", save_all=True,
                     append_images=comp[1:], duration=durs[name], loop=0)
    print("rows:", {k: len(v) for k, v in anims.items()}, "| sheet:", sheet.size)

if __name__ == "__main__":
    build()
