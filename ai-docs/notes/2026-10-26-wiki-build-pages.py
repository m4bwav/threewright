"""Fill {{section}} and {{section|noexit}} placeholders in SRC/*.md from a wiki-verify output file.

    python build_pages.py OUT.txt SRC_DIR WIKI_DIR VERIFY_PROGRAM
"""
import os
import re
import sys

out, src, dst, prog = sys.argv[1:5]
text = open(out, encoding="utf-8").read().replace("\r\n", "\n")
labels = set(re.findall(r'(?:snippet|show)\("([^"]+)"', open(prog, encoding="utf-8").read()))
sections, cur = {}, None
for line in text.split("\n"):
    name = line[3:].strip() if line.startswith("## ") else None
    if name in labels and name not in sections:
        cur = name
        sections[cur] = []
    elif cur:
        sections[cur].append(line)
sections = {k: "\n".join(v).strip("\n") for k, v in sections.items()}

for f in os.listdir(src):
    s = open(os.path.join(src, f), encoding="utf-8").read()

    def fill(m):
        label, _, opt = m.group(1).partition("|")
        body = sections[label]
        if opt == "noexit":
            body = "\n".join(l for l in body.split("\n") if not re.fullmatch(r"\[exit \d+\]", l))
        return body

    s = re.sub(r"\{\{([^}]+)\}\}", fill, s)
    open(os.path.join(dst, f), "w", encoding="utf-8", newline="\n").write(s)
    print("built", f)
