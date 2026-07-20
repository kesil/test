"""
Jimothy v7 — Director's Cut sheet: new enemies, pickups, steamroller & office tileset.
Matches kit palette/outline style.

Outputs:
  assets/jimothy_extra2.png + jimothy_extra2_atlas.json   (named free-rect sprites)
  assets/jimothy_office.png + jimothy_office.json          (16px office tileset, 8x3)
"""
from PIL import Image, ImageDraw
import json, os

OUT   = (43, 36, 48, 255)
M3    = (214, 218, 226, 255)
M2    = (168, 174, 186, 255)
M1    = (120, 126, 142, 255)
M0    = (80, 84, 100, 255)
LED   = (96, 232, 232, 255)
LEDR  = (240, 96, 96, 255)
LEDG  = (120, 230, 120, 255)
RED   = (204, 74, 74, 255)
GOLD2 = (244, 210, 96, 255)
GOLD1 = (198, 150, 54, 255)
GOLD0 = (140, 98, 32, 255)
PAPER = (238, 236, 228, 255)
INKL  = (120, 118, 128, 255)
CROW1 = (58, 54, 74, 255)     # crow body (blue-black sheen)
CROW0 = (38, 34, 52, 255)
CROWH = (96, 92, 128, 255)
BEAK  = (226, 158, 64, 255)
VEST  = (232, 130, 60, 255)   # puffer vest orange
KHAKI = (196, 176, 140, 255)
SKIN  = (222, 178, 148, 255)
HOOD  = (110, 118, 134, 255)
PURP2 = (156, 108, 208, 255)  # wizard purple
PURP1 = (110, 70, 160, 255)
YEL   = (240, 220, 120, 255)
ROLLER= (188, 160, 60, 255)   # construction yellow
ROLLERD=(140, 116, 40, 255)
DRUM  = (140, 146, 160, 255)
CLEAR = (0, 0, 0, 0)

def hsh(x, y, s=0):
    n = (int(x) * 73856093) ^ (int(y) * 19349663) ^ (int(s) * 83492791)
    return (n >> 8) & 0xffff

def sheet(w, h):
    img = Image.new("RGBA", (w, h), CLEAR)
    return img, ImageDraw.Draw(img)

def outline(img):
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

# ---------- enemies ----------
def draw_crow(mode, f):
    """fly: 28x20, perch: 20x22. Faces right."""
    if mode == 'perch':
        img, d = sheet(20, 22)
        d.ellipse((3, 6, 16, 18), fill=CROW1)
        d.ellipse((10, 2, 19, 10), fill=CROW1)                  # head
        d.polygon([(18, 5), (24, 6), (18, 8)], fill=M1)          # gray beak
        d.point((15, 5), fill=PAPER)                             # eye
        d.polygon([(4, 9), (12, 12), (5, 15)], fill=CROW0)       # folded wing
        d.line((8, 18, 8, 21), fill=M1); d.line((12, 18, 12, 21), fill=M1)
        d.point((5, 8), fill=CROWH)
        return outline(img)
    img, d = sheet(28, 20)
    d.ellipse((4, 8, 20, 17), fill=CROW1)
    d.ellipse((15, 4, 25, 12), fill=CROW1)
    d.polygon([(24, 7), (28, 8), (24, 10)], fill=M1)
    d.point((21, 7), fill=PAPER)
    d.polygon([(0, 14), (8, 12), (6, 16)], fill=CROW0)           # tail
    if f == 0:
        d.polygon([(8, 9), (16, -2), (22, 2), (14, 11)], fill=CROW0)
        d.point((17, 1), fill=CROWH)
    else:
        d.polygon([(8, 12), (16, 20), (22, 17), (14, 11)], fill=CROW0)
    return outline(img)

def draw_roomba(f):
    img, d = sheet(26, 12)
    d.rounded_rectangle((1, 2, 24, 10), 5, fill=M0)
    d.rounded_rectangle((3, 3, 22, 6), 4, fill=M1)
    d.point((6, 4), fill=LEDG if f == 0 else M1)
    d.rectangle((11, 3, 14, 5), fill=M2)                          # sensor turret
    d.ellipse((4, 8, 8, 11), fill=OUT); d.ellipse((17, 8, 21, 11), fill=OUT)
    if f == 1:
        d.point((0, 10), fill=M2); d.point((25, 10), fill=M2)     # dust
    return outline(img)

