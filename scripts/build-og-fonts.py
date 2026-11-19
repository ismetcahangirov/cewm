import sys, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for name in ("latin", "cyrillic"):
    for w in (500, 700):
        f = TTFont(os.path.join(src, f"inter-{name}.woff2"))
        f.flavor = None
        f = instancer.instantiateVariableFont(f, {"wght": w})
        opts = subset.Options()
        opts.layout_features = []
        opts.hinting = False
        opts.name_IDs = [1, 2, 3, 4, 6]
        opts.notdef_outline = True
        opts.drop_tables += ["GSUB", "GPOS", "GDEF", "STAT", "MVAR", "HVAR", "avar", "fvar", "gvar", "kern", "DSIG", "morx", "post"]
        s = subset.Subsetter(opts)
        s.populate(unicodes=list(f.getBestCmap().keys()))
        s.subset(f)
        p = os.path.join(out, f"inter-{name}-{w}.ttf")
        f.save(p)
        print(p, os.path.getsize(p), sorted(f.keys()))
