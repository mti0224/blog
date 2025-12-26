import os
import csv
import re

# --- 設定區 ---
# 使用您上傳的原始檔案名稱
CSV_FILE = 'warmycat.wordpress.com-posts-year-01_01_2023-12_31_2023.csv' 
POSTS_DIR = '_posts' 
# --------------

def load_views_from_csv(file_path):
    views_map = {}
    if not os.path.exists(file_path):
        print(f"找不到 CSV 檔案: {file_path}")
        return views_map

    with open(file_path, mode='r', encoding='utf-8') as f:
        # 由於檔案沒有 Header，我們手動指定欄位名稱
        # 第一欄是標題 (title)，第二欄是次數 (views)
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 2:
                title = row[0].strip()
                views = row[1].strip()
                views_map[title] = views
    return views_map

def update_post_front_matter(file_path, views_map):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 抓取 YAML 中的 title
    title_match = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', content, re.MULTILINE)
    
    if title_match:
        post_title = title_match.group(1).strip()
        
        # 比對標題是否在 CSV 中
        if post_title in views_map:
            views = views_map[post_title]
            
            # 檢查並更新或插入 wp_views
            if 'wp_views:' in content:
                updated_content = re.sub(r'^wp_views:.*$', f'wp_views: {views}', content, flags=re.MULTILINE)
            else:
                # 在 title 欄位下方插入
                updated_content = re.sub(
                    r'(^title:.*?$)', 
                    r'\1\nwp_views: ' + str(views), 
                    content, 
                    flags=re.MULTILINE
                )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            return True, post_title
    return False, None

def main():
    if not os.path.exists(POSTS_DIR):
        print(f"找不到資料夾: {POSTS_DIR}")
        return

    print(f"正在讀取資料: {CSV_FILE}...")
    views_map = load_views_from_csv(CSV_FILE)
    
    if not views_map:
        print("CSV 讀取失敗或格式不正確。")
        return

    success_count = 0
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md') or filename.endswith('.markdown'):
            file_path = os.path.join(POSTS_DIR, filename)
            success, title = update_post_front_matter(file_path, views_map)
            if success:
                print(f"✅ 已更新: {title} ({views_map[title]} 次)")
                success_count += 1

    print(f"\n任務完成！成功更新了 {success_count} 篇文章。")

if __name__ == "__main__":
    main()