def draw_scooter(f):
    """30x40 tech bro on e-scooter, facing right."""
    img, d = sheet(30, 40)
    lean = 1 if f else 0
    # scooter deck + pole + wheels
    d.rectangle((4, 33, 22, 35), fill=M1)
    d.ellipse((2, 34, 8, 40), fill=M0); d.ellipse((18, 34, 24, 40), fill=M0)
    d.point((5, 37), fill=M2); d.point((21, 37), fill=M2)
    d.line((21, 33, 26 - lean, 14), fill=M1)
    d.line((23 - lean, 14, 28 - lean, 14), fill=M1)               # handlebar
    # legs (khaki)
    d.rectangle((9, 26, 12, 33), fill=KHAKI)
    d.rectangle((13, 26, 16, 33), fill=KHAKI)
    # torso: puffer vest over hoodie
    d.rectangle((7, 15, 18, 27), fill=HOOD)
    d.rectangle((8, 16, 17, 26), fill=VEST)
    d.line((10, 17, 10, 25), fill=(200, 100, 40, 255))
    d.line((14, 17, 14, 25), fill=(200, 100, 40, 255))
    # arm to handlebar
    d.line((16, 18, 24 - lean, 15), fill=HOOD)
    # arm holding phone
    d.line((9, 19, 5, 23), fill=HOOD)
    d.rectangle((3, 22, 6, 27), fill=M0); d.point((4, 24), fill=LED)
    # head + beanie + airpod
    d.ellipse((10, 6, 19, 15), fill=SKIN)
    d.rectangle((9, 5, 20, 9), fill=(90, 90, 110, 255))           # beanie
    d.point((18, 11), fill=OUT)                                    # eye
    d.point((11, 12), fill=PAPER)                                  # airpod
    return outline(img)

def draw_printer(f):
    img, d = sheet(28, 22)
    d.rounded_rectangle((1, 6, 26, 19), 2, fill=PAPER)
    d.rectangle((1, 11, 26, 13), fill=(210, 206, 196, 255))
    d.rectangle((4, 2, 23, 7), fill=(210, 206, 196, 255))          # top tray
    d.rectangle((6, 0, 21, 3), fill=M3)                            # paper stack
    d.point((22, 15), fill=LEDG if f == 0 else LEDR)               # jam light
    d.rectangle((5, 14, 12, 16), fill=M0)                          # slot
    if f == 1:
        d.rectangle((0, 13, 5, 17), fill=M3)                       # paper shooting out
        d.line((1, 14, 4, 14), fill=INKL)
    d.rectangle((2, 19, 25, 21), fill=M1)
    return outline(img)

def draw_steamroller(f):
    """78x50 menacing steamroller, faces LEFT (chases rightward player from behind... draws flipped as needed)."""
    img, d = sheet(78, 50)
    # cab
    d.rectangle((34, 4, 72, 32), fill=ROLLER)
    d.rectangle((38, 8, 56, 20), fill=(40, 50, 66, 255))           # windshield
    # angry eyes in windshield
    d.line((41, 11, 46, 14), fill=LEDR); d.line((53, 11, 48, 14), fill=LEDR)
    d.rectangle((42, 15, 44, 17), fill=LEDR); d.rectangle((50, 15, 52, 17), fill=LEDR)
    d.rectangle((34, 22, 72, 24), fill=ROLLERD)
    d.rectangle((60, 0, 64, 6), fill=M0)                           # exhaust pipe
    if f == 1:
        d.ellipse((56, -4, 62, 1), fill=M2)
    # arm to drum
    d.rectangle((10, 24, 38, 28), fill=ROLLERD)
    # drum
    d.ellipse((0, 14, 34, 48), fill=DRUM)
    d.ellipse((6, 20, 28, 42), fill=M1)
    d.ellipse((13, 27, 21, 35), fill=M0)
    rot = 0 if f == 0 else 4
    for ang in range(4):
        import math
        a = ang * 1.57 + rot * 0.2
        x = 17 + math.cos(a) * 12; y = 31 + math.sin(a) * 12
        d.point((int(x), int(y)), fill=M3)
    # rear wheels
    d.ellipse((60, 30, 76, 46), fill=M0)
    d.ellipse((64, 34, 72, 42), fill=M1)
    # roof light
    d.rectangle((50, 0, 54, 4), fill=LEDR if f == 0 else (120, 40, 40, 255))
    return outline(img)

