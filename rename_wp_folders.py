from __future__ import annotations
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(r"/Users/warmycat/documents/GitHub/blog")
APPLY = True
VERBOSE = True
BACKUP = True

POST_RE = re.compile(r'^(?P<date>\d{4}-\d{2}-\d{2})-(?P<slug>.+)\.md$')

@dataclass
class PostInfo:
    md_path: Path
    date: str
    slug: str

def collect_posts(posts_dir: Path) -> list[PostInfo]:
    posts = []
    for md in sorted(posts_dir.glob("*.md")):
        m = POST_RE.match(md.name)
        if not m:
            continue
        posts.append(PostInfo(md_path=md, date=m.group("date"), slug=m.group("slug")))
    return posts

def find_target_mappings(posts: list[PostInfo], wp_dir: Path):
    rename_jobs = []
    for post in posts:
        old_dir = wp_dir / post.slug
        new_dir = wp_dir / f"{post.date}-{post.slug}"
        if old_dir.exists() and old_dir.is_dir():
            rename_jobs.append((old_dir, new_dir, post))
    return rename_jobs

def replace_paths_in_markdown(content: str, old_name: str, new_name: str) -> tuple[str, int]:
    patterns = [
        rf'(/assets/wp/){re.escape(old_name)}(?=/)',
        rf'(\{{\{{\s*site\.baseurl\s*\}}\}}/assets/wp/){re.escape(old_name)}(?=/)',
        rf'(^|[("\'\s])(assets/wp/){re.escape(old_name)}(?=/)',
        rf'(^|[("\'\s])(\./assets/wp/){re.escape(old_name)}(?=/)',
    ]

    total = 0
    new_content = content

    for pat in patterns[:2]:
        new_content, n = re.subn(pat, lambda m: m.group(1) + new_name, new_content)
        total += n

    new_content, n = re.subn(
        patterns[2],
        lambda m: m.group(1) + m.group(2) + new_name,
        new_content,
        flags=re.MULTILINE
    )
    total += n

    new_content, n = re.subn(
        patterns[3],
        lambda m: m.group(1) + m.group(2) + new_name,
        new_content,
        flags=re.MULTILINE
    )
    total += n

    return new_content, total

def backup_file(path: Path):
    backup = path.with_suffix(path.suffix + ".bak")
    shutil.copy2(path, backup)

def main():
    posts_dir = ROOT / "_posts"
    wp_dir = ROOT / "assets" / "wp"

    if not posts_dir.exists():
        print(f"[錯誤] 找不到資料夾: {posts_dir}")
        return

    if not wp_dir.exists():
        print(f"[錯誤] 找不到資料夾: {wp_dir}")
        return

    posts = collect_posts(posts_dir)
    if not posts:
        print("[錯誤] _posts 內沒有找到符合 YYYY-MM-DD-標題.md 的文章")
        return

    rename_jobs = find_target_mappings(posts, wp_dir)

    if not rename_jobs:
        print("[資訊] 沒有找到可重新命名的 assets/wp 子資料夾。")
        return

    print(f"[資訊] 找到 {len(rename_jobs)} 個可處理的文章資料夾\n")

    total_md_updated = 0
    total_replacements = 0

    for old_dir, new_dir, post in rename_jobs:
        old_name = old_dir.name
        new_name = new_dir.name

        print(f"文章: {post.md_path.name}")
        print(f"資料夾: {old_dir}  ->  {new_dir}")

        if new_dir.exists() and new_dir != old_dir:
            print("  [跳過] 目標資料夾已存在，避免覆蓋。")
            print()
            continue

        md_text = post.md_path.read_text(encoding="utf-8")
        new_md_text, count = replace_paths_in_markdown(md_text, old_name, new_name)

        if count == 0:
            print("  [提醒] 這篇 md 沒有找到對應圖片路徑字串。")
        else:
            print(f"  [資訊] md 路徑替換數量: {count}")

        if APPLY:
            if old_dir != new_dir:
                old_dir.rename(new_dir)

            if new_md_text != md_text:
                if BACKUP:
                    backup_file(post.md_path)
                post.md_path.write_text(new_md_text, encoding="utf-8")
                total_md_updated += 1
                total_replacements += count
        else:
            if VERBOSE and count > 0:
                print("  [預演] 會更新 md 檔內的圖片路徑")

        print()

    if APPLY:
        print("[完成] 已正式套用修改")
        print(f"[完成] 更新 md 檔數量: {total_md_updated}")
        print(f"[完成] 總替換次數: {total_replacements}")
        if BACKUP:
            print("[完成] 原 md 備份副本已建立為 .bak 檔")
    else:
        print("[預演完成] 尚未修改任何檔案")
        print("請先確認結果，沒問題後把 APPLY 改成 True 再執行一次")

if __name__ == "__main__":
    main()
