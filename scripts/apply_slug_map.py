# -*- coding: utf-8 -*-
import os, re, csv, sys

POSTS_DIR = "_posts"
MAP_FILE = "slug_map.csv"
BACKUP_EXT = ".bak"

FRONT_MATTER_RE = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.S | re.M)

def quote_yaml(s: str) -> str:
    # 安全起見一律用雙引號包住，並轉義內部雙引號
    return '"' + s.replace('"', '\\"') + '"'

def patch_front_matter(text: str, slug_value: str) -> str:
    m = FRONT_MATTER_RE.match(text)
    if not m:
        raise ValueError("檔案缺少 YAML front matter（--- 區塊）")
    fm = m.group(1)
    body = text[m.end():]

    if re.search(r'^\s*slug\s*:', fm, flags=re.M):
        # 覆蓋既有 slug
        fm_new = re.sub(r'^\s*slug\s*:\s*.*$',
                        f'slug: {quote_yaml(slug_value)}',
                        fm, count=1, flags=re.M)
    else:
        # 嘗試插在 title 後；若沒有 title，插在最上方
        if re.search(r'^\s*title\s*:', fm, flags=re.M):
            fm_new = re.sub(r'(^\s*title\s*:.*$)',
                            r'\1\nslug: ' + quote_yaml(slug_value),
                            fm, count=1, flags=re.M)
        else:
            fm_new = 'slug: ' + quote_yaml(slug_value) + '\n' + fm

    return '---\n' + fm_new + '\n---\n' + body

def main():
    if not os.path.isdir(POSTS_DIR):
        print(f"找不到目錄：{POSTS_DIR}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(MAP_FILE):
        print(f"找不到對照檔：{MAP_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(MAP_FILE, 'r', encoding='utf-8-sig', newline='') as f:
        rows = list(csv.reader(f))

    if not rows:
        print("slug_map.csv 為空", file=sys.stderr)
        sys.exit(1)

    ok, fail = 0, 0
    for row in rows:
        if not row or len(row) < 2:
            continue
        filename = row[0].strip()
        slug_value = row[1].strip()
        if not filename or not slug_value:
            continue

        path = os.path.join(POSTS_DIR, filename)
        if not os.path.isfile(path):
            print(f"[略過] 找不到檔案：{path}")
            fail += 1
            continue

        try:
            with open(path, 'r', encoding='utf-8') as rf:
                text = rf.read()
            new_text = patch_front_matter(text, slug_value)

            # 備份
            with open(path + BACKUP_EXT, 'w', encoding='utf-8') as bf:
                bf.write(text)
            with open(path, 'w', encoding='utf-8', newline='\n') as wf:
                wf.write(new_text)

            print(f"[OK] {filename} → slug: {slug_value}")
            ok += 1
        except Exception as e:
            print(f"[失敗] {filename}: {e}", file=sys.stderr)
            fail += 1

    print(f"\n完成。成功 {ok}、失敗 {fail}")

if __name__ == "__main__":
    main()
