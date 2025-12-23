#!/usr/bin/env python3
# fix_headings.py
from __future__ import annotations
import argparse
import re
from pathlib import Path

HEADING_LINE_RE = re.compile(r"^(\s{0,3}#{1,6})\s+(.*?)(\r?\n)?$")

def normalize_heading(text: str) -> str:
    """
    Remove bold markers and trailing colon-like punctuation/spaces.
    e.g. "**裝備配置：**" -> "裝備配置"
         "結論：" -> "結論"
    """
    t = text.strip()
    t = t.replace("**", "").strip()
    t = re.sub(r"[：:]\s*$", "", t).strip()
    return t

def process_file(path: Path) -> bool:
    raw = path.read_bytes()

    # preserve newline style
    newline = b"\r\n" if b"\r\n" in raw else b"\n"

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        # fallback for some legacy exports
        text = raw.decode("utf-8", errors="replace")

    lines = text.splitlines(keepends=True)
    changed = False
    out_lines: list[str] = []

    for line in lines:
        m = HEADING_LINE_RE.match(line)
        if not m:
            out_lines.append(line)
            continue

        _hashes, body, eol = m.group(1), m.group(2), m.group(3) or ""
        # keep possible kramdown anchor like "{#something}" if present
        anchor = ""
        anchor_m = re.search(r"\s*\{#.*?\}\s*$", body)
        if anchor_m:
            anchor = anchor_m.group(0)
            body_wo_anchor = body[: anchor_m.start()].rstrip()
        else:
            body_wo_anchor = body

        key = normalize_heading(body_wo_anchor)

        if key == "裝備配置":
            out_lines.append(f"### **裝備配置**{anchor}{eol}")
            changed = True
        elif key == "結論":
            out_lines.append(f"### **結論**{anchor}{eol}")
            changed = True
        else:
            out_lines.append(line)

    if changed:
        new_text = "".join(out_lines)
        # write back using original newline style
        new_bytes = new_text.replace("\n", newline.decode("ascii")).encode("utf-8")
        path.write_bytes(new_bytes)

    return changed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="要掃描的資料夾（建議用 repo 根目錄）")
    ap.add_argument("--dry-run", action="store_true", help="只列出會修改的檔案，不寫入")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    md_files = [*root.rglob("*.md"), *root.rglob("*.markdown")]

    touched = 0
    for p in md_files:
        if args.dry_run:
            # simulate: read and check if it would change
            raw = p.read_text(encoding="utf-8", errors="replace").splitlines()
            for line in raw:
                m = HEADING_LINE_RE.match(line + "\n")
                if not m:
                    continue
                body = m.group(2)
                body_wo_anchor = re.sub(r"\s*\{#.*?\}\s*$", "", body).rstrip()
                key = normalize_heading(body_wo_anchor)
                if key in ("裝備配置", "結論"):
                    print("[would change]", p)
                    touched += 1
                    break
        else:
            if process_file(p):
                print("[changed]", p)
                touched += 1

    print(f"Done. {'Would update' if args.dry_run else 'Updated'} {touched} file(s) out of {len(md_files)} markdown file(s).")

if __name__ == "__main__":
    main()
