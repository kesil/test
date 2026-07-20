"""
Jimothy world assets:
1) 16x16 tileset (8 cols x 6 rows) — Ballard/Seattle alley theme:
   sky, clouds, skyline silhouettes (incl. Space Needle), ground, brick, fence,
   crates, spring (2f), fish-flag checkpoint (2f), puddle, pipe, dumpster (2x2),
   streetlight (1x3), traffic cone, hydrant, platform planks.
2) tiles.json — name -> [col,row,w,h] in tile units + collision class.
3) Title card 160x96: chunky "JIMOTHY" wordmark + subtitle + the man himself.
"""
from jimothy_v6 import *   # palettes + drawing helpers + jimothy fns
from PIL import Image, ImageDraw
import json, os

T = 16
COLS, ROWS = 8, 6

SKY1   = (58, 64, 96, 255)
SKY2   = (74, 82, 118, 255)
CLOUDC = (150, 156, 186, 255)
SILH   = (38, 42, 66, 255)
SILH2  = (48, 52, 78, 255)
GRASS2 = (110, 150, 90, 255)
GRASS1 = (80, 115, 70, 255)
DIRTT  = (130, 100, 76, 255)
DIRTM  = (104, 80, 62, 255)
DIRTD  = (82, 62, 50, 255)
BRICK2 = (150, 92, 78, 255)
BRICK1 = (122, 72, 62, 255)
BRICK0 = (96, 56, 50, 255)
MORTAR = (170, 150, 140, 255)
WOOD2  = (170, 130, 90, 255)
WOOD1  = (140, 104, 72, 255)
WOOD0  = (108, 78, 56, 255)
PIPEC  = (100, 140, 110, 255)
PIPED  = (70, 100, 82, 255)
CONE_O = (230, 130, 60, 255)
HYDR   = (190, 70, 60, 255)
PUDL   = (110, 140, 180, 200)

def tile_origin(c, r):
    return c * T, r * T

