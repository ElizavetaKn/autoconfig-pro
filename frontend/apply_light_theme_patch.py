from pathlib import Path

ROOT = Path("src")

REPLACEMENTS = [
    ("#02070b", "var(--bg-color)"),
    ("#02080c", "var(--bg-elevated)"),
    ("#f8fafc", "var(--text-color)"),
    ("#f5f7fb", "var(--text-strong)"),
    ("#e8eef5", "var(--text-color)"),
    ("#ffffff", "var(--bg-elevated)"),
    ("#fff", "var(--bg-elevated)"),

    ("#19e5df", "var(--accent-color)"),
    ("#19dcd6", "var(--accent-strong)"),
    ("#1ef0ea", "var(--accent-color)"),
    ("#20ebe5", "var(--accent-color)"),
    ("#14f1ec", "var(--accent-color)"),
    ("#12e8e1", "var(--accent-color)"),
    ("#00b8b3", "var(--accent-color)"),

    ("#031015", "var(--text-on-accent)"),
    ("#041017", "var(--text-on-accent)"),
    ("#041014", "var(--text-on-accent)"),

    ("#ffd8d8", "var(--danger-text)"),
    ("#ffe7e7", "var(--danger-text)"),
    ("#ffd3d3", "var(--danger-text)"),
    ("#dffef8", "var(--success-text)"),
    ("#dffefe", "var(--success-text)"),
    ("#dffefd", "var(--success-text)"),
    ("#edf8fb", "var(--text-color)"),

    ("rgba(0, 255, 234, 0.18)", "var(--accent-border)"),
    ("rgba(0,255,234,0.18)", "var(--accent-border)"),
    ("rgba(0, 255, 234, 0.16)", "var(--accent-border)"),
    ("rgba(0,255,234,0.16)", "var(--accent-border)"),
    ("rgba(0, 255, 234, 0.14)", "var(--accent-border-soft)"),
    ("rgba(0,255,234,0.14)", "var(--accent-border-soft)"),
    ("rgba(0, 255, 234, 0.12)", "var(--accent-soft-2)"),
    ("rgba(0,255,234,0.12)", "var(--accent-soft-2)"),
    ("rgba(0, 255, 234, 0.10)", "var(--accent-soft-2)"),
    ("rgba(0,255,234,0.10)", "var(--accent-soft-2)"),
    ("rgba(0, 255, 234, 0.1)", "var(--accent-soft-2)"),
    ("rgba(0, 255, 234, 0.08)", "var(--accent-soft)"),
    ("rgba(0,255,234,0.08)", "var(--accent-soft)"),
    ("rgba(0, 255, 234, 0.06)", "var(--accent-soft-3)"),
    ("rgba(0,255,234,0.06)", "var(--accent-soft-3)"),
    ("rgba(0, 255, 234, 0.04)", "var(--accent-glow)"),
    ("rgba(0,255,234,0.04)", "var(--accent-glow)"),
    ("rgba(0, 255, 234, 0.28)", "var(--accent-border-strong)"),
    ("rgba(0,255,234,0.28)", "var(--accent-border-strong)"),
    ("rgba(0, 255, 234, 0.26)", "var(--accent-border-strong)"),
    ("rgba(0, 255, 234, 0.24)", "var(--accent-border-strong)"),
    ("rgba(0, 255, 234, 0.22)", "var(--accent-border)"),
    ("rgba(0,255,234,0.22)", "var(--accent-border)"),
    ("rgba(0, 255, 234, 0.34)", "var(--accent-border-strong)"),
    ("rgba(0,255,234,0.34)", "var(--accent-border-strong)"),
    ("rgba(0, 255, 234, 0.3)", "var(--accent-border-strong)"),
    ("rgba(0, 255, 234, 0.2)", "var(--accent-border)"),
    ("rgba(0,255,234,0.2)", "var(--accent-border)"),

    ("rgba(248, 250, 252, 0.78)", "var(--text-muted)"),
    ("rgba(248, 250, 252, 0.74)", "var(--text-muted)"),
    ("rgba(248, 250, 252, 0.72)", "var(--text-muted)"),
    ("rgba(248, 250, 252, 0.7)", "var(--text-muted)"),
    ("rgba(248, 250, 252, 0.68)", "var(--text-muted-2)"),
    ("rgba(248, 250, 252, 0.66)", "var(--text-muted-2)"),
    ("rgba(248, 250, 252, 0.64)", "var(--text-muted-2)"),
    ("rgba(248, 250, 252, 0.62)", "var(--text-muted-2)"),
    ("rgba(248, 250, 252, 0.6)", "var(--text-muted-2)"),
    ("rgba(248, 250, 252, 0.58)", "var(--text-muted-3)"),
    ("rgba(248, 250, 252, 0.56)", "var(--text-muted-3)"),
    ("rgba(248, 250, 252, 0.55)", "var(--text-muted-3)"),
    ("rgba(248, 250, 252, 0.52)", "var(--text-muted-3)"),
    ("rgba(248, 250, 252, 0.5)", "var(--text-muted-3)"),
    ("rgba(248, 250, 252, 0.82)", "var(--text-color)"),
    ("rgba(248, 250, 252, 0.84)", "var(--text-color)"),
    ("rgba(248, 250, 252, 0.86)", "var(--text-color)"),
    ("rgba(248, 250, 252, 0.8)", "var(--text-color)"),
    ("rgba(248, 250, 252, 0.9)", "var(--text-color)"),
    ("rgba(248, 250, 252, 0.95)", "var(--text-color)"),

    ("rgba(255, 255, 255, 0.06)", "var(--line-color)"),
    ("rgba(255, 255, 255, 0.04)", "var(--line-color-soft)"),
    ("rgba(255, 255, 255, 0.08)", "var(--accent-glow)"),

    ("rgba(72, 16, 16, 0.4)", "var(--danger-bg)"),
    ("rgba(70, 8, 13, 0.78)", "var(--danger-bg)"),
    ("rgba(255, 120, 120, 0.36)", "var(--danger-border)"),
    ("rgba(255, 120, 120, 0.3)", "var(--danger-border)"),
    ("rgba(255, 120, 120, 0.28)", "var(--danger-border)"),
    ("rgba(255, 120, 120, 0.26)", "var(--danger-border)"),
    ("rgba(255, 88, 88, 0.32)", "var(--danger-border)"),
    ("rgba(255, 102, 102, 0.18)", "var(--danger-border)"),
    ("rgba(255, 102, 102, 0.14)", "var(--danger-border)"),

    ("rgba(6, 54, 47, 0.72)", "var(--success-bg)"),
    ("rgba(23, 236, 204, 0.24)", "var(--success-border)"),

    ("rgba(2, 7, 11, 0.92)", "var(--surface-soft)"),
    ("rgba(2, 7, 11, 0.9)", "var(--surface-soft)"),
    ("rgba(2, 7, 11, 0.88)", "var(--surface-soft-2)"),
    ("rgba(3, 13, 19, 0.92)", "var(--surface-soft-3)"),
    ("rgba(7, 21, 30, 0.96)", "var(--surface-color)"),
    ("rgba(10, 28, 38, 0.96)", "var(--surface-hover)"),
    ("rgba(4, 16, 23, 0.88)", "var(--input-bg)"),
    ("rgba(5, 18, 26, 0.96)", "var(--surface-color)"),
    ("rgba(2, 10, 15, 0.96)", "var(--surface-soft)"),
    ("rgba(2, 8, 12, 0.82)", "var(--nav-bg)"),
    ("rgba(0, 0, 0, 0.26)", "var(--shadow-color)"),
]

for path in ROOT.rglob("*.css"):
    if path.name == "globals.css":
        continue

    text = path.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)

    path.write_text(text, encoding="utf-8")

print("Готово: CSS-файлы переведены на переменные темы.")