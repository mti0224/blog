import os
import re

# 設定文章目錄
POSTS_DIR = '_posts'

# YouTube 連結的正則表達式
yt_regex = r'https://www\.youtube\.com/watch\?v=([a-zA-Z0-9_-]+)'

def convert_links():
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            filepath = os.path.join(POSTS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 將連結替換為 include 標籤
            new_content = re.sub(yt_regex, r'{% include youtube.html id="\1" %}', content)
            
            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"已更新: {filename}")

if __name__ == "__main__":
    convert_links()
