# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools==4.61.1"]
# ///
"""Draw PC-50x labels from reference photos; no photograph pixels are embedded.

Run: uv run --script scripts/build-cartridge-art.py
See research/CARTRIDGE-PHOTOS.md for sources, colour samples and limitations.
Text uses outlined Inter so DOM images and WebGL textures render identically.
"""

from html import escape
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
FONT = TTFont(ROOT / "web/public/fonts/inter.ttf")
FONTS = {}
for weight in (400, 700, 900):
    font = instantiateVariableFont(FONT, {"wght": weight}, inplace=False)
    FONTS[weight] = (font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm)
GLYPHS = {}
INK = "#171a19"
WHITE = "#f1f0df"
COLORS = {
    "sports": "#6f1612",
    "motorcycle": "#ff1a18",
    "tank": "#ee7604",
    "race": "#f3e706",
    "submarine": "#02ac59",
    "wipeout": "#0198db",
    "shooting": "#7c63b9",
    "fundamental": "#e0cb9b",
}
NAMES = [
    "SUPERSPORTIC",
    "MOTOR CYCLE",
    "TANK BATTLE",
    "CAR RACE GP",
    "SUBMARINE",
    "SUPERBWIPEOUT",
    "SHOOTING GALLERY",
    "FUNDAMENTAL",
]


def text(s, x, y, size=12, color=WHITE, weight=400, width=None, italic=False):
    glyphs, cmap, em = FONTS[weight]
    paths, advance = [], 0
    for ch in s:
        glyph = glyphs[cmap.get(ord(ch), "space")]
        key = f"g{weight}-{ord(ch)}"
        if key not in GLYPHS:
            pen = SVGPathPen(glyphs, ntos=lambda v: str(round(v, 2)))
            glyph.draw(pen)
            GLYPHS[key] = f'<path id="{key}" d="{pen.getCommands()}"/>'
        paths.append(f'<use href="#{key}" transform="translate({advance} 0)"/>')
        advance += glyph.width
    sx = width / advance if width else size / em
    skew = " skewX(-12)" if italic else ""
    return f'<g aria-label="{escape(s)}" fill="{color}" transform="translate({x} {y}){skew} scale({sx} {-size / em})">{"".join(paths)}</g>'


