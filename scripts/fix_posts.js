// scripts/fix_posts.js  (Node v18+)
const fs = require('fs');
const path = require('path');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true})
    .flatMap(e => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
}

function extractFirstImage(md){
  // 先抓 Markdown 圖片語法
  const m1 = md.match(/!\[[^\]]*\]\(([^)]+?\.(?:png|jpe?g|gif|webp|svg))[^)]*\)/i);
  if (m1) return m1[1];
  // 再抓 HTML <img src="...">
  const m2 = md.match(/<img[^>]+src=["']([^"']+\.(?:png|jpe?g|gif|webp|svg))["']/i);
  return m2 ? m2[1] : null;
}

function ensureFrontMatterHasImage(s, img){
  // 只處理有 YAML front-matter 的
  const fm = /^---\n([\s\S]*?)\n---\n?/;
  const m = s.match(fm);
  if (!m) return s; // 跳過
  if (m[1].match(/^\s*image\s*:/m)) return s; // 已經有 image:

  const inject = m[1] + `\nimage: ${img}\n`;
  return s.replace(fm, `---\n${inject}---\n`);
}

const posts = walk('_posts').filter(f => f.match(/\.(md|markdown)$/i));
let changed = 0;

for (const file of posts){
  let s = fs.readFileSync(file,'utf8');

  // 1) 把 [Image](...) 轉成 ![](...)
  const before = s;
  s = s.replace(/\[Image\]\(([^)]+)\)/gi, '![]($1)');

  // 2) 取第一張圖，寫入 front-matter image:
  const firstImg = extractFirstImage(s);
  if (firstImg){
    s = ensureFrontMatterHasImage(s, firstImg);
  }

  if (s !== before){
    fs.writeFileSync(file, s);
    changed++;
  }
}

console.log('fixed files:', changed);
