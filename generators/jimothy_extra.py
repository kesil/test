"""
Jimothy EXTRA sheet — bosses, enemies & gag props for TRASH TALES.
Matches the v4/v5/v6 kit palette + outline style. Free-rect atlas (named sprites,
not uniform rows) packed into assets/jimothy_extra.png + jimothy_extra_atlas.json.

Sprites:
  binboss_*   B.I.N.-telligence 9000, the AI subscription trash can (stage 3 boss)
  gary_*      Gary, Seagull CEO of the Trash District (stage 5 boss)
  robot_*     sidewalk delivery robot enemy
  drone_*     delivery drone minion
  paper_*     Terms & Conditions projectile
  bread       artisanal sourdough bomb
  latte       cold-brew projectile
  popup       cookie-consent popup window
  paywall     TRASH PREMIUM paywall block
  crown       king-of-trash crown pickup
  neon        DUMP neon sign decor
"""
from PIL import Image, ImageDraw
import json, math, os

OUT   = (43, 36, 48, 255)
M3    = (214, 218, 226, 255)   # bright metal
M2    = (168, 174, 186, 255)
M1    = (120, 126, 142, 255)
M0    = (80, 84, 100, 255)
LED   = (96, 232, 232, 255)
LEDD  = (18, 58, 72, 255)
LEDR  = (240, 96, 96, 255)
RED   = (204, 74, 74, 255)
DRED  = (140, 46, 52, 255)
GOLD2 = (244, 210, 96, 255)
GOLD1 = (198, 150, 54, 255)
GOLD0 = (140, 98, 32, 255)
PAPER = (238, 236, 228, 255)
PAPS  = (196, 192, 182, 255)
INKL  = (120, 118, 128, 255)
W2    = (247, 245, 241, 255)   # gull white
W1    = (208, 204, 206, 255)
W0    = (160, 156, 162, 255)
BEAK  = (226, 158, 64, 255)
BEAKD = (168, 108, 40, 255)
BREAD1= (206, 160, 96, 255)
BREAD0= (160, 112, 58, 255)
BREADC= (232, 208, 160, 255)
CUP   = (222, 218, 212, 255)
BROWN = (120, 92, 70, 255)
GREEN = (96, 148, 96, 255)
DGREEN= (56, 100, 64, 255)
CLEAR = (0, 0, 0, 0)

def hsh(x, y, s=0):
    n = (int(x) * 73856093) ^ (int(y) * 19349663) ^ (int(s) * 83492791)
    return (n >> 8) & 0xffff