def build_tiles():
    img = Image.new("RGBA", (COLS * T, ROWS * T), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    meta = {}

    def reg(name, c, r, w=1, h=1, coll="none"):
        meta[name] = {"tile": [c, r, w, h], "collision": coll}

    # --- row 0: sky / clouds / skyline ---
    for c, base in ((0, SKY1), (1, SKY2)):
        x, y = tile_origin(c, 0)
        d.rectangle((x, y, x + T - 1, y + T - 1), fill=base)
        for k in range(4):
            px(d, x + hsh(c, k) % T, y + hsh(k, c * 7) % T, SKY2 if base == SKY1 else SKY1)
        px(d, x + 3 + c * 5, y + 3, SHINE)  # star
    reg("sky_a", 0, 0); reg("sky_b", 1, 0)

    for c in (2, 3):  # cloud L/R
        x, y = tile_origin(c, 0)
        d.rectangle((x, y, x + T - 1, y + T - 1), fill=SKY1)
        if c == 2:
            d.ellipse((x + 4, y + 6, x + 15, y + 13), fill=CLOUDC)
            d.ellipse((x + 8, y + 3, x + 15, y + 10), fill=CLOUDC)
        else:
            d.ellipse((x, y + 6, x + 11, y + 13), fill=CLOUDC)
            d.ellipse((x, y + 3, x + 8, y + 10), fill=CLOUDC)
        d.line((x + (4 if c == 2 else 0), y + 13, x + (15 if c == 3 else 15), y + 13),
               fill=(CLOUDC[0] - 30, CLOUDC[1] - 30, CLOUDC[2] - 20, 255))
    reg("cloud_l", 2, 0); reg("cloud_r", 3, 0)

    # skyline strip: rooftops, then the Space Needle across (6,0)
    for c in (4, 5):
        x, y = tile_origin(c, 0)
        d.rectangle((x, y, x + T - 1, y + T - 1), fill=SKY1)
        hts = (9, 5, 11, 7) if c == 4 else (6, 10, 4, 8)
        for k, h0 in enumerate(hts):
            d.rectangle((x + k * 4, y + T - h0, x + k * 4 + 3, y + T - 1), fill=SILH)
            px(d, x + k * 4 + 1, y + T - h0 + 2, SILH2)
            if hsh(c, k) % 2:
                px(d, x + k * 4 + 2, y + T - h0 + 4, YELC)   # lit window
    reg("skyline_a", 4, 0); reg("skyline_b", 5, 0)

    x, y = tile_origin(6, 0)   # Space Needle
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=SKY1)
    d.line((x + 8, y + 6, x + 8, y + 15), fill=SILH)
    d.line((x + 7, y + 8, x + 7, y + 15), fill=SILH)
    d.line((x + 9, y + 8, x + 9, y + 15), fill=SILH)
    d.ellipse((x + 4, y + 3, x + 12, y + 7), fill=SILH)      # saucer
    d.line((x + 3, y + 5, x + 13, y + 5), fill=SILH2)
    d.line((x + 8, y + 1, x + 8, y + 3), fill=SILH)          # spire
    px(d, x + 8, y, REDC)                                     # beacon
    reg("space_needle", 6, 0)

    x, y = tile_origin(7, 0)   # moon
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=SKY1)
    d.ellipse((x + 4, y + 3, x + 13, y + 12), fill=(226, 224, 214, 255))
    d.ellipse((x + 2, y + 2, x + 10, y + 10), fill=SKY1)
    reg("moon", 7, 0)

    # --- row 1: ground / brick / fence ---
    x, y = tile_origin(0, 1)   # ground top (grass tufts)
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=DIRTM)
    d.rectangle((x, y, x + T - 1, y + 3), fill=GRASS1)
    d.line((x, y, x + T - 1, y), fill=GRASS2)
    for k in range(4):
        gx = x + 1 + k * 4 + hsh(k, 1) % 2
        d.line((gx, y - 0, gx, y + 1), fill=GRASS2)
        px(d, gx + 1, y, GRASS1)
    for k in range(5):
        px(d, x + hsh(k, 9) % T, y + 6 + hsh(9, k) % 8, DIRTD)
    reg("ground_top", 0, 1, coll="solid")

    x, y = tile_origin(1, 1)   # ground mid
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=DIRTM)
    for k in range(7):
        px(d, x + hsh(k, 11) % T, y + hsh(11, k) % T, DIRTD)
        px(d, x + hsh(k, 13) % T, y + hsh(13, k) % T, DIRTT)
    reg("ground_mid", 1, 1, coll="solid")

    for c, edge in ((2, "l"), (3, "r")):
        x, y = tile_origin(c, 1)
        d.rectangle((x, y, x + T - 1, y + T - 1), fill=DIRTM)
        d.rectangle((x, y, x + T - 1, y + 3), fill=GRASS1)
        d.line((x, y, x + T - 1, y), fill=GRASS2)
        if edge == "l":
            d.line((x, y, x, y + T - 1), fill=DIRTD)
            d.line((x + 1, y + 4, x + 1, y + T - 1), fill=DIRTT)
        else:
            d.line((x + T - 1, y, x + T - 1, y + T - 1), fill=DIRTD)
    reg("ground_top_l", 2, 1, coll="solid"); reg("ground_top_r", 3, 1, coll="solid")

    x, y = tile_origin(4, 1)   # brick
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=BRICK1)
    for rr in range(4):
        yy = y + rr * 4
        d.line((x, yy, x + T - 1, yy), fill=MORTAR)
        off = 0 if rr % 2 == 0 else 4
        for bx in range(off, T, 8):
            d.line((x + bx, yy, x + bx, yy + 3), fill=MORTAR)
        for bx in range(off + 1, T, 8):
            px(d, x + bx, yy + 1, BRICK2)
            px(d, x + min(T - 1, bx + 5), yy + 2, BRICK0)
    reg("brick", 4, 1, coll="solid")

    x, y = tile_origin(5, 1)   # brick window
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=BRICK1)
    d.rectangle((x + 3, y + 3, x + 12, y + 12), fill=OUT)
    d.rectangle((x + 4, y + 4, x + 11, y + 11), fill=SKY2)
    d.line((x + 7, y + 4, x + 7, y + 11), fill=OUT)
    d.line((x + 4, y + 7, x + 11, y + 7), fill=OUT)
    px(d, x + 5, y + 5, SHINE)
    reg("brick_window", 5, 1, coll="solid")

    x, y = tile_origin(6, 1)   # brick top (parapet)
    d.rectangle((x, y + 4, x + T - 1, y + T - 1), fill=BRICK1)
    d.rectangle((x, y + 4, x + T - 1, y + 6), fill=BRICK0)
    d.rectangle((x, y + 2, x + T - 1, y + 4), fill=MORTAR)
    reg("brick_top", 6, 1, coll="solid")

    x, y = tile_origin(7, 1)   # wood fence
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=WOOD1)
    for bx in range(0, T, 4):
        d.line((x + bx, y, x + bx, y + T - 1), fill=WOOD0)
        px(d, x + bx + 2, y + 3 + bx % 5, WOOD2)
    d.line((x, y + 3, x + T - 1, y + 3), fill=WOOD0)
    d.line((x, y + 11, x + T - 1, y + 11), fill=WOOD0)
    reg("fence", 7, 1, coll="none")

    # --- row 2: props ---
    x, y = tile_origin(0, 2)   # crate
    d.rectangle((x, y, x + T - 1, y + T - 1), fill=OUT)
    d.rectangle((x + 1, y + 1, x + T - 2, y + T - 2), fill=WOOD1)
    d.line((x + 1, y + 1, x + T - 2, y + T - 2), fill=WOOD0)
    d.line((x + T - 2, y + 1, x + 1, y + T - 2), fill=WOOD0)
    d.rectangle((x + 1, y + 1, x + T - 2, y + 3), fill=WOOD2)
    reg("crate", 0, 2, coll="solid")

    x, y = tile_origin(1, 2)   # cardboard box
    d.rectangle((x + 1, y + 4, x + T - 2, y + T - 1), fill=OUT)
    d.rectangle((x + 2, y + 5, x + T - 3, y + T - 2), fill=CRUST)
    d.polygon([(x + 2, y + 5), (x + 5, y + 2), (x + 8, y + 5)], fill=COOKIE)
    d.polygon([(x + 8, y + 5), (x + 11, y + 2), (x + 13, y + 5)], fill=CRUST)
    d.line((x + 8, y + 5, x + 8, y + T - 2), fill=WOOD0)
    reg("box", 1, 2, coll="solid")

    for c, ext in ((2, 0), (3, 4)):   # spring idle / sprung
        x, y = tile_origin(c, 2)
        d.rectangle((x + 3, y + T - 3, x + 12, y + T - 1), fill=OUT)
        d.rectangle((x + 4, y + T - 3, x + 11, y + T - 2), fill=METAL1)
        top = y + 7 - ext
        for k in range(3):
            d.arc((x + 4, top + k * 2, x + 11, top + k * 2 + 3), 0, 180, fill=METAL2)
        d.rectangle((x + 2, top - 3, x + 13, top), fill=OUT)
        d.rectangle((x + 3, top - 2, x + 12, top - 1), fill=REDC)
    reg("spring_idle", 2, 2, coll="bounce"); reg("spring_out", 3, 2, coll="bounce")

    for c, wave in ((4, 0), (5, 1)):  # fish flag checkpoint 2f
        x, y = tile_origin(c, 2)
        d.line((x + 2, y, x + 2, y + T - 1), fill=WOOD0)
        px(d, x + 2, y, GOLD1)
        fy = y + 3
        d.polygon([(x + 3, fy), (x + 11 + wave, fy + 2), (x + 9, fy + 4),
                   (x + 12 + wave, fy + 6), (x + 3, fy + 7)], fill=TEALC)
        px(d, x + 5, fy + 2, OUT)
        d.line((x + 7, fy + 2, x + 8, fy + 5), fill=SKY2)
    reg("flag_a", 4, 2, coll="checkpoint"); reg("flag_b", 5, 2, coll="checkpoint")

    x, y = tile_origin(6, 2)   # puddle
    d.ellipse((x + 1, y + 9, x + 14, y + 14), fill=PUDL)
    d.line((x + 3, y + 10, x + 8, y + 10), fill=SHINE)
    reg("puddle", 6, 2, coll="none")

    x, y = tile_origin(7, 2)   # pipe top
    d.rectangle((x + 2, y + 4, x + 13, y + T - 1), fill=PIPEC)
    d.rectangle((x, y, x + T - 1, y + 4), fill=PIPED)
    d.rectangle((x + 1, y + 1, x + T - 2, y + 3), fill=PIPEC)
    d.line((x + 4, y + 5, x + 4, y + T - 1), fill=SHINE)
    d.line((x + 12, y + 5, x + 12, y + T - 1), fill=PIPED)
    reg("pipe_top", 7, 2, coll="solid")

    # --- row 3: dumpster 2x2 + pipe mid + streetlight top/mid ---
    x, y = tile_origin(0, 3)   # dumpster spans (0,3)-(1,4)
    d.rectangle((x + 1, y + 6, x + 31, y + 31), fill=OUT)
    d.rectangle((x + 2, y + 7, x + 30, y + 30), fill=PIPED)
    d.rectangle((x + 2, y + 7, x + 30, y + 12), fill=PIPEC)
    d.polygon([(x + 1, y + 6), (x + 4, y + 1), (x + 28, y + 1), (x + 31, y + 6)], fill=OUT)
    d.polygon([(x + 3, y + 5), (x + 5, y + 2), (x + 27, y + 2), (x + 29, y + 5)], fill=PIPEC)
    for k in range(3):
        d.line((x + 6 + k * 9, y + 13, x + 6 + k * 9, y + 28), fill=PIPED)
    d.line((x + 4, y + 9, x + 28, y + 9), fill=SHINE)
    d.rectangle((x + 6, y + 16, x + 26, y + 24), fill=PIPEC)
    # graffiti paw
    px(d, x + 14, y + 19, OUT); px(d, x + 13, y + 18, OUT); px(d, x + 15, y + 18, OUT)
    px(d, x + 12, y + 20, OUT); px(d, x + 16, y + 20, OUT)
    d.rectangle((x + 2, y + 28, x + 6, y + 31), fill=OUT)   # wheels
    d.rectangle((x + 26, y + 28, x + 30, y + 31), fill=OUT)
    reg("dumpster", 0, 3, 2, 2, coll="solid")

    x, y = tile_origin(2, 3)   # pipe mid
    d.rectangle((x + 2, y, x + 13, y + T - 1), fill=PIPEC)
    d.line((x + 4, y, x + 4, y + T - 1), fill=SHINE)
    d.line((x + 12, y, x + 12, y + T - 1), fill=PIPED)
    reg("pipe_mid", 2, 3, coll="solid")

    x, y = tile_origin(3, 3)   # streetlight head
    d.line((x + 7, y + 8, x + 7, y + T - 1), fill=METAL0)
    d.line((x + 7, y + 8, x + 12, y + 4), fill=METAL0)
    d.ellipse((x + 10, y + 2, x + 15, y + 7), fill=OUT)
    d.ellipse((x + 11, y + 3, x + 14, y + 6), fill=YELC)
    px(d, x + 12, y + 4, SHINE)
    reg("lamp_head", 3, 3, coll="none")

    x, y = tile_origin(4, 3)   # streetlight pole
    d.line((x + 7, y, x + 7, y + T - 1), fill=METAL0)
    d.line((x + 8, y, x + 8, y + T - 1), fill=METAL1)
    reg("lamp_pole", 4, 3, coll="none")

    x, y = tile_origin(5, 3)   # streetlight base
    d.line((x + 7, y, x + 7, y + 11), fill=METAL0)
    d.line((x + 8, y, x + 8, y + 11), fill=METAL1)
    d.rectangle((x + 4, y + 11, x + 11, y + T - 1), fill=OUT)
    d.rectangle((x + 5, y + 12, x + 10, y + T - 2), fill=METAL1)
    reg("lamp_base", 5, 3, coll="none")

    x, y = tile_origin(6, 3)   # traffic cone
    d.polygon([(x + 4, y + 13), (x + 7, y + 3), (x + 9, y + 3), (x + 12, y + 13)], fill=OUT)
    d.polygon([(x + 5, y + 12), (x + 7, y + 4), (x + 9, y + 4), (x + 11, y + 12)], fill=CONE_O)
    d.line((x + 6, y + 8, x + 10, y + 8), fill=WHITE2)
    d.rectangle((x + 2, y + 13, x + 13, y + 15), fill=OUT)
    d.rectangle((x + 3, y + 13, x + 12, y + 14), fill=CONE_O)
    reg("cone", 6, 3, coll="hazard")

    x, y = tile_origin(7, 3)   # hydrant
    d.rectangle((x + 5, y + 6, x + 10, y + 14), fill=OUT)
    d.rectangle((x + 6, y + 7, x + 9, y + 13), fill=HYDR)
    d.ellipse((x + 5, y + 3, x + 10, y + 8), fill=OUT)
    d.ellipse((x + 6, y + 4, x + 9, y + 7), fill=HYDR)
    px(d, x + 7, y + 2, OUT)
    d.rectangle((x + 3, y + 9, x + 5, y + 11), fill=OUT)
    d.rectangle((x + 10, y + 9, x + 12, y + 11), fill=OUT)
    d.rectangle((x + 4, y + 14, x + 11, y + 15), fill=OUT)
    px(d, x + 6, y + 5, SHINE)
    reg("hydrant", 7, 3, coll="solid")

    # --- row 4: planks + trash + misc ---
    for c, part in ((0, "l"), (1, "m"), (2, "r")):
        x, y = tile_origin(c, 4)
        d.rectangle((x, y + 4, x + T - 1, y + 9), fill=OUT)
        d.rectangle((x + (1 if part == "l" else 0), y + 5,
                     x + T - (2 if part == "r" else 1), y + 8), fill=WOOD1)
        d.line((x, y + 5, x + T - 1, y + 5), fill=WOOD2)
        for k in range(2):
            px(d, x + 4 + k * 8, y + 6, WOOD0)
    reg("plank_l", 0, 4, coll="platform"); reg("plank_m", 1, 4, coll="platform")
    reg("plank_r", 2, 4, coll="platform")

    x, y = tile_origin(3, 4)   # loose trash tile
    for k in range(6):
        tx = x + hsh(k, 21) % 14
        ty = y + 8 + hsh(21, k) % 7
        c = [CHEESE, BONE, DIRT, METAL2][hsh(k, 5) % 4]
        px(d, tx, ty, c); px(d, tx + 1, ty, OUT)
    reg("trash_scatter", 3, 4, coll="none")

    x, y = tile_origin(4, 4)   # sewer grate
    d.rectangle((x + 1, y + 10, x + 14, y + 15), fill=OUT)
    for k in range(5):
        d.line((x + 3 + k * 2, y + 11, x + 3 + k * 2, y + 14), fill=METAL0)
    reg("grate", 4, 4, coll="none")

    x, y = tile_origin(5, 4)   # door
    d.rectangle((x + 2, y, x + 13, y + T - 1), fill=OUT)
    d.rectangle((x + 3, y + 1, x + 12, y + T - 1), fill=WOOD0)
    d.rectangle((x + 4, y + 2, x + 11, y + 7), fill=WOOD1)
    d.rectangle((x + 4, y + 9, x + 11, y + 14), fill=WOOD1)
    px(d, x + 10, y + 8, GOLD1)
    reg("door", 5, 4, coll="door")

    x, y = tile_origin(6, 4)   # spikes (broken glass)
    for k in range(4):
        gx = x + 1 + k * 4
        d.polygon([(gx, y + 15), (gx + 1, y + 9 + hsh(k, 31) % 3), (gx + 3, y + 15)], fill=ICE1)
        px(d, gx + 1, y + 11, SHINE)
    reg("glass_hazard", 6, 4, coll="hazard")

    x, y = tile_origin(7, 4)   # ladder
    d.line((x + 4, y, x + 4, y + T - 1), fill=WOOD0)
    d.line((x + 11, y, x + 11, y + T - 1), fill=WOOD0)
    for k in range(4):
        d.line((x + 4, y + 2 + k * 4, x + 11, y + 2 + k * 4), fill=WOOD1)
    reg("ladder", 7, 4, coll="climb")

    # --- row 5: water + decorative ---
    for c, ph in ((0, 0), (1, 1)):
        x, y = tile_origin(c, 5)
        d.rectangle((x, y + 4, x + T - 1, y + T - 1), fill=(PUDL[0], PUDL[1], PUDL[2], 230))
        for k in range(3):
            wy = y + 4
            d.line((x + k * 6 + ph * 3, wy, x + k * 6 + 3 + ph * 3, wy), fill=SHINE)
        px(d, x + 5 + ph * 4, y + 9, SHINE)
    reg("water_a", 0, 5, coll="water"); reg("water_b", 1, 5, coll="water")

    x, y = tile_origin(2, 5)   # bush
    d.ellipse((x + 1, y + 6, x + 14, y + 15), fill=GRASS1)
    d.ellipse((x + 4, y + 3, x + 12, y + 11), fill=GRASS1)
    d.ellipse((x + 5, y + 4, x + 10, y + 8), fill=GRASS2)
    px(d, x + 8, y + 9, REDC)
    reg("bush", 2, 5, coll="none")

    x, y = tile_origin(3, 5)   # power line pole tile
    d.line((x + 7, y, x + 7, y + T - 1), fill=WOOD0)
    d.line((x + 8, y, x + 8, y + T - 1), fill=WOOD1)
    d.line((x, y + 3, x + T - 1, y + 2), fill=OUT)
    reg("pole_wire", 3, 5, coll="none")

    img.save("/home/claude/out6/jimothy_tiles.png")
    img.resize((img.width * 4, img.height * 4), Image.NEAREST)\
       .save("/home/claude/out6/jimothy_tiles_4x.png")
    tj = {"image": "jimothy_tiles.png", "tile_size": T, "cols": COLS, "rows": ROWS,
          "collision_classes": ["none", "solid", "platform", "hazard", "bounce",
                                "checkpoint", "water", "climb", "door"],
          "tiles": meta}
    with open("/home/claude/out6/jimothy_tiles.json", "w") as fh:
        json.dump(tj, fh, indent=2)
    print("tiles:", len(meta))

