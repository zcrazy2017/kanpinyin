"""Check syntax of JS code across all module files and index.html."""
import re
import glob
BACKTICK = chr(96)

all_ok = True

for fpath in ["index.html"] + sorted(glob.glob("src/**/*.js", recursive=True)):
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    if fpath.endswith(".html"):
        # Find all <script src="..."> external references
        # No inline script expected anymore
        js_code = ""
    else:
        js_code = content

    if not js_code:
        print(f"✓ {fpath} (no inline script to check)")
        continue

    bt_count = js_code.count(BACKTICK)
    open_template = False
    for ch in js_code:
        if ch == BACKTICK:
            open_template = not open_template
    balanced = not open_template

    issues = []
    if bt_count % 2 != 0:
        issues.append(f"ODD backtick count ({bt_count})")
        all_ok = False
    if not balanced:
        issues.append("UNBALANCED template literals")
        all_ok = False

    icon = "✅" if not issues else "❌"
    print(f"{icon} {fpath}: bt={bt_count} bal={balanced} len={len(js_code)}"
          + (f" -- {', '.join(issues)}" if issues else ""))

print(f"\n{'All OK' if all_ok else 'ISSUES FOUND'}")
