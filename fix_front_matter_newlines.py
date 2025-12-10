import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
POSTS_DIR = ROOT / "_posts"

def fix_content(text: str):
    # 只處理有 YAML front matter 的檔案
    if not text.startswith('---'):
        return text, False

    # 第一個 --- 之後的換行位置
    first_end = text.find('\n', 3)
    if first_end == -1:
        return text, False

    # 找第二個 ---（應該是關閉 front matter 的那一個）
    idx2 = text.find('---', first_end + 1)
    if idx2 == -1:
        return text, False

    # 如果本來就是「\n---\n」就不動
    before_char = text[idx2 - 1] if idx2 - 1 >= 0 else ''
    after_char = text[idx2 + 3] if idx2 + 3 < len(text) else ''
    if before_char == '\n' and after_char == '\n':
        return text, False

    # 否則就把它拆開，變成獨立一行的 ---
    before = text[:idx2]
    after = text[idx2 + 3:]

    if not before.endswith('\n'):
        before += '\n'
    after = after.lstrip('\n')

    new_text = before + '---\n' + after
    return new_text, True


def main():
    fixed_count = 0

    # 處理 _posts 底下的 .html / .md / .markdown
    for path in POSTS_DIR.glob("*.*"):
        if path.suffix.lower() not in {".html", ".md", ".markdown"}:
            continue

        original = path.read_text(encoding="utf-8")
        new_text, changed = fix_content(original)

        if changed:
            path.write_text(new_text, encoding="utf-8")
            print("已修正：", path.relative_to(ROOT))
            fixed_count += 1

    print(f"完成，總共修正 {fixed_count} 個檔案。")


if __name__ == "__main__":
    main()
