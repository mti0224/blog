import os
import re

# 1. 設定要校正的關鍵字清單
target_headings = [
    "相關影片", "整體資料分析", "裝備配置", "詳細技能資料", 
    "後續進化", "對於目前PvP環境的影響", "結論"
]

# 2. 設定文章目錄 (請根據實際路徑修改，通常是 '_posts')
posts_dir = '_posts'

def fix_markdown_headings(directory):
    if not os.path.exists(directory):
        print(f"找不到目錄: {directory}")
        return

    # 遍歷目錄下所有 .md 檔案
    for filename in os.listdir(directory):
        if filename.endswith(".md"):
            filepath = os.path.join(directory, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            new_lines = []
            changed = False

            for line in lines:
                matched = False
                stripped_line = line.strip()
                
                for heading in target_headings:
                    # 判斷邏輯：如果該行包含關鍵字，且長度較短 (避免誤傷文章內提及關鍵字的長句子)
                    # 同時確認該行是否以 # 開頭或是包含在 ** 內
                    if heading in stripped_line and len(stripped_line) < 35:
                        # 統一替換為標準格式
                        new_lines.append(f"### **{heading}：**\n")
                        matched = True
                        changed = True
                        break
                
                if not matched:
                    new_lines.append(line)

            # 如果內容有變動，才寫回檔案
            if changed:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                print(f"已修正: {filename}")

if __name__ == "__main__":
    print("開始校正文章小標題格式...")
    fix_markdown_headings(posts_dir)
    print("校正完成！")
