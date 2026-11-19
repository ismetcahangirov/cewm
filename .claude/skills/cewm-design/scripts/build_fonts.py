import io, sys, os, shutil
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

LATIN_RANGE = "U+0000-00FF,U+0130-0131,U+011E-011F,U+015E-015F,U+018F,U+0259,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0301,U+0303,U+0307-0308,U+0327,U+1E9E,U+2000-206F,U+20AC,U+20BC,U+2116,U+2122,U+2190-2193,U+2212,U+2215"
CYR_RANGE = "U+0400-045F,U+0490-0491,U+04B0-04B1"


def parse(r):
    out = []
    for part in r.split(","):
        part = part.strip().replace("U+", "")
        if "-" in part:
            a, b = part.split("-")
            out.extend(range(int(a, 16), int(b, 16) + 1))
        else:
            out.append(int(part, 16))
    return out

src_dir, out_dir = sys.argv[1], sys.argv[2]
SRC = os.path.join(src_dir, "Inter[opsz,wght].ttf")
FEATURES = ["ccmp", "locl", "mark", "mkmk", "kern", "liga", "calt", "rvrn", "tnum", "lnum", "case", "cv05"]


def reload(f):
    b = io.BytesIO()
    f.save(b)
    b.seek(0)
    return TTFont(b)


def instance(limits):
    return reload(instancer.instantiateVariableFont(TTFont(SRC), limits))


def write_subset(font, unicodes, path):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = FEATURES
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    font.flavor = "woff2"
    font.save(path)
    return os.path.getsize(path)


os.makedirs(out_dir, exist_ok=True)
var = instance({"wght": (400, 700)})
lat = write_subset(var, parse(LATIN_RANGE), os.path.join(out_dir, "inter-latin.woff2"))
var = instance({"wght": (400, 700)})
cyr = write_subset(var, parse(CYR_RANGE), os.path.join(out_dir, "inter-cyrillic.woff2"))
shutil.copy(os.path.join(src_dir, "OFL-inter.txt"), os.path.join(out_dir, "OFL.txt"))
print(f"inter-latin.woff2 {lat} B ({lat/1024:.1f} KB)")
print(f"inter-cyrillic.woff2 {cyr} B ({cyr/1024:.1f} KB)")

AZ = "Ağac emalı üçün HOMAG dəzgahları. Şirkət Bakıda yerləşir, servis və ehtiyat hissələri təqdim edir. Ölçü: 3680 × 1250 mm."
EN = "Woodworking machinery from HOMAG. Edge banding, panel sizing and CNC processing, with service and spare parts in Baku."
RU = "Деревообрабатывающее оборудование HOMAG. Кромкооблицовочные и форматно-раскроечные станки, сервис и запчасти в Баку."
DE = "Holzbearbeitungsmaschinen von HOMAG. Kantenanleimen, Plattenaufteilung und CNC-Bearbeitung mit Service und Ersatzteilen."
SAMPLES = {"az": AZ, "en": EN, "ru": RU, "de": DE}


def width(font, text):
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    return sum(hmtx[cmap[ord(c)]][0] for c in text if ord(c) in cmap) / upm


def report(label, inter):
    os2 = inter["OS/2"]
    upm = inter["head"].unitsPerEm
    for fb_label, fb in [("Arial", TTFont("C:/Windows/Fonts/arial.ttf")), ("Roboto", reload(instancer.instantiateVariableFont(TTFont(os.path.join(src_dir, "Roboto[wdth,wght].ttf")), {"wght": 400, "wdth": 100})))]:
        ratios = {k: width(inter, v) / width(fb, v) for k, v in SAMPLES.items()}
        sa = sum(ratios.values()) / len(ratios)
        asc = os2.sTypoAscender / upm / sa
        desc = -os2.sTypoDescender / upm / sa
        gap = os2.sTypoLineGap / upm / sa
        print(f"{label} vs {fb_label}: per-language ratio " + ", ".join(f"{k} {v*100:.2f}%" for k, v in ratios.items()))
        print(f"  size-adjust {sa*100:.2f}%  ascent-override {asc*100:.2f}%  descent-override {desc*100:.2f}%  line-gap-override {gap*100:.2f}%")


print()
t = TTFont(SRC)
print(f"Inter typo metrics: upm {t['head'].unitsPerEm} asc {t['OS/2'].sTypoAscender} desc {t['OS/2'].sTypoDescender} gap {t['OS/2'].sTypoLineGap} fsSelection bit7 USE_TYPO_METRICS={bool(t['OS/2'].fsSelection & 128)} hhea {t['hhea'].ascent}/{t['hhea'].descent}")
report("Text (opsz 14, wght 400)", instance({"opsz": 14, "wght": 400}))
report("Display (opsz 32, wght 500)", instance({"opsz": 32, "wght": 500}))

print()
REQ = {
    "az": "əƏıİğĞşŞçÇöÖüÜ",
    "de": "äÄöÖüÜßẞ",
    "ru": "".join(chr(c) for c in range(0x0410, 0x0450)) + "Ёё",
    "en": "".join(chr(c) for c in range(0x20, 0x7F)),
    "symbols": "₼€№«»„“”‘’–—…°×±²³·",
}
lat_f = TTFont(os.path.join(out_dir, "inter-latin.woff2"))
cyr_f = TTFont(os.path.join(out_dir, "inter-cyrillic.woff2"))
both = set(lat_f.getBestCmap()) | set(cyr_f.getBestCmap())
for k, v in REQ.items():
    miss = "".join(c for c in v if ord(c) not in both)
    print(f"shipped files cover {k}: {len(v) - len(miss)}/{len(v)}" + (f" missing {miss}" if miss else ""))
for fn, f in [("inter-latin.woff2", lat_f), ("inter-cyrillic.woff2", cyr_f)]:
    feats = sorted({r.FeatureTag for r in f["GSUB"].table.FeatureList.FeatureRecord})
    axes = ", ".join(f"{a.axisTag} {a.minValue:g}-{a.maxValue:g}" for a in f["fvar"].axes)
    print(f"{fn}: glyphs {len(f.getGlyphOrder())}, axes {axes}, GSUB {' '.join(feats)}")