# ---------- pickups ----------
def draw_coin(f):
    """12x14 spinning TrashCoin."""
    img, d = sheet(12, 14)
    w = [10, 6, 2, 6][f]
    x0 = 6 - w // 2
    d.ellipse((x0, 1, x0 + w, 13), fill=GOLD2)
    if w > 4:
        d.ellipse((x0 + 1, 3, x0 + w - 1, 11), fill=GOLD1)
        if f == 0:
            d.line((5, 4, 7, 4), fill=GOLD2); d.line((6, 4, 6, 10), fill=GOLD2)  # T
    d.point((x0 + 1, 3), fill=PAPER)
    return outline(img)

def draw_wizhat():
    img, d = sheet(18, 16)
    d.polygon([(2, 13), (9, 0), (13, 13)], fill=PURP2)
    d.polygon([(6, 8), (9, 2), (11, 8)], fill=PURP1)
    d.ellipse((0, 11, 17, 15), fill=PURP1)
    d.point((8, 5), fill=YEL); d.point((6, 10), fill=YEL); d.point((11, 9), fill=YEL)
    return outline(img)

def draw_sparkle_spell(f):
    img, d = sheet(14, 14)
    c = YEL if f == 0 else PURP2
    d.line((7, 1, 7, 12), fill=c); d.line((1, 7, 12, 7), fill=c)
    d.line((3, 3, 10, 10), fill=c); d.line((10, 3, 3, 10), fill=c)
    d.point((7, 7), fill=PAPER)
    return img

# ---------- pack sprites ----------
SPRITES = {}
def add(name, img): SPRITES[name] = img
for i in range(2): add(f'crow_{i}', draw_crow('fly', i))
add('crow_perch', draw_crow('perch', 0))
for i in range(2): add(f'roomba_{i}', draw_roomba(i))
for i in range(2): add(f'scooter_{i}', draw_scooter(i))
for i in range(2): add(f'printer_{i}', draw_printer(i))
for i in range(2): add(f'steamroller_{i}', draw_steamroller(i))
for i in range(4): add(f'coin_{i}', draw_coin(i))
add('wizhat', draw_wizhat())
for i in range(2): add(f'spell_{i}', draw_sparkle_spell(i))

MAXW = 512
sx, sy, sh = 0, 0, 0
places = {}
for name, im in SPRITES.items():
    w, h = im.size
    if sx + w + 2 > MAXW:
        sy += sh + 2; sx, sh = 0, 0
    places[name] = (sx + 1, sy + 1, w, h)
    sx += w + 2; sh = max(sh, h)
H = sy + sh + 2
atlas = Image.new("RGBA", (MAXW, H), CLEAR)
for name, im in SPRITES.items():
    x, y, w, h = places[name]
    atlas.paste(im, (x, y))

base = os.path.join(os.path.dirname(__file__), '..', 'assets')
atlas.save(os.path.join(base, 'jimothy_extra2.png'))
with open(os.path.join(base, 'jimothy_extra2_atlas.json'), 'w') as fo:
    json.dump({"image": "jimothy_extra2.png",
               "sprites": {k: list(v) for k, v in places.items()}}, fo, indent=1)

# ---------- office tileset (8x3, 16px) ----------
CARP1 = (74, 84, 100, 255)
CARP0 = (58, 66, 82, 255)
CUBE1 = (158, 150, 138, 255)
CUBE0 = (126, 118, 106, 255)
DESK  = (128, 96, 70, 255)
DESKD = (98, 72, 52, 255)
RACK  = (52, 56, 72, 255)
VENDR = (180, 70, 70, 255)
GLASSN= (34, 40, 66, 255)
CEIL  = (196, 196, 200, 255)
PLANTG= (96, 148, 96, 255)