# ---- tiny 3x5 pixel font (uppercase + digits + few symbols) ----
FONT = {
 'A':"010101111101101",'B':"110101110101110",'C':"011100100100011",
 'D':"110101101101110",'E':"111100110100111",'F':"111100110100100",
 'G':"011100101101011",'H':"101101111101101",'I':"111010010010111",
 'J':"001001001101010",'K':"101110100110101",'L':"100100100100111",
 'M':"101111111101101",'N':"101111111111101",'O':"010101101101010",
 'P':"110101110100100",'R':"110101110110101",'S':"011100010001110",
 'T':"111010010010010",'U':"101101101101011",'V':"101101101101010",
 'W':"101101111111101",'Y':"101101010010010",'X':"101010010010101",
 '0':"010101101101010",'1':"010110010010111",'9':"010101011001010",
 '?':"110001010000010",'$':"010111100011110",'&':"010101010101011",
 '.':"000000000000010",'!':"010010010000010",'%':"101001010100101",
 '-':"000000111000000",'/':"001001010100100",
}
def text(d, x, y, s, c):
    cx = x
    for ch in s:
        if ch == ' ':
            cx += 4; continue
        g = FONT.get(ch)
        if g:
            for i, b in enumerate(g):
                if b == '1':
                    d.point((cx + i % 3, y + i // 3), fill=c)
        cx += 4
    return cx

def sheet(w, h):
    img = Image.new("RGBA", (w, h), CLEAR)
    return img, ImageDraw.Draw(img)

def outline(img):
    """1px OUT outline around every opaque pixel cluster."""
    w, h = img.size
    src = img.load()
    add = []
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 200 and src[nx, ny][:3] != OUT[:3]:
                        add.append((x, y)); break
    for x, y in add:
        src[x, y] = OUT
    return img

# ================= B.I.N.-TELLIGENCE 9000 =================
def draw_bin(mode, f):
    """64x76. mode: idle|open|mad|glitch|dead"""
    img, d = sheet(64, 76)
    bob = 1 if (mode in ('idle','mad') and f == 1) else 0
    by = 6 + bob                       # body top y
    dead = mode == 'dead'
    tilt = 2 if dead else 0
    # wheels
    for wx in (14, 44):
        d.ellipse((wx, 68, wx + 8, 75), fill=M0)
        d.ellipse((wx + 2, 70, wx + 6, 73), fill=M1)
    # body (rounded can)
    d.rounded_rectangle((8, by + 8, 56, 70), 6, fill=M2)
    # vertical sheen + ridges
    for y in range(by + 9, 69):
        for x in range(9, 56):
            n = hsh(x, y, 7)
            if x in (12, 51):
                d.point((x, y), fill=M1)
            elif x < 16 and n % 13 == 0:
                d.point((x, y), fill=M3)
            elif x > 46 and n % 11 == 0:
                d.point((x, y), fill=M1)
    d.line((10, by + 26, 54, by + 26), fill=M1)
    d.line((10, by + 44, 54, by + 44), fill=M1)
    if dead:
        # dents + crack
        d.line((20, by+30, 28, by+38), fill=M0); d.line((28, by+38, 22, by+46), fill=M0)
        d.ellipse((38, by+32, 46, by+38), fill=M1)
    # lid
    if mode == 'open':
        ang = -30 if f == 0 else -42
        d.rounded_rectangle((6, by - 2, 58, by + 10), 4, fill=M3)   # rim
        lid = Image.new("RGBA", (52, 10), CLEAR)
        ld = ImageDraw.Draw(lid)
        ld.rounded_rectangle((0, 0, 51, 9), 4, fill=M3)
        ld.line((2, 7, 49, 7), fill=M1)
        lid = lid.rotate(-ang, expand=True, resample=Image.NEAREST)
        img.paste(lid, (30, by - lid.size[1] + 2), lid)
        # glowing gullet
        d.ellipse((14, by, 50, by + 8), fill=LEDD)
        d.ellipse((20, by + 2, 44, by + 6), fill=(40, 110, 120, 255))
    else:
        d.rounded_rectangle((6, by - 2 + tilt, 58, by + 10), 4, fill=M3)
        d.line((8, by + 7 + tilt, 55, by + 7 + tilt), fill=M1)
        d.rectangle((26, by - 6 + tilt, 38, by - 1 + tilt), fill=M2)  # lid handle
    # antenna
    d.line((52, by - 8, 52, by - 2), fill=M1)
    d.ellipse((50, by - 12, 55, by - 7), fill=LEDR if mode == 'mad' else LED)
    # face screen
    sx, sy = 16, by + 14
    d.rounded_rectangle((sx, sy, sx + 32, sy + 20), 3, fill=LEDD)
    if mode == 'glitch':
        for y in range(sy + 2, sy + 19):
            off = (hsh(1, y, f) % 7) - 3
            d.line((sx + 3 + max(0, off), y, sx + 29 + min(0, off), y),
                   fill=LED if y % 3 else LEDR)
    elif dead:
        text(d, sx + 5, sy + 4, 'X X', M1)
        d.arc((sx + 8, sy + 12, sx + 24, sy + 22), 180, 360, fill=M1)  # frown
    elif mode == 'mad':
        d.line((sx + 5, sy + 5, sx + 12, sy + 9), fill=LEDR); d.line((sx + 27, sy + 5, sx + 20, sy + 9), fill=LEDR)
        d.rectangle((sx + 8, sy + 9, sx + 9, sy + 10), fill=LEDR); d.rectangle((sx + 23, sy + 9, sx + 24, sy + 10), fill=LEDR)
        d.arc((sx + 9, sy + 12, sx + 23, sy + 20), 180, 360, fill=LEDR)
        if f == 1:  # steam
            d.point((10, by - 4), fill=W1); d.point((8, by - 7), fill=W1)
    else:
        blink = (mode == 'idle' and f == 1)
        if blink:
            d.line((sx + 7, sy + 8, sx + 11, sy + 8), fill=LED); d.line((sx + 21, sy + 8, sx + 25, sy + 8), fill=LED)
        else:
            d.rectangle((sx + 8, sy + 5, sx + 10, sy + 10), fill=LED)
            d.rectangle((sx + 22, sy + 5, sx + 24, sy + 10), fill=LED)
        d.arc((sx + 10, sy + 10, sx + 22, sy + 17), 0, 180, fill=LED)  # customer-service smile
    # subscription sticker
    d.rectangle((40, by + 48, 54, by + 56), fill=PAPER)
    text(d, 42, by + 50, 'PRO', DRED)
    return outline(img)

# ================= GARY, SEAGULL CEO =================
def draw_gary(mode, f):
    """112x88. mode: fly|swoop|mad|dead. Faces LEFT (attacks player on left)."""
    img, d = sheet(112, 88)
    if mode == 'dead':
        # on back, feet up, sunglasses askew
        d.ellipse((24, 48, 88, 78), fill=W2)
        for i in range(160):
            x, y = 26 + hsh(i, 1) % 60, 50 + hsh(1, i) % 26
            if hsh(x, y, 3) % 5 == 0:
                d.point((x, y), fill=W1)
        d.ellipse((70, 40, 92, 58), fill=W2)                     # head lolling right
        d.polygon([(90, 48), (102, 52), (90, 54)], fill=BEAK)     # beak up-right
        d.line((78, 46, 86, 46), fill=M0)                         # shut eye
        d.rectangle((70, 40, 88, 44), fill=M0)                    # crooked shades
        for lx in (44, 60):                                       # legs up
            d.line((lx, 48, lx - 2, 34), fill=BEAK)
            d.line((lx - 5, 34, lx + 1, 34), fill=BEAK)
        d.polygon([(30, 56), (12, 62), (30, 66)], fill=W1)        # limp wing
        d.polygon([(52, 66, )+(0,)][0:0] or [(52, 66), (66, 72), (52, 74)], fill=RED)  # tie flopped
        return outline(img)
    wingup = (f == 0) if mode != 'swoop' else False
    bodyy = 34
    # tail
    d.polygon([(88, bodyy + 12), (106, bodyy + 6), (106, bodyy + 16)], fill=W1)
    # body
    d.ellipse((30, bodyy, 92, bodyy + 30), fill=W2)
    for i in range(220):
        x, y = 32 + hsh(i, 2) % 58, bodyy + 2 + hsh(2, i) % 26
        if hsh(x, y, 4) % 6 == 0:
            d.point((x, y), fill=W1)
    d.ellipse((34, bodyy + 16, 70, bodyy + 30), fill=W1)          # belly shade
    # wings
    if mode == 'swoop':
        d.polygon([(50, bodyy + 6), (96, bodyy - 22), (108, bodyy - 14), (66, bodyy + 12)], fill=W1)
        d.polygon([(50, bodyy + 8), (94, bodyy - 10), (100, bodyy - 2), (64, bodyy + 14)], fill=W0)
    elif wingup:
        d.polygon([(52, bodyy + 4), (78, bodyy - 26), (96, bodyy - 20), (68, bodyy + 10)], fill=W1)
        d.line((78, bodyy - 24, 92, bodyy - 19), fill=W0)
    else:
        d.polygon([(52, bodyy + 10), (84, bodyy + 30), (102, bodyy + 26), (70, bodyy + 6)], fill=W1)
    # head (left-facing)
    d.ellipse((14, 16, 44, 42), fill=W2)
    d.polygon([(16, 26), (0, 30), (16, 34)], fill=BEAK)           # beak
    d.line((2, 30, 14, 30), fill=BEAKD)
    mad = mode in ('mad', 'swoop')
    # tiny CEO sunglasses
    d.rectangle((18, 24, 26, 28), fill=M0)
    d.rectangle((30, 24, 38, 28), fill=M0)
    d.line((26, 25, 30, 25), fill=M0)
    if mad:
        d.point((20, 23), fill=LEDR); d.point((32, 23), fill=LEDR)
        for i in range(6):                                         # ruffled crest
            d.line((20 + i * 4, 15 - (hsh(i, 9) % 4), 20 + i * 4, 18), fill=W1)
    # necktie
    d.polygon([(30, 44), (38, 48), (34, 66), (26, 60)], fill=RED)
    d.polygon([(30, 44), (38, 48), (34, 52)], fill=DRED)
    # legs w/ latte in one foot when flying calm
    for i, lx in enumerate((48, 62)):
        d.line((lx, bodyy + 28, lx + 2, bodyy + 38), fill=BEAK)
        d.line((lx - 2, bodyy + 38, lx + 6, bodyy + 38), fill=BEAK)
    if mode == 'fly':
        d.rectangle((44, bodyy + 38, 52, bodyy + 48), fill=CUP)
        d.line((44, bodyy + 41, 52, bodyy + 41), fill=BROWN)
        d.rectangle((46, bodyy + 34, 50, bodyy + 38), fill=W1)
    return outline(img)

# ================= DELIVERY ROBOT =================
def draw_robot(f):
    """30x36 sidewalk delivery robot."""
    img, d = sheet(30, 36)
    # flag antenna
    d.line((24, 2, 24, 12), fill=M1)
    d.polygon([(24, 2), (30, 4), (24, 7)], fill=BEAK)
    # cooler body
    d.rounded_rectangle((2, 12, 27, 28), 3, fill=W2)
    d.rectangle((2, 17, 27, 19), fill=RED)      # brand stripe
    d.rounded_rectangle((2, 12, 27, 16), 3, fill=M3)  # lid
    # cute LED face
    d.rectangle((6, 21, 13, 26), fill=LEDD)
    d.point((8, 23), fill=LED); d.point((11, 23), fill=LED)
    text(d, 17, 21, '!', INKL)
    # 6 lil wheels
    off = 1 if f else 0
    for i in range(3):
        wx = 4 + i * 8 + off
        d.ellipse((wx, 28, wx + 5, 33), fill=M0)
        d.point((wx + 2, 30 + (f % 2)), fill=M2)
    return outline(img)

def draw_drone(f):
    """26x18 delivery quad-drone with claw."""
    img, d = sheet(26, 18)
    d.rounded_rectangle((8, 6, 18, 12), 2, fill=M1)
    d.point((11, 8), fill=LEDR); d.point((15, 8), fill=LEDR)
    for rx in (2, 20):
        ry = 2 if f == 0 else 3
        d.line((rx, ry, rx + 4, ry), fill=M2)
        d.line((rx + 2, ry, rx + 2, 6), fill=M0)
    d.line((13, 12, 13, 14), fill=M0)
    d.arc((10, 13, 16, 18), 300, 240, fill=M2)   # claw
    return outline(img)

# ================= PROJECTILES / PROPS =================
def draw_paper(f):
    img, d = sheet(14, 14)
    if f == 0:
        d.polygon([(1, 2), (12, 1), (13, 11), (2, 12)], fill=PAPER)
        for y in (4, 6, 8):
            d.line((4, y, 10, y), fill=INKL)
        text(d, 3, 9, 'T&C', DRED) if False else None
    else:
        d.polygon([(2, 4), (12, 2), (11, 10), (1, 11)], fill=PAPS)
        for y in (5, 7):
            d.line((4, y, 9, y), fill=INKL)
    return outline(img)

def draw_bread():
    img, d = sheet(18, 13)
    d.ellipse((1, 3, 16, 12), fill=BREAD1)
    d.ellipse((3, 4, 14, 9), fill=BREAD0)
    for i, sx in enumerate((4, 8, 12)):   # artisanal scoring
        d.line((sx, 4 + i % 2, sx + 2, 8), fill=BREADC)
    return outline(img)

def draw_latte():
    img, d = sheet(12, 16)
    d.polygon([(1, 4), (10, 4), (9, 14), (2, 14)], fill=CUP)
    d.rectangle((0, 6, 11, 8), fill=BROWN)     # sleeve
    d.rectangle((2, 1, 9, 4), fill=W1)         # lid
    d.point((5, 0), fill=W1)
    return outline(img)

def draw_popup():
    """80x54 cookie consent window."""
    img, d = sheet(80, 54)
    d.rectangle((0, 0, 79, 53), fill=PAPER)
    d.rectangle((0, 0, 79, 9), fill=(90, 110, 170, 255))
    text(d, 3, 2, 'NOTICE', W2)
    d.rectangle((71, 2, 77, 8), fill=RED)
    text(d, 73, 3, 'X', W2)
    text(d, 5, 14, 'THIS ALLEY', INKL)
    text(d, 5, 21, 'USES COOKIES', INKL)
    # cookie icon
    d.ellipse((58, 13, 72, 27), fill=BREAD1)
    for cx, cy in ((62, 17), (67, 20), (63, 23), (68, 15)):
        d.point((cx, cy), fill=BROWN)
    d.rounded_rectangle((5, 32, 43, 44), 2, fill=GREEN)
    text(d, 9, 36, 'ACCEPT', W2)
    d.rounded_rectangle((47, 32, 75, 44), 2, fill=PAPS)
    text(d, 50, 36, 'ALSO', INKL)
    text(d, 50, 41, 'ACCEPT', INKL) if False else None
    d.rectangle((0, 0, 79, 53), outline=OUT)
    return img

def draw_paywall(f):
    """48x64 golden PRO paywall."""
    img, d = sheet(48, 64)
    d.rectangle((2, 0, 45, 63), fill=GOLD1)
    for y in range(0, 64):
        for x in range(2, 46):
            n = hsh(x, y, 11 + f)
            if (x + y) % 8 == 0:
                d.point((x, y), fill=GOLD2)
            elif n % 17 == 0:
                d.point((x, y), fill=GOLD0)
    d.rectangle((2, 0, 45, 63), outline=GOLD0)
    # padlock
    d.rounded_rectangle((14, 26, 33, 44), 3, fill=M2)
    d.arc((17, 16, 30, 32), 180, 360, fill=M1)
    d.rectangle((22, 32, 25, 38), fill=M0)
    text(d, 14, 6, 'PRO', DRED)
    text(d, 6, 50, '$9.99/M', DRED)
    if f == 1:
        d.point((8, 12), fill=W2); d.point((40, 40), fill=W2); d.point((36, 8), fill=W2)
    return outline(img)

def draw_crown():
    img, d = sheet(16, 12)
    d.polygon([(1, 10), (1, 3), (5, 7), (8, 1), (11, 7), (15, 3), (15, 10)], fill=GOLD2)
    d.rectangle((1, 9, 15, 11), fill=GOLD1)
    d.point((4, 9), fill=RED); d.point((8, 9), fill=LED); d.point((12, 9), fill=RED)
    return outline(img)

def draw_neon(f):
    """44x18 flickering DUMP neon sign."""
    img, d = sheet(44, 18)
    d.rounded_rectangle((0, 0, 43, 17), 2, fill=(30, 26, 40, 255))
    c = LEDR if f == 0 else (120, 50, 60, 255)
    text(d, 6, 3, 'DUMP', c)
    text(d, 6, 10, 'OPEN', LED if f == 0 else LEDD)
    return img

# ================= PACK =================
SPRITES = {}
def add(name, img):
    SPRITES[name] = img

for i in range(2): add(f'binboss_idle_{i}', draw_bin('idle', i))
for i in range(2): add(f'binboss_open_{i}', draw_bin('open', i))
for i in range(2): add(f'binboss_mad_{i}', draw_bin('mad', i))
add('binboss_glitch_0', draw_bin('glitch', 0))
add('binboss_glitch_1', draw_bin('glitch', 1))
add('binboss_dead', draw_bin('dead', 0))
for i in range(2): add(f'gary_fly_{i}', draw_gary('fly', i))
add('gary_swoop', draw_gary('swoop', 0))
for i in range(2): add(f'gary_mad_{i}', draw_gary('mad', i))
add('gary_dead', draw_gary('dead', 0))
for i in range(2): add(f'robot_{i}', draw_robot(i))
for i in range(2): add(f'drone_{i}', draw_drone(i))
for i in range(2): add(f'paper_{i}', draw_paper(i))
add('bread', draw_bread())
add('latte', draw_latte())
add('popup', draw_popup())
for i in range(2): add(f'paywall_{i}', draw_paywall(i))
add('crown', draw_crown())
for i in range(2): add(f'neon_{i}', draw_neon(i))

# shelf packer
MAXW = 512
shelf_x, shelf_y, shelf_h = 0, 0, 0
places = {}
for name, im in SPRITES.items():
    w, h = im.size
    if shelf_x + w + 2 > MAXW:
        shelf_y += shelf_h + 2
        shelf_x, shelf_h = 0, 0
    places[name] = (shelf_x + 1, shelf_y + 1, w, h)
    shelf_x += w + 2
    shelf_h = max(shelf_h, h)
H = shelf_y + shelf_h + 2
atlas_img = Image.new("RGBA", (MAXW, H), CLEAR)
for name, im in SPRITES.items():
    x, y, w, h = places[name]
    atlas_img.paste(im, (x, y))

base = os.path.join(os.path.dirname(__file__), '..', 'assets')
atlas_img.save(os.path.join(base, 'jimothy_extra.png'))
with open(os.path.join(base, 'jimothy_extra_atlas.json'), 'w') as fo:
    json.dump({"image": "jimothy_extra.png",
               "sprites": {k: list(v) for k, v in places.items()}}, fo, indent=1)
atlas_img.resize((MAXW * 3, H * 3), Image.NEAREST).save(
    os.path.join(base, '..', 'generators', 'extra_preview_3x.png'))
print('packed', len(SPRITES), 'sprites ->', atlas_img.size)
