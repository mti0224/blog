#!/usr/bin/env python3
# fix_assets_baseurl.py
from __future__ import annotations

import argparse
import re
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "vendor", "_site"}

def rewrite_assets(text: str) -> str:
    # 若你某些文章已經是絕對網址（https://mti0224.github.io/assets/...），也一併修正
    text = text.replace(
        "https://mti0224.github.io/assets/",
        "{{ site.url }}{{ site.baseurl }}/assets/",
    )
    text = text.replace(
        "http://mti0224.github.io/assets/",
        "{{ site.url }}{{ site.baseurl }}/assets/",
    )

    # Markdown link/image: (... /assets/...)
    text = re.sub(r"\(/assets/", r"({{ site.baseurl }}/assets/", text)

    # YAML / HTML 常見："/assets/..." 或 '/assets/...'
    text = re.sub(r"([\"'])/assets/", r"\1{{ site.baseurl }}/assets/", text)

    # 少數情況：src=/assets/...（沒引號）
    text = re.sub(r"(\b(?:src|href)=)/assets/", r"\1{{ site.baseurl }}/assets/", text)

    return text

def iter_target_files(root: Path):
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() in {".md", ".markdown", ".html"}:
            yield p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=str, default=".", help="Repo root (where _posts/ lives)")
    ap.add_argument("--dry-run", action="store_true", help="Only report, do not write files")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    files = list(iter_target_files(root))

    changed = 0
    for p in files:
        old = p.read_text(encoding="utf-8", errors="ignore")
        new = rewrite_assets(old)
        if new != old:
            changed += 1
            if not args.dry_run:
                p.write_text(new, encoding="utf-8")
            print(f"[changed] {p.relative_to(root)}")

    mode = "Would update" if args.dry_run else "Updated"
    print(f"Done. {mode} {changed} file(s) out of {len(files)} file(s).")

if __name__ == "__main__":
    main()