T = 16
tiles_img = Image.new("RGBA", (8 * T, 3 * T), CLEAR)
td = ImageDraw.Draw(tiles_img)
def tile(cx, cy):
    return cx * T, cy * T

def fill_tile(cx, cy, c):
    x, y = tile(cx, cy); td.rectangle((x, y, x + 15, y + 15), fill=c)

# (0,0) carpet_top
x, y = tile(0, 0)
td.rectangle((x, y, x + 15, y + 15), fill=CARP1)
for i in range(0, 16, 4):
    for j in range(4, 16, 4):
        if (i + j) % 8 == 0: td.rectangle((x + i, y + j, x + i + 3, y + j + 3), fill=CARP0)
td.rectangle((x, y, x + 15, y + 1), fill=(96, 106, 122, 255))
# (1,0) carpet_mid
x, y = tile(1, 0)
td.rectangle((x, y, x + 15, y + 15), fill=CARP0)
for i in range(16):
    for j in range(16):
        if hsh(i, j, 3) % 11 == 0: td.point((x + i, y + j), fill=CARP1)
# (2,0) cubicle
x, y = tile(2, 0)
td.rectangle((x, y, x + 15, y + 15), fill=CUBE1)
td.rectangle((x + 2, y + 2, x + 13, y + 13), fill=CUBE0)
td.line((x, y, x + 15, y), fill=(184, 176, 164, 255))
# (3,0) cubicle_top
x, y = tile(3, 0)
td.rectangle((x, y + 4, x + 15, y + 15), fill=CUBE1)
td.rectangle((x, y + 2, x + 15, y + 5), fill=(184, 176, 164, 255))
td.rectangle((x + 3, y + 8, x + 12, y + 15), fill=CUBE0)
# (4,0) desk (platform)
x, y = tile(4, 0)
td.rectangle((x, y + 4, x + 15, y + 8), fill=DESK)
td.rectangle((x, y + 4, x + 15, y + 5), fill=(160, 122, 88, 255))
td.rectangle((x + 1, y + 8, x + 3, y + 15), fill=DESKD)
td.rectangle((x + 12, y + 8, x + 14, y + 15), fill=DESKD)
# (5,0) desk_papers
x, y = tile(5, 0)
td.rectangle((x, y + 4, x + 15, y + 8), fill=DESK)
td.rectangle((x, y + 4, x + 15, y + 5), fill=(160, 122, 88, 255))
td.rectangle((x + 3, y + 1, x + 9, y + 4), fill=PAPER)
td.line((x + 4, y + 2, x + 8, y + 2), fill=INKL)
td.rectangle((x + 1, y + 8, x + 3, y + 15), fill=DESKD)
# (6,0) rack_top (server)
x, y = tile(6, 0)
td.rectangle((x + 1, y, x + 14, y + 15), fill=RACK)
for j in (3, 7, 11):
    td.rectangle((x + 3, y + j, x + 12, y + j + 2), fill=M0)
    td.point((x + 11, y + j + 1), fill=LEDG if j != 7 else LEDR)
# (7,0) rack_bot
x, y = tile(7, 0)
td.rectangle((x + 1, y, x + 14, y + 15), fill=RACK)
for j in (1, 5, 9):
    td.rectangle((x + 3, y + j, x + 12, y + j + 2), fill=M0)
    td.point((x + 11, y + j + 1), fill=LED)
td.rectangle((x + 1, y + 13, x + 14, y + 15), fill=M0)
# (0,1) vend_top
x, y = tile(0, 1)
td.rectangle((x + 1, y, x + 14, y + 15), fill=VENDR)
td.rectangle((x + 3, y + 2, x + 9, y + 15), fill=GLASSN)
for j in (4, 8, 12):
    td.rectangle((x + 4, y + j, x + 8, y + j + 2), fill=GOLD1)
