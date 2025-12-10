#!/usr/bin/env python3
from pathlib import Path
import re

# 專案根目錄 = 這支腳本所在的位置
ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "_posts"

# pattern1：同一行裡面有 post title/title/posttitle + slug，砍掉 slug 後面的內容
title_slug_re = re.compile(
    r'^(.*?\b(post title|posttitle|title):[^\n]*?)\s+slug:[^\n]*$',
    re.IGNORECASE | re.MULTILINE,
)

# pattern2：front matter 裡 slug 是 e6-81-a9-e7-90-b4 這種十六進位形式
hex_slug_re = re.compile(
    r'^(slug:\s*["\']?)([0-9a-f]{2}(?:-[0-9a-f]{2})+)(["\']?\s*)$',
    re.IGNORECASE | re.MULTILINE,
)


def decode_hex_slug(hex_str: str) -> str:
    """
    把像 e6-81-a9-e7-90-b4 這種字串轉成真正的 UTF-8 文字（恩琴）
    """
    parts = hex_str.split("-")
    data = bytes(int(p, 16) for p in parts)
    return data.decode("utf-8")


def process_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text

    # 1) 清掉標題行後面的 slug: ...
    text = title_slug_re.sub(lambda m: m.group(1), text)

    # 2) 把 front matter 裡的十六進位 slug 轉成中文
    def replace_hex_slug(match: re.Match) -> str:
        prefix, hexslug, suffix = match.groups()
        try:
            decoded = decode_hex_slug(hexslug)
        except Exception:
            # 解碼失敗就不要動這行
            return match.group(0)
        return f"{prefix}{decoded}{suffix}"

    text = hex_slug_re.sub(replace_hex_slug, text)

    # 如果檔案有變動，就寫回去並存備份
    if text != original:
        backup = path.with_suffix(path.suffix + ".bak")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(text, encoding="utf-8")
        print(f"Updated: {path}")


def main():
    if not POSTS_DIR.exists():
        print(f"找不到 _posts 目錄：{POSTS_DIR}")
        return

    for p in POSTS_DIR.rglob("*"):
        if p.is_file() and p.suffix.lower() in (".md", ".markdown", ".html"):
            process_file(p)


if __name__ == "__main__":
    main()
