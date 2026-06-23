import re
BACKTICK = chr(96)

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

m = re.search(r"<script>(.*?)</script>", html, re.DOTALL)
js = m.group(1)

bt_count = js.count(BACKTICK)
print(f"Backticks: {bt_count}, even: {bt_count % 2 == 0}")

single_in_template = False
open_template = False
for i, ch in enumerate(js):
    if ch == BACKTICK:
        open_template = not open_template
    elif ch == "'" and not open_template:
        single_in_template = not single_in_template

print(f"Template balanced: {not open_template}")
print(f"Length: {len(js)}")