td.rectangle((x + 11, y + 3, x + 13, y + 8), fill=M2)
# (1,1) vend_bot
x, y = tile(1, 1)
td.rectangle((x + 1, y, x + 14, y + 15), fill=VENDR)
td.rectangle((x + 3, y, x + 9, y + 4), fill=GLASSN)
td.rectangle((x + 3, y + 7, x + 11, y + 11), fill=(60, 40, 44, 255))  # flap
td.rectangle((x + 1, y + 14, x + 14, y + 15), fill=(120, 46, 46, 255))
# (2,1) monitor
x, y = tile(2, 1)
td.rectangle((x + 2, y + 2, x + 13, y + 10), fill=M0)
td.rectangle((x + 3, y + 3, x + 12, y + 9), fill=GLASSN)
td.line((x + 4, y + 5, x + 9, y + 5), fill=LEDG)
td.line((x + 4, y + 7, x + 7, y + 7), fill=LEDG)
td.rectangle((x + 7, y + 10, x + 8, y + 13), fill=M1)
td.rectangle((x + 5, y + 13, x + 10, y + 14), fill=M1)
# (3,1) watercooler
x, y = tile(3, 1)
td.rectangle((x + 4, y + 6, x + 11, y + 15), fill=M2)
td.rectangle((x + 5, y, x + 10, y + 7), fill=(150, 190, 220, 255))
td.point((x + 6, y + 2), fill=PAPER)
td.rectangle((x + 4, y + 9, x + 6, y + 10), fill=LED)
# (4,1) whiteboard
x, y = tile(4, 1)
td.rectangle((x + 1, y + 2, x + 14, y + 12), fill=PAPER)
td.rectangle((x + 1, y + 2, x + 14, y + 3), fill=M1)
td.line((x + 3, y + 5, x + 9, y + 5), fill=RED)
td.line((x + 3, y + 7, x + 12, y + 7), fill=(80, 110, 180, 255))
td.line((x + 3, y + 9, x + 7, y + 9), fill=INKL)
td.rectangle((x + 1, y + 12, x + 14, y + 13), fill=M1)
# (5,1) poster (RTO)
x, y = tile(5, 1)
td.rectangle((x + 2, y + 1, x + 13, y + 14), fill=PAPER)
td.rectangle((x + 3, y + 2, x + 12, y + 6), fill=RED)
td.line((x + 4, y + 8, x + 11, y + 8), fill=INKL)
td.line((x + 4, y + 10, x + 11, y + 10), fill=INKL)
td.line((x + 4, y + 12, x + 8, y + 12), fill=INKL)
# (6,1) window_a (night skyline)
x, y = tile(6, 1)
td.rectangle((x, y, x + 15, y + 15), fill=GLASSN)
td.rectangle((x, y, x + 15, y + 1), fill=M1); td.rectangle((x, y + 14, x + 15, y + 15), fill=M1)
for i in range(16):
    for j in range(4, 16):
        if hsh(i, j, 9) % 23 == 0: td.point((x + i, y + j), fill=GOLD2)
