// scripts/fix_front_matter.js
const fs = require('fs');
const path = require('path');

const POSTS_DIR = '_posts';

function fixOne(filePath) {
  let txt = fs.readFileSync(filePath, 'utf8');
  // 必須以 --- 起頭才是貼文
  if (!txt.startsWith('---')) return { changed: false, reason: 'no-front-matter-start' };

  const lines = txt.split('\n');

  // 找到 front-matter 的結束行；若找不到，就嘗試把黏在同一行的 --- 拆開
  let end = -1;
  for (let i = 1; i < Math.min(lines.length, 400); i++) {
    if (lines[i].trim() === '---') { end = i; break; }

    const idx = lines[i].indexOf('---');
    if (idx !== -1) {
      // 把 ...xxx---yyy 這種情況，拆成
      // ...xxx
      // ---
      // yyy
      const pre = lines[i].slice(0, idx).replace(/\s+$/, '');
      const post = lines[i].slice(idx + 3).replace(/^\s+/, '');
      lines[i] = pre;
      lines.splice(i + 1, 0, '---');
      if (post) lines.splice(i + 2, 0, post);
      end = i + 1;
      break;
    }
  }

  if (end === -1) return { changed: false, reason: 'no-front-matter-end' };

  // 確保結束分隔線上下都有換行（美化一下）
  // 若結束線下一行不是空行，補一個空行
  if (lines[end + 1] !== '' && typeof lines[end + 1] !== 'undefined') {
    lines.splice(end + 1, 0, '');
  }

  const out = lines.join('\n');
  if (out !== txt) {
    fs.writeFileSync(filePath, out, 'utf8');
    return { changed: true };
  }
  return { changed: false };
}

function walk(dir) {
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && (p.endsWith('.md') || p.endsWith('.html'))) {
      const res = fixOne(p);
      if (res.changed) console.log('[fixed]', p);
      else if (res.reason) console.log('[skip]', p, res.reason);
    }
  }
}

walk(POSTS_DIR);
fix_front_matter.js
