#!/usr/bin/env python3
import os
import re

POSTS_DIR = "_posts"

def extract_title(header_text: str) -> str | None:
    """
    從 front matter 中抓 title: 這一行，回傳純文字標題
    """
    m = re.search(r'^title:\s*(.+)$', header_text, flags=re.MULTILINE)
    if not m:
        return None

    raw = m.group(1).strip()
    # 去掉頭尾引號（" 或 '）
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in ['"', "'"]:
        raw = raw[1:-1]
    return raw.strip()

def add_or_update_permalink(path: str) -> None:
    """
    給定一篇文章檔案路徑：
    - 從檔名抓日期 (YYYY-MM-DD-...)
    - 從 front matter 抓 title
    - 寫入 permalink: "/YYYY/MM/DD/標題/"
    """
    filename = os.path.basename(path)
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})-.*', filename)
    if not m:
        print(f"略過（檔名不是 YYYY-MM-DD- 開頭）: {filename}")
        return

    year, month, day = m.group(1), m.group(2), m.group(3)

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if not content.startswith("---"):
        print(f"略過（沒有 YAML front matter）: {filename}")
        return

    parts = content.split("---", 2)
    if len(parts) < 3:
        print(f"略過（front matter 結構怪怪的）: {filename}")
        return

    _, header, body = parts[0], parts[1], parts[2]
    header = header.strip("\n")

    title = extract_title(header)
    if not title:
        print(f"略過（找不到 title）: {filename}")
        return

    # 要寫進 front matter 的 permalink 值
    permalink_value = f'"/{year}/{month}/{day}/{title}/"'

    if re.search(r'^permalink:\s*.+$', header, flags=re.MULTILINE):
        # 如果原本就有 permalink，就更新它
        new_header = re.sub(
            r'^permalink:\s*.+$',
            f'permalink: {permalink_value}',
            header,
            flags=re.MULTILINE,
        )
        print(f"更新 permalink: {filename}")
    else:
        # 沒有就加在最後一行
        new_header = header + "\n" + f"permalink: {permalink_value}"
        print(f"新增 permalink: {filename}")

    new_content = "---\n" + new_header + "\n---" + body

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

def main():
    posts_path = os.path.join(os.path.dirname(__file__), POSTS_DIR)
    if not os.path.isdir(posts_path):
        print(f"找不到資料夾: {posts_path}")
        return

    for fname in os.listdir(posts_path):
        if not (fname.endswith(".md") or fname.endswith(".markdown")):
            continue
        full_path = os.path.join(posts_path, fname)
        add_or_update_permalink(full_path)

    print("完成！請隨機打開幾篇 _posts/*.md 檢查 permalink 有沒有加上去。")

if __name__ == "__main__":
    main()
