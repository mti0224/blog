#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import re
import sys
from urllib.parse import urlparse, unquote

LIQUID_BASEURL_RE = re.compile(r"\{\{\s*site\.baseurl\s*\}\}", re.IGNORECASE)

def strip_quotes(s: str) -> str:
    s = s.strip()
    if (len(s) >= 2) and ((s[0] == s[-1]) and s[0] in ("'", '"')):
        return s[1:-1].strip()
    return s

def normalize_cover_image(value: str) -> str:
    """
    Normalize coverImage to a clean path like: /assets/...
    - Remove Liquid {{ site.baseurl }}
    - URL-decode if it was percent-encoded
    - Remove leading /blog if present
    - If absolute URL, keep only its path
    """
    if value is None:
        return value

    raw = strip_quotes(value)

    # URL decode (handles %7B%7B...%7D%7D etc.)
    decoded = unquote(raw)

    # Remove any Liquid baseurl tag
    decoded = LIQUID_BASEURL_RE.sub("", decoded).strip()

    # If it's an absolute URL, keep only the path
    if decoded.startswith("http://") or decoded.startswith("https://"):
        p = urlparse(decoded)
        decoded = p.path or ""

    # Trim spaces again
    decoded = decoded.strip()

    # Normalize slashes
    decoded = decoded.replace("\\", "/")

    # Remove accidental duplicate slashes (keep leading //? not needed here)
    while "//" in decoded:
        decoded = decoded.replace("//", "/")

    # Remove leading baseurl fragments if user accidentally stored them
    # e.g. /blog/assets/... or blog/assets/...
    for prefix in ("/blog/assets/", "blog/assets/"):
        if decoded.startswith(prefix):
            decoded = "/assets/" + decoded.split("assets/", 1)[1]
            break

    # If starts with "/blog/" but not specifically assets, still strip /blog/
    if decoded.startswith("/blog/"):
        decoded = decoded[len("/blog"):]  # keeps leading '/'

    # If starts with "assets/..." -> make it "/assets/..."
    if decoded.startswith("assets/"):
        decoded = "/" + decoded

    # If it contains "/assets/" but not at start, try to cut to it
    idx = decoded.find("/assets/")
    if idx > 0:
        decoded = decoded[idx:]

    # If it contains "assets/" but not "/assets/", cut and prefix with '/'
    idx2 = decoded.find("assets/")
    if idx2 > 0 and "/assets/" not in decoded:
        decoded = "/" + decoded[idx2:]

    # Final cleanup
    decoded = decoded.strip()
    if decoded and not decoded.startswith("/"):
        decoded = "/" + decoded

    return decoded

def process_markdown_file(path: str) -> bool:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Must start with front matter
    if not (text.startswith("---\n") or text.startswith("---\r\n")):
        return False

    lines = text.splitlines(True)  # keep newlines
    # Find end of front matter
    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
    if end_idx is None:
        return False

    fm_lines = lines[1:end_idx]
    body_lines = lines[end_idx:]  # includes the closing --- line and rest

    changed = False
    new_fm_lines = []
    cover_found = False

    # Support keys: coverImage only (as you asked). If you later want more, add here.
    key_re = re.compile(r"^(\s*)coverImage\s*:\s*(.*)\s*$")

    for line in fm_lines:
        m = key_re.match(line.rstrip("\r\n"))
        if not m:
            new_fm_lines.append(line)
            continue

        indent, val = m.group(1), m.group(2)
        cover_found = True

        normalized = normalize_cover_image(val)
        original_clean = strip_quotes(val)
        normalized_clean = strip_quotes(normalized)

        if normalized_clean != strip_quotes(unquote(original_clean)):
            # Always write as double-quoted string for safety
            new_line = f'{indent}coverImage: "{normalized}"\n'
            new_fm_lines.append(new_line)
            changed = True
        else:
            new_fm_lines.append(line)

    if not cover_found:
        return False

    if changed:
        new_text = "".join([lines[0]] + new_fm_lines + body_lines)
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_text)

    return changed

def main():
    repo_root = sys.argv[1] if len(sys.argv) >= 2 else "."
    exts = {".md", ".markdown"}

    total = 0
    updated = 0

    for root, _, files in os.walk(repo_root):
        for fn in files:
            if os.path.splitext(fn)[1].lower() in exts:
                total += 1
                p = os.path.join(root, fn)
                try:
                    if process_markdown_file(p):
                        updated += 1
                except Exception as e:
                    print(f"[WARN] Failed: {p}\n  {e}")

    print(f"Done. Updated {updated} file(s) out of {total} markdown file(s).")

if __name__ == "__main__":
    main()