def rect(x, y, w, h, fill=INK, rx=0, stroke="none", sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'


def path(d, stroke=INK, sw=1, fill="none"):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'


def circle(x, y, r, fill=INK):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'


def screen(x, y, w, h, inside):
    outline = "M5 4Q50 -4 95 4Q105 40 95 76Q50 84 5 76Q-5 40 5 4Z"
    return f'<g transform="translate({x} {y}) scale({w / 100} {h / 80})">{path(outline, INK, 1.1, WHITE)}{inside}</g>'


def number(n, x, y):
    return rect(x, y - 12, 16, 16) + text(
        str(n), x + 3, y + 1, 12, WHITE, 700, 10 if n > 9 else None
    )


def caption(s, n, x, y, width=84, color=WHITE):
    return text(s, x, y, 13, color, 700, width) + number(n, x + width + 7, y)


def score():
    return text("00     00", 23, 13, 9, INK, 900, 55)


def ship(x, y, outline=False):
    return path(f"M{x} {y}h7v-3h5v3h7v3h-19Z", INK, 0.6, WHITE if outline else INK)


def submarine_panel(i):
    s = score() + path("M2 24H98", sw=0.5)
    if i == 0:
        s += ship(50, 21) + path("M4 68H96", sw=0.5)
    if i < 2:
        s += ship(18, 38) + rect(27, 46, 1, 8) + rect(27, 58, 2, 3)
        s += ship(65, 59, True) + path("M72 52v-5m0-5v-6m0-4v-3", sw=0.7)
    else:
        s += path("M58 37h5v-3h3v3h5v3h-5v3h-3v-3h-5Z", fill=INK) + ship(26, 65, True)
    return s


def wipeout_panel(i):
    s = score() + rect(12, 34, 1.6, 12) + rect(26, 44, 2, 2)
    if i < 2:
        for x in [65, 69, 73, 77, 81] if i == 0 else [14, 18, 22, 72, 76, 80]:
            for y in range(17, 71, 7):
                s += rect(x, y, 3, 6, "none", stroke=INK, sw=0.4)
        s += path("M12 72H88", sw=0.5)
    else:
        for x in range(16, 87, 8):
            for y in range(21, 72, 9):
                s += rect(x, y, 1.5, 2.5, "none", stroke=INK, sw=0.4)
        if i == 3:
            s += rect(49, 22, 1.3, 43)
        if i == 4:
            s += rect(85, 34, 1.6, 12)
    return s


def car(x, y, outline=False):
    return path(
        f"M{x} {y}h2v3h3v-3h2v4h2v3h-2v4h-2v-3h-3v3h-2v-4h-2v-3h2Z",
        INK,
        0.5,
        WHITE if outline else INK,
    )


def race_panel(i):
    s = score() + path("M13 4V76M49 2V78M51 2V78M87 4V76", sw=0.7)
    for x, y in [(31, 18), (61, 18), (18, 43), (77, 43)]:
        s += car(x, y)
    s += car(38, 60, True)
    if i == 0:
        s += car(75, 60, True)
    return s


def bike_panel(i):
    s = score() + path("M1 34H99M1 56H99M5 75H95", sw=0.65)
    s += (
        circle(58, 68, 1.7)
        + circle(66, 68, 1.7)
        + path("M58 68l3-5 5 5h-8m3-5 3-3m0-3v1", sw=0.7)
    )
    if i in (0, 3):
        s += path("M12 74v-5h32l8 5Z", fill=INK)
        for x in range(14, 43, 3):
            s += rect(x, 70, 1.4, 3.5, WHITE)
    else:
        s += path("M45 34v-2h3v2m0 22v-2h3v2m0 19v-2h3v2", sw=1)
    return s


def person(x, y, pose=0):
    s = circle(x, y, 3)
    if pose in (3, 4):
        return s + path(f"M{x} {y + 8}l7 13h-15l-9-9m9 9-4-8-17-2m8 0v-3", sw=4)
    if pose in (5, 8):
        return s + path(
            f"M{x} {y + 8}l3 11-9 12 8 12m-3-24 9 8-8 13m-3-28-7-3v-15m10 9 7 4v8", sw=4
        )
    return s + path(f"M{x} {y + 7}l-6 11 11-5-4 12m-7-7-11 17m22-22 5-6-10-6h-16", sw=4)


def sports_panel(i):
    s = person(55 if i != 2 else 62, 16, i)
    if i in (0, 2):
        s += path("M37 26l-8-19", sw=1.2) + circle(28, 6, 4, "none")
        s += '<ellipse cx="28" cy="6" rx="4" ry="6" fill="none" stroke="#171a19"/>'
    if i in (1, 6, 7, 9):
        s += (
            circle(34, 53, 2, "none")
            + '<circle cx="34" cy="53" r="2" fill="none" stroke="#171a19"/>'
        )
    if i == 5:
        s += person(25, 13, 8)
    return s


def tank(x, y, flip=False):
    s = path("M7 47Q-2 40 8 31h69q12 12 0 19H10Z", fill=WHITE)
    for n in range(8):
        s += '<ellipse cx="%s" cy="42" rx="4" ry="6" fill="none" stroke="#171a19"/>' % (
            11 + n * 8
        )
    s += path("M4 31 18 24h51l13 10H9Zm19-7 6-13h24l13 13Zm17-13V6h8v5", fill=WHITE)
    s += path("M49 14 99 4l1 4-49 12Z", fill=WHITE) + circle(41, 18, 3, WHITE)
    s += path("M15 29h44m-39 5h49m-34-22 3-8 4 2m13 19 8 7", sw=0.8)
    return (
        f'<g transform="translate({x} {y}) scale({-1.5 if flip else 1.5} 1.5)">{s}</g>'
    )


def holes():
    return (
        text("Left bat adjust", 78, 86, 11, INK, width=130)
        + text("Right bat adjust", 422, 86, 11, INK, width=140)
        + "".join(
            circle(x, 115, 21, WHITE)
            + circle(x, 115, 20)
            + path(f"M{x - 10} 103l19 24", "#72694a", 5)
            for x in (59, 577)
        )
    )


def label(id, index):
    GLYPHS.clear()
    color = INK if id in ("tank", "race", "fundamental") else WHITE
    s = rect(0, 0, 640, 480, COLORS[id], 22)
    s += rect(22, 15, 596, 448, "none", 25, INK, 2)
    s += path("M22 89Q22 68 44 68H597Q618 68 618 89", sw=2)
    titlewidth = {
        "submarine": 205,
        "sports": 346,
        "motorcycle": 330,
        "tank": 310,
        "race": 310,
        "wipeout": 425,
        "shooting": 390,
        "fundamental": 330,
    }[id]
    s += text(NAMES[index], 42, 57, 44, color, 900, titlewidth, True)
    s += text(f"PC-50{index + 1}", 532, 58, 20, color, 700, 68)
    if id == "submarine":
        for i, x in enumerate((68, 260, 452)):
            s += screen(x, 98, 126, 104, submarine_panel(i))
        for title, n, x, y in [
            ("SEA BATTLE", 3, 80, 226),
            ("DESTROYER", 7, 80, 247),
            ("NIGHT SEA", 2, 80, 268),
            ("SUBMARINE", 10, 272, 226),
            ("SPACE A", 6, 470, 226),
            ("SPACE B", 1, 470, 247),
        ]:
            s += caption(title, n, x, y, 70)
        lines = [
            "✦ PUSH AUTO/MANU SERVE SWITCH TO MANU POSITION",
            "✦ SKILL SELECTION OF TEAM-L / TEAM-R",
            "    PRO – HIGH     AM – LOW",
            "✦ JOYSTICK WORKS ON X-AXIS ONLY",
        ]
        for j, line in enumerate(lines):
            s += text(
                line.replace("✦", "•"),
                65,
                321 + j * 22,
                12,
                WHITE,
                700,
                410 if j == 0 else None,
            )
    elif id == "wipeout":
        s += holes()
        for i, (title, n) in enumerate(
            zip(
                [
                    "BREAK-IN I",
                    "BREAK-IN II",
                    "WIPEOUT I",
                    "WIPEOUT II",
                    "WIPEOUT III",
                    "WIPEOUT IV",
                ],
                [1, 6, 3, 5, 9, 10],
            )
        ):
            x, y = 110 + (i % 3) * 160, 98 + (i // 3) * 122
            s += screen(x, y, 102, 86, wipeout_panel(i)) + caption(
                title, n, x + 2, y + 103, 73
            )
        for j, line in enumerate(
            [
                "• USE TEAM-R TO SELECT BALL SIZE",
                "• USE TEAM-L TO SELECT L BAT SIZE",
                "• JOYSTICK WORKS ON Y-AXIS ONLY",
                "• SPEED SWITCH  PRO – LOW SPEED  AM – HIGH SPEED",
            ]
        ):
            s += text(line, 43, 372 + j * 15, 11, WHITE, 700, 335 if j == 3 else None)
    elif id == "race":
        for i in range(2):
            x = 64 + i * 280
            s += caption(
                "TWO-PLAYER GAME" if i == 0 else "ONE-PLAYER GAME",
                1 if i == 0 else 6,
                x + 10,
                116,
                164,
                INK,
            )
            s += screen(x, 134, 230, 182, race_panel(i))
        s += text("• USE SPEED SWITCH FOR", 38, 387, 16, INK, 700, 216) + text(
            "HANDICAP SELECTION", 54, 410, 16, INK, width=183
        )
    elif id == "motorcycle":
        for i, (title, n) in enumerate(
            zip(["STUNT CYCLE", "MOTORCROSS", "DRAG RACE", "ENDURO"], [1, 4, 6, 8])
        ):
            x, y = 174 + (i % 2) * 162, 98 + (i // 2) * 122
            s += screen(x, y, 130, 104, bike_panel(i))
            tx = 54 if i % 2 == 0 else 488
            s += number(n, tx + 60 if i % 2 == 0 else tx, y + 54) + text(
                title, tx, y + 103, 16, WHITE, 700, 86
            )
        s += text(
            "• USE TEAM-L SWITCH FOR HARD / EASY", 44, 374, 12, WHITE, 700, 270
        ) + text("MODE SELECTION", 58, 389, 12)
        s += text(
            "• USE LEFT CONTROL BOX FOR THROTTLE CONTROL", 44, 409, 12, WHITE, 700, 310
        )
    elif id == "tank":
        s += tank(66, 91) + tank(66, 204) + tank(537, 154, True)
        s += text("• SERVE SWITCH MUST BE IN MANU POSITION", 44, 376, 11, INK, 700, 296)
        s += text(
            "• USE TEAM-L SWITCH FOR INTERACTION", 44, 393, 11, INK, 700, 280
        ) + text("SELECTION", 57, 408, 11, INK)
    elif id == "sports":
        for i, title in enumerate(
            [
                "SQUASH",
                "HOCKEY",
                "TENNIS",
                "TARGET II",
                "TARGET I",
                "BASKETBALL",
                "SOCCER",
                "GRIDBALL",
                "BASKETBALL",
                "PRACTICE",
            ]
        ):
            x, y = 40 + (i % 5) * 115, 118 + (i // 5) * 110
            s += screen(x, y, 100, 78, sports_panel(i))
            s += text(str(i + 1), x + 87, y + 73, 14, INK, 700, 10) + text(
                title, x, y + 98, 14, WHITE, 700, min(100, len(title) * 8)
            )
            if i == 8:
                s += text("PRACTICE", x, y + 114, 14, WHITE, 700, 82)
        s += holes()
        s += text("10 EXCITING PROGRAMMABLE", 41, 380, 20, WHITE, 700, 250) + text(
            "HOME VIDEO GAMES", 41, 405, 20, WHITE, 700, 190
        )
    elif id == "shooting":
        for i, x in enumerate((68, 260, 452)):
            inside = ""
            if i == 0:
                inside = score()
                for xx in range(15, 87, 16):
                    for yy in (23, 41, 59):
                        inside += rect(xx, yy, 8, 12, "none", stroke=INK, sw=0.5)
            elif i == 1:
                inside = rect(65, 57, 10, 10, "none", stroke=INK, sw=0.6) + path(
                    "M25 15C29 42 65 38 65 67M25 15C36 42 72 40 75 57M25 15C32 43 66 44 68 57",
                    sw=0.6,
                )
            else:
                inside = (
                    rect(7, 58, 14, 14, "none", stroke=INK, sw=0.7)
                    + rect(80, 58, 14, 14, "none", stroke=INK, sw=0.7)
                    + path(
                        "M7 58Q35 -8 78 14M21 58Q40 -2 78 14M80 58l-9-17m23 17-9-17M35 22l13 17m-17-14 11 17",
                        sw=0.6,
                    )
                )
            s += screen(x, 98, 126, 104, inside)
            s += caption(
                ["TARGET II", "ATTACK II", "SKEET II"][i], [1, 3, 7][i], x - 4, 225, 62
            )
            s += caption(
                ["TARGET I", "ATTACK I", "SKEET I"][i], [2, 6, 10][i], x - 4, 245, 62
            )
        lines = [
            "• Push AUTO/MANU SERVE switch to MANU position when playing two guns",
            "• TEAM-L switch:  PRO – 2 guns     AM – 1 gun",
            "• TEAM-R switch:  PRO – Small target     AM – Large target",
            "• SPEED switch:  PRO – Slow speed     AM – Fast speed",
            "• Use LEFT JOYSTICK for skill selection in 2-gun games",
            "     Up left       Small target / Fast speed",
            "     Up right     Large target / Fast speed",
            "     Down left   Small target / Slow speed",
            "     Down right Large target / Slow speed",
            "• Use LEFT JOYSTICK for target control",
            "• Use SLAVE GUN for single gun games",
        ]
        for j, line in enumerate(lines):
            s += text(line, 60, 270 + j * 14, 10, WHITE, 700, 510 if j == 0 else None)
    else:
        s += holes()
        s += text("6 EXCITING", 52, 148, 15, INK, 700) + text(
            "TV GAMES", 52, 168, 15, INK, 700
        )
        for i, title in enumerate(
            ["TENNIS", "HOCKEY", "HANDBALL", "SQUASH", "TARGET I", "TARGET II"]
        ):
            x, y = (320 + i * 124, 102) if i < 2 else (58 + (i - 2) * 134, 222)
            diagram = (
                score()
                + path("M16 25v30m68-30v30M50 18v6m0 5v6m0 5v6m0 5v6m0 5v6", sw=2)
                + rect(63, 42, 3, 3)
            )
            s += screen(x, y, 98, 76, diagram) + text(
                title, x + 2, y + 94, 11, INK, 700, 86
            )
        s += text("• SELECT GAME WITH CONSOLE KEYS", 46, 373, 12, INK, 700)
        s += text("• USE JOYSTICK TO CONTROL BAT", 46, 393, 12, INK, 700)
    s += rect(397, 365, 201, 40, WHITE, 5, INK, 1)
    s += text("This side towards player", 395, 422, 14, color, width=205)
    s += text(
        "See instruction sheet for complete game details", 41, 449, 16, color, width=466
    )
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480"><title>{escape(NAMES[index])} PC-50{index + 1} — redrawn label</title><defs>{"".join(GLYPHS.values())}</defs>{s}</svg>\n'


for index, id in enumerate(COLORS):
    (ROOT / f"web/public/cartridges/{id}.svg").write_text(label(id, index))
print("Rebuilt eight cartridge labels with outlined Inter lettering.")