# ---------------- title card ----------------
FONT5 = {  # 5x7 chunky letterforms
 "J": ["..###","...#.","...#.","...#.","...#.","#..#.",".##.."],
 "I": ["#####","..#..","..#..","..#..","..#..","..#..","#####"],
 "M": ["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],
 "O": [".###.","#...#","#...#","#...#","#...#","#...#",".###."],
 "T": ["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
 "H": ["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
 "Y": ["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],
 "A": [".###.","#...#","#...#","#####","#...#","#...#","#...#"],
 "R": ["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
 "S": [".####","#....","#....",".###.","....#","....#","####."],
 "L": ["#....","#....","#....","#....","#....","#....","#####"],
 "E": ["#####","#....","#....","####.","#....","#....","#####"],
 " ": [".....",".....",".....",".....",".....",".....","....."],
}

def draw_word(d, word, x0, y0, s, fill, shadow=None):
    x = x0
    for ch in word:
        glyph = FONT5[ch]
        for gy, row in enumerate(glyph):
            for gx, c in enumerate(row):
                if c == "#":
                    if shadow:
                        d.rectangle((x + gx * s + 1, y0 + gy * s + 1,
                                     x + gx * s + s, y0 + gy * s + s), fill=shadow)
                    d.rectangle((x + gx * s, y0 + gy * s,
                                 x + gx * s + s - 1, y0 + gy * s + s - 1), fill=fill)
        x += (5 * s) + s
    return x

def build_title():
    TW, TH = 160, 96
    img = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # night sky backdrop card
    d.rounded_rectangle((0, 0, TW - 1, TH - 1), radius=6, fill=SKY1)
    for k in range(14):
        px(d, hsh(k, 41) % TW, hsh(41, k) % 40, SHINE if k % 3 else SKY2)
    d.ellipse((132, 6, 150, 24), fill=(226, 224, 214, 255))
    d.ellipse((127, 4, 143, 20), fill=SKY1)
    # skyline strip
    for k in range(20):
        h0 = 6 + hsh(k, 51) % 10
        d.rectangle((k * 8, 62 - h0, k * 8 + 6, 62), fill=SILH)
        if hsh(51, k) % 3 == 0:
            px(d, k * 8 + 3, 62 - h0 + 3, YELC)
    # Space Needle on the title too
    d.line((140, 40, 140, 62), fill=SILH); d.line((139, 44, 139, 62), fill=SILH)
    d.line((141, 44, 141, 62), fill=SILH)
    d.ellipse((135, 36, 145, 42), fill=SILH)
    px(d, 140, 33, REDC); d.line((140, 34, 140, 36), fill=SILH)
    # ground band
    d.rectangle((0, 62, TW - 1, TH - 1), fill=DIRTM)
    d.rectangle((0, 62, TW - 1, 64), fill=GRASS1)
    # wordmark: JIMOTHY
    x_end = draw_word(d, "JIMOTHY", 10, 14, 3, GOLD1, shadow=OUT)
    draw_word(d, "JIMOTHY", 9, 13, 3, GOLD2)
    # subtitle
    draw_word(d, "TRASH TALES", 30, 44, 1, WHITE2, shadow=OUT)
    # the man himself, small, sitting at the right on the ground band
    # mini-jimothy (hand-placed, ~24px)
    cx, cy = 132, 74
    d.ellipse((cx - 11, cy - 9, cx + 11, cy + 9), fill=OUT)
    d.ellipse((cx - 10, cy - 8, cx + 10, cy + 8), fill=FUR2)
    d.ellipse((cx - 7, cy - 7, cx + 3, cy), fill=FUR3)
    for ang in (-2.2, -1.1):
        ex = cx + math.cos(ang) * 10
        ey = cy + math.sin(ang) * 9
        d.ellipse((ex - 2, ey - 4, ex + 2, ey), fill=OUT)
        px(d, ex, ey - 2, FUR1)
    d.ellipse((cx + 2, cy - 3, cx + 9, cy + 3), fill=MASK)
    px(d, cx + 5, cy - 1, EYE_W); px(d, cx + 5, cy, OUT)
    d.polygon([(cx + 8, cy), (cx + 13, cy + 1), (cx + 8, cy + 3)], fill=WHITE2)
    px(d, cx + 12, cy + 1, NOSE)
    d.ellipse((cx - 16, cy - 4, cx - 9, cy + 2), fill=RING)
    for x0 in (cx - 4, cx + 2):
        d.line((x0, cy + 8, x0 - 1, cy + 12), fill=OUT)
        draw_fingers(d, x0 - 1, cy + 12, OUT)
    fx_sparkle(d, 18, 70, 0); fx_sparkle(d, 60, 78, 1)
    item_fishbone(d, 40, 82); item_can(d, 84, 80)
    d.rounded_rectangle((0, 0, TW - 1, TH - 1), radius=6, outline=OUT, width=2)
    img.save("/home/claude/out6/jimothy_title.png")
    img.resize((TW * 4, TH * 4), Image.NEAREST).save("/home/claude/out6/jimothy_title_4x.png")
    print("title:", img.size)

if __name__ == "__main__":
    build_tiles()
    build_title()
