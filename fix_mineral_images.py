import os
import re

# 設定文章目錄
POSTS_DIR = '_posts'

# 比對目標文字以及緊接在後的圖片語法
# 支援文字：下表是為各種減礦時的礦物量(寶物全滿、無月間加成)：
pattern = r'(下表是為各種減礦時的礦物量\(寶物全滿、無月間加成\)：\s*\n+)(!\[\].*?\))'

def update_images():
    count = 0
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            filepath = os.path.join(POSTS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 在圖片代碼後面加上 CSS class 標籤
            # 注意：Jekyll 的 Kramdown 語法需要在元素後方緊跟 {: .classname }
            new_content = re.sub(pattern, r'\1\2{: .mineral-table-img }', content)
            
            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"已處理: {filename}")
                count += 1
    
    print(f"--- 處理完成，共更新了 {count} 篇文章中的圖片 ---")

if __name__ == "__main__":
    update_images()