td.point((x + 3, y + 2), fill=PAPER)
# (7,1) window_b (space needle silhouette)
x, y = tile(7, 1)
td.rectangle((x, y, x + 15, y + 15), fill=GLASSN)
td.rectangle((x, y, x + 15, y + 1), fill=M1); td.rectangle((x, y + 14, x + 15, y + 15), fill=M1)
td.line((x + 7, y + 6, x + 7, y + 14), fill=(20, 24, 42, 255))
td.ellipse((x + 4, y + 4, x + 10, y + 7), fill=(20, 24, 42, 255))
td.point((x + 7, y + 3), fill=LEDR)
# (0,2) ceil
x, y = tile(0, 2)
td.rectangle((x, y, x + 15, y + 15), fill=CEIL)
td.line((x, y + 13, x + 15, y + 13), fill=M1)
td.line((x + 7, y, x + 7, y + 13), fill=(178, 178, 184, 255))
# (1,2) ceil_light
x, y = tile(1, 2)
td.rectangle((x, y, x + 15, y + 15), fill=CEIL)
td.line((x, y + 13, x + 15, y + 13), fill=M1)
td.rectangle((x + 2, y + 10, x + 13, y + 13), fill=YEL)
# (2,2) plant
x, y = tile(2, 2)
td.polygon([(x + 8, y), (x + 3, y + 8), (x + 13, y + 8)], fill=PLANTG)
td.polygon([(x + 4, y + 3), (x + 1, y + 9), (x + 8, y + 9)], fill=(70, 120, 76, 255))
td.polygon([(x + 12, y + 3), (x + 8, y + 9), (x + 15, y + 9)], fill=(70, 120, 76, 255))
td.polygon([(x + 5, y + 9), (x + 11, y + 9), (x + 9, y + 15), (x + 7, y + 15)], fill=(150, 90, 60, 255))
# (3,2) papers_floor
x, y = tile(3, 2)
td.polygon([(x + 2, y + 12), (x + 8, y + 10), (x + 9, y + 14), (x + 3, y + 15)], fill=PAPER)
td.polygon([(x + 8, y + 13), (x + 14, y + 12), (x + 14, y + 15), (x + 8, y + 15)], fill=(210, 206, 196, 255))
td.line((x + 4, y + 12, x + 7, y + 12), fill=INKL)
# (4,2) elevator_l  (5,2) elevator_r
for k, cxx in ((0, 4), (1, 5)):
    x, y = tile(cxx, 2)
    td.rectangle((x, y, x + 15, y + 15), fill=M2)
    td.rectangle((x + 2 if k == 0 else x, y + 2, x + 15 if k == 0 else x + 13, y + 15), fill=M1)
    td.line((x + 15 if k == 0 else x, y + 2, x + 15 if k == 0 else x, y + 15), fill=M0)
    if k == 0: td.point((x + 13, y + 4), fill=LEDG)
# (6,2) mug
x, y = tile(6, 2)
td.rectangle((x + 5, y + 8, x + 11, y + 15), fill=(180, 90, 90, 255))
td.arc((x + 10, y + 9, x + 14, y + 14), 270, 90, fill=(180, 90, 90, 255))
td.rectangle((x + 6, y + 9, x + 10, y + 10), fill=(90, 60, 40, 255))
for i, (dx, dy) in enumerate(((6, 5), (8, 3), (9, 6))):
    td.point((x + dx, y + dy), fill=M2)
# (7,2) cable_mess
x, y = tile(7, 2)
td.arc((x, y + 8, x + 8, y + 16), 180, 360, fill=M0)
td.arc((x + 5, y + 10, x + 12, y + 18), 180, 360, fill=(70, 60, 90, 255))
td.arc((x + 9, y + 7, x + 16, y + 15), 180, 360, fill=M0)

tiles_img.save(os.path.join(base, 'jimothy_office.png'))
OFFICE_TILES = {
    'carpet_top': [0, 0], 'carpet_mid': [1, 0], 'cubicle': [2, 0], 'cubicle_top': [3, 0],
    'desk': [4, 0], 'desk_papers': [5, 0], 'rack_top': [6, 0], 'rack_bot': [7, 0],
    'vend_top': [0, 1], 'vend_bot': [1, 1], 'monitor': [2, 1], 'cooler': [3, 1],
    'whiteboard': [4, 1], 'poster': [5, 1], 'window_a': [6, 1], 'window_b': [7, 1],
    'ceil': [0, 2], 'ceil_light': [1, 2], 'plant': [2, 2], 'papers_floor': [3, 2],
    'elevator_l': [4, 2], 'elevator_r': [5, 2], 'mug': [6, 2], 'cables': [7, 2],
}
with open(os.path.join(base, 'jimothy_office.json'), 'w') as fo:
    json.dump({"image": "jimothy_office.png", "tile_size": 16, "tiles": OFFICE_TILES}, fo, indent=1)

# preview
prev = Image.new("RGBA", (MAXW, H + 3 * T + 8), (27, 22, 38, 255))
prev.paste(atlas, (0, 0), atlas)
prev.paste(tiles_img, (0, H + 4), tiles_img)
prev.resize((prev.size[0] * 3, prev.size[1] * 3), Image.NEAREST).save(
    os.path.join(base, '..', 'generators', 'v7_preview_3x.png'))
print('extra2:', len(SPRITES), 'sprites ->', atlas.size, '| office tiles:', len(OFFICE_TILES))
