import sys

TOKENS = {
    "navy": "#001941",
    "navy-deep": "#000f29",
    "navy-raised": "#0b2756",
    "cyan": "#00b9ff",
    "cyan-ink": "#0076a3",
    "mist": "#f3f6fc",
    "white": "#ffffff",
    "ink": "#001941",
    "ink-muted": "#4a5a73",
    "grey": "#6d6d6d",
    "on-navy-muted": "#7591bd",
    "line": "#dbdbdb",
    "line-strong": "#7b8494",
    "danger": "#b3261e",
    "success": "#17703f",
    "warning": "#8f5a00",
}

ALLOWED = [
    ("ink", "white", 4.5, "headings, body"),
    ("ink", "mist", 4.5, "headings, body on the mist band"),
    ("ink", "cyan", 4.5, "label of the cyan button, text on a cyan chip"),
    ("ink-muted", "white", 4.5, "secondary text, captions"),
    ("ink-muted", "mist", 4.5, "secondary text on mist"),
    ("grey", "white", 4.5, "meta: dates, breadcrumbs, spec units"),
    ("grey", "mist", 4.5, "meta on mist"),
    ("cyan-ink", "white", 4.5, "inline links, eyebrow labels on light"),
    ("cyan-ink", "mist", 4.5, "inline links on mist"),
    ("white", "navy", 4.5, "text on navy bands, navy button label"),
    ("white", "navy-deep", 4.5, "footer text"),
    ("white", "navy-raised", 4.5, "text on cards inside navy bands"),
    ("white", "cyan-ink", 4.5, "selected filter chip on light surfaces"),
    ("cyan", "navy", 4.5, "accent text, eyebrow, active nav on navy"),
    ("cyan", "navy-deep", 4.5, "accent text in the footer"),
    ("cyan", "navy-raised", 4.5, "accent text on raised navy cards"),
    ("on-navy-muted", "navy", 4.5, "secondary text on navy"),
    ("on-navy-muted", "navy-deep", 4.5, "secondary text in the footer"),
    ("on-navy-muted", "navy-raised", 4.5, "secondary text on raised navy cards"),
    ("danger", "white", 4.5, "error text"),
    ("danger", "mist", 4.5, "error text on mist"),
    ("white", "danger", 4.5, "destructive button label"),
    ("success", "white", 4.5, "success text"),
    ("success", "mist", 4.5, "success text on mist"),
    ("warning", "white", 4.5, "warning text (admin)"),
    ("warning", "mist", 4.5, "warning text on mist (admin)"),
    ("line-strong", "white", 3.0, "input, select and checkbox borders (non-text)"),
    ("line-strong", "mist", 3.0, "control borders on mist (non-text)"),
    ("navy", "white", 3.0, "focus ring on light surfaces (non-text)"),
    ("navy", "mist", 3.0, "focus ring on mist (non-text)"),
    ("cyan", "navy", 3.0, "focus ring and active indicator on navy (non-text)"),
    ("cyan", "navy-raised", 3.0, "focus ring on raised navy (non-text)"),
]

FORBIDDEN = [
    ("cyan", "white", "cyan text or icons on white: fails even the 3:1 non-text rule"),
    ("cyan", "mist", "cyan text or icons on mist"),
    ("white", "cyan", "white label on a cyan button"),
    ("grey", "navy", "the site grey on navy"),
    ("ink-muted", "navy", "light-theme muted text placed on navy"),
    ("line", "white", "#dbdbdb as an input border: decorative hairline only"),
    ("cyan-ink", "navy", "the dark cyan on navy"),
]


def channel(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_):
    h = hex_.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


failures = 0
print("| Foreground | Background | Ratio | Needs | Result | Use |")
print("|---|---|---|---|---|---|")
for fg, bg, need, use in ALLOWED:
    r = ratio(TOKENS[fg], TOKENS[bg])
    ok = r >= need
    failures += not ok
    print(f"| `{fg}` {TOKENS[fg]} | `{bg}` {TOKENS[bg]} | {r:.2f} | {need:g} | {'pass' if ok else 'FAIL'} | {use} |")
print()
print("| Forbidden pair | Ratio | Why |")
print("|---|---|---|")
for fg, bg, why in FORBIDDEN:
    r = ratio(TOKENS[fg], TOKENS[bg])
    print(f"| `{fg}` on `{bg}` | {r:.2f} | {why} |")
sys.exit(1 if failures else 0)
